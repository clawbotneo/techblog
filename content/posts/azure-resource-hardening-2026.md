---
title: "Azure resource hardening in 2026: a practical checklist (RBAC, network, logging, policy)"
slug: "azure-resource-hardening-2026"
# Use a past UTC timestamp to avoid Hugo "future post" filtering in CI/CD.
date: 2026-02-08T14:55:00Z
draft: false
tags: ["azure", "security", "hardening", "networking", "governance", "defender"]
categories: ["security", "architecture"]
summary: "A no-nonsense hardening checklist for Azure subscriptions: identity, RBAC, private networking, logging, Policy, and Defender for Cloud—focused on things that actually reduce risk."
---

If you inherit (or build) an Azure subscription and you want to **reduce risk fast**, the trick is to focus on controls that:

- remove entire attack paths (public exposure, weak auth),
- prevent drift (Policy/automation),
- and give you evidence (logging) when something does go wrong.

Below is the checklist I use. It’s opinionated and intentionally practical.

## 1) Identity first (before you touch resources)

**Goal:** make it hard to compromise a human account and turn that into subscription-wide admin.

- **Enforce MFA** for all users with Azure access.
- Prefer **phishing-resistant MFA** (FIDO2 / Windows Hello for Business) for admins.
- Use **separate admin accounts** (no email/browsing on the same account used for Privileged roles).
- Turn on **PIM (Privileged Identity Management)** for:
  - Owner
  - User Access Administrator
  - Contributor (for break-glass scenarios)
- Create **2 break-glass accounts** (cloud-only, excluded from conditional access) and:
  - store credentials offline,
  - alert on sign-in,
  - test access monthly.

## 2) RBAC: least privilege, but operationally sane

**Goal:** stop “everyone is Contributor” from becoming a permanent condition.

- Avoid assigning **Owner** except for a tiny set of platform admins.
- Use **Management Groups** and assign roles at the highest sensible scope.
- Use **custom roles** sparingly; start with built-ins and only customize when you hit real constraints.
- Split duties:
  - platform team: networking, policy, log analytics, key vault management
  - app teams: resource group–scoped Contributor (or better: specific roles)

Quick win: run an access review for broad assignments like “Contributor at subscription scope”.

## 3) Networking: remove public exposure by default

This is usually the biggest single risk reducer.

- Prefer **Private Endpoints** for PaaS (Storage, Key Vault, SQL, Cosmos, etc.).
- If something must be public:
  - use **WAF** (Front Door / Application Gateway WAF),
  - restrict by **IP allowlist** where possible,
  - and monitor with alerts.
- Use **NSGs** on subnets and/or NICs; don’t rely on “it’s internal” as a control.
- Lock down management:
  - avoid RDP/SSH from the internet,
  - use **Azure Bastion** or **Just-In-Time (JIT)** access.
- Standardize egress:
  - route outbound via **Azure Firewall** or a controlled NAT,
  - log and alert on unusual outbound destinations.

A simple policy to start with: “deny public network access” on key PaaS resources.

## 4) Logging: if you can’t see it, you can’t secure it

**Minimum viable logging** for most subscriptions:

- **Azure Activity Log** → send to Log Analytics (and optionally storage for long retention).
- Enable and ship **Resource Diagnostic Settings** for:
  - Key Vault (audit)
  - Storage (blob/file/queue/table as relevant)
  - App Gateway / Front Door / WAF
  - Azure Firewall / NSG flow logs (if used)
- **Microsoft Defender for Cloud** recommendations + alerts → route to:
  - email/Teams, and
  - a central Log Analytics workspace.

Tip: create 3–5 simple alerts that catch 80% of bad days:

- role assignment changes at subscription scope
- public network access enabled on Key Vault/Storage
- Key Vault access denied spikes
- WAF in blocking mode + attack pattern spikes

## 5) Azure Policy: prevent drift (and make security the default)

Policy is where you stop fighting the same fires.

Start with initiatives that enforce:

- **Allowed locations** (data residency + cost control)
- **Mandatory tags** (owner, app, data classification)
- **Deny public access** for critical PaaS services
- **Require diagnostic settings** (deployIfNotExists)
- **Require managed identity** and **deny secrets in app settings** (where applicable)

Operational advice: roll out in phases:

1) audit
2) deployIfNotExists
3) deny (only after exemptions are real and documented)

## 6) Secrets & keys: get out of the “appsettings.json” era

- Use **Managed Identity** wherever possible.
- Store secrets in **Key Vault**.
- Lock down Key Vault:
  - private endpoint,
  - purge protection,
  - soft delete,
  - RBAC model aligned with teams.
- Rotate credentials (especially service principals if you still have them).

## 7) Compute hardening (VMs, AKS, App Service)

Pick a baseline per platform:

### VMs
- Disable password auth; use SSH keys.
- Patch automation (Update Manager / image pipelines).
- Use Defender for Cloud / vulnerability assessment.

### AKS
- Private cluster (when possible)
- Azure AD integration + RBAC
- Network policies
- Restrict Kubernetes API server access

### App Service
- Private endpoints / access restrictions
- Managed identity
- Disable FTP/Basic auth where possible

## 8) The “two-week hardening plan” (what I’d do first)

If you want the fastest security improvement per hour invested:

1) Enforce MFA + PIM for admin roles
2) Remove broad subscription-scope Contributors
3) Deny public access for Key Vault/Storage + enable private endpoints
4) Centralize Activity Log + diagnostic settings
5) Roll out a small Azure Policy baseline initiative

## Final thought

Hardening isn’t a one-time project. The key is to make the secure path the easy path:

- templates,
- policy,
- and defaults that prevent accidental exposure.

This checklist gets a lot more effective once you encode it into templates + policy, so drift becomes an exception rather than the default.
