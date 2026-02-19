---
title: "Daily note: Managed Identity smoke test — prove it works before you need it"
date: 2026-02-19T13:50:35+0100
draft: false
tags: ["azure", "identity", "managed-identity", "security", "daily"]
categories: ["practical", "ops"]
summary: "A 3-step, 2-minute managed identity smoke test (IMDS → token → real API call) that catches the most common breakages early."
---

Managed Identities are one of those things that feel “set and forget” — until a deployment day when your app can’t get a token and everything cascades.

Here’s a quick **smoke test** you can run on any Azure VM / App Service / Function / Container that has a managed identity.

## The 2-minute smoke test

### 1) Confirm the platform identity endpoint is reachable (IMDS)
On a VM (or anything that exposes IMDS), verify you can reach the metadata endpoint:

```bash
curl -s -H "Metadata: true" "http://169.254.169.254/metadata/instance?api-version=2021-02-01" | head
```

If this times out, you’re not in “identity debugging” anymore — you’re in “platform/network” territory.

### 2) Request a token for a real resource
Pick the resource you actually use (examples):

- Azure Resource Manager: `https://management.azure.com/`
- Key Vault: `https://vault.azure.net`

```bash
curl -s -H "Metadata: true" \
  "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fmanagement.azure.com%2F" \
  | sed -n '1,20p'
```

Look for an `access_token` and a sensible `expires_on`.

### 3) Use the token to call the API you depend on
Example: list resource groups (requires Reader at subscription scope):

```bash
TOKEN=$(curl -s -H "Metadata: true" \
  "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fmanagement.azure.com%2F" \
  | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

SUB="<subscription-id>"
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://management.azure.com/subscriptions/$SUB/resourcegroups?api-version=2021-04-01" \
  | head
```

If step 2 works but step 3 returns 403, you likely have **RBAC scope/role** wrong (or you’re using the wrong identity).

## Common failure modes (what usually breaks)

- **Wrong identity**: system-assigned vs user-assigned confusion (or the app picks the wrong client id).
- **RBAC not applied yet**: role assignment propagation delay after infra changes.
- **Network egress restrictions**: your workload can reach IMDS but can’t reach the target API endpoint.
- **Token for the wrong audience**: using `management.azure.com` token to call Key Vault, etc.

## Make it a habit

If you’re running production workloads, bake this into your runbooks:

- after enabling a managed identity
- after changing RBAC
- after tightening egress
- after moving workloads across subnets/VNET integration

It’s cheap insurance.
