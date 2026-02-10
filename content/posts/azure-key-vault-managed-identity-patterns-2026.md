---
title: "Azure Key Vault + Managed Identity patterns (2026): stop shipping secrets"
slug: "azure-key-vault-managed-identity-patterns-2026"
date: 2026-02-09T07:50:00Z
draft: false
tags: ["azure", "key-vault", "managed-identity", "security", "app-service", "aks", "functions"]
categories: ["security", "architecture"]
summary: "Practical patterns for using Managed Identity with Azure Key Vault across App Service, Functions and AKS—plus the gotchas (RBAC vs access policies, private endpoints, rotations, and troubleshooting)."
---

If you’re still distributing secrets via pipeline variables, `.env` files, or “just one app setting”, you’re paying a permanent tax: leaks, rotations that break prod, and unclear blast radius.

In Azure, the clean baseline is:

- **Managed Identity (MI)** for workloads
- **Azure Key Vault** for secrets/keys/certs
- **RBAC** for authorization
- **Private networking** when the app shouldn’t be internet-reachable

Below are the patterns I use most, and the gotchas that keep biting teams.

## 1) Choose a pattern: MI-first, secrets only when unavoidable

### Pattern A — MI to Key Vault (recommended)
Use MI to fetch secrets at runtime.

Best for:
- apps that need a small set of secrets (3rd-party API keys, webhook secrets)
- services that can tolerate retrieving secrets at startup and refreshing periodically

### Pattern B — MI to downstream service (even better)
Avoid Key Vault reads entirely by using MI directly to the service:
- Storage: role assignments (Blob Data Reader/Contributor)
- Azure SQL: Entra auth (where applicable)
- Cosmos: RBAC + MI (where applicable)

Use Key Vault only for *true secrets* that cannot be replaced by identity.

## 2) Key Vault auth model: RBAC vs Access Policies
In 2026, prefer **Azure RBAC** for Key Vault authorization.

Why:
- consistent with the rest of Azure
- supports PIM and standard access reviews
- avoids “mystery access policies” drift

**Gotcha:** don’t mix RBAC and access policies in a way that confuses operators. Pick one model per vault and document it.

## 3) Minimal RBAC roles you’ll actually use
For workloads pulling secrets:

- `Key Vault Secrets User` (read secrets)

For operators managing secrets:

- `Key Vault Secrets Officer` (manage secrets)

For break-glass/platform:

- `Key Vault Administrator`

Keep assignments scoped (RG/vault) and time-bound (PIM) for humans.

## 4) App Service: the “no code change” baseline

### Step 1 — enable Managed Identity
App Service → **Identity** → System assigned → On

### Step 2 — grant MI access to Key Vault
Key Vault → Access control (IAM) → Add role assignment:
- Role: `Key Vault Secrets User`
- Assign access to: Managed identity
- Select: your web app

### Step 3 — use a Key Vault reference (simple)
In App Service Configuration → Application settings:

- `MY_SECRET = @Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/<name>/<version>)`

This avoids writing code to call Key Vault.

**Gotchas:**
- references fail if the app can’t reach Key Vault (private endpoint / DNS)
- references fail if RBAC isn’t correct
- version pinning vs versionless URIs: choose based on rotation strategy

## 5) AKS: use Workload Identity (not node managed identity hacks)
For AKS, use **Azure AD Workload Identity** and map a Kubernetes service account to an Azure identity that has Key Vault access.

Benefits:
- clean separation per namespace/workload
- easy to audit
- avoids over-privileging node identity

If you’re still using AAD Pod Identity, treat it as legacy and plan migration.

## 6) Private endpoints: the most common outage cause
Teams enable Key Vault Private Endpoint (good!) and then apps start failing (also common).

Checklist:
- Private endpoint created
- Private DNS zone `privatelink.vaultcore.azure.net` linked to the VNet
- Correct DNS resolution from the workload
- App has VNet integration (for App Service)

If DNS resolves to the public IP, your vault will look “down” from the app.

## 7) Rotation: don’t rotate in a way that forces redeploys
Rotation strategy choices:

- **Versionless secret URI** (recommended for many apps): app always fetches latest
  - pair with caching + refresh schedule
- **Pinned version**: safer for controlled rollouts, but requires updates
  - use when changing secret format/compatibility

For App Service Key Vault references:
- plan for how changes propagate (and whether a restart is needed)

## 8) Troubleshooting fast
When “Key Vault access denied” happens, check in this order:

1. Does the workload identity exist and is it enabled? (MI on?)
2. Is the correct role assigned at the **vault** scope?
3. Is network blocking it? (Private endpoint / firewall)
4. Are you using the correct URI (secret name/version)?
5. Look at Key Vault **Diagnostic logs** (enable them!)

## Final: the practical target state
A good Azure baseline looks like:

- humans: PIM + RBAC + audited access
- workloads: MI everywhere
- secrets: Key Vault (private where appropriate)
- fewer app settings, fewer pipeline secrets

If you still have to ship secrets, treat it as technical debt with interest: it’s not “one more variable”, it’s a leak surface and an operational burden.
