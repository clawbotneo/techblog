---
title: "Azure Policy in 2026: deny public endpoints without breaking deployments (Private Link + IaC patterns)"
date: 2026-02-11T09:45:00+01:00
draft: false
tags: ["azure", "security", "governance", "policy", "private-link", "terraform", "bicep", "devops"]
categories: ["security", "architecture", "devops"]
summary: "‘Deny public network access’ sounds simple—until you turn it on and your pipelines start failing. Here’s a rollout pattern that keeps engineers moving while you close the biggest data-exposure paths." 
---

Azure engineers eventually hit this moment:

You’ve got the mandate—**no public endpoints**—and the easy button seems to be:

- set *Public network access* = **Disabled**
- require **Private Link**
- enforce with **Azure Policy (Deny)**

Then you flip the switch… and half your deployments break.

This post is a practical way to get to “no public endpoints” **without turning governance into a productivity-killer**.

## 1) Start with the threat model (what you’re actually preventing)

“Public endpoint” is often shorthand for a few different failure modes:

- **Data services reachable from the internet** (Storage, Key Vault, SQL, Cosmos)
- **Accidental exposure via default networking** (new resource, default = public)
- **Egress paths that bypass enterprise controls** (developers working around with ad-hoc exceptions)

Private Link isn’t just about inbound. It’s about making the network path **explicit** and governable.

## 2) The rollout pattern that works in real orgs

### Phase 0 — Measure before you deny

Before Deny:

- Audit current state with built-ins (Policy) and/or Resource Graph
- Identify the top offenders by **risk × blast radius**

Two quick Resource Graph queries that pay off:

```kusto
resources
| where type =~ 'microsoft.storage/storageaccounts'
| project name, id, resourceGroup, subscriptionId, publicNetworkAccess = tostring(properties.publicNetworkAccess)
| summarize count() by publicNetworkAccess
```

```kusto
resources
| where type =~ 'microsoft.keyvault/vaults'
| project name, id, resourceGroup, subscriptionId, publicNetworkAccess = tostring(properties.publicNetworkAccess)
| summarize count() by publicNetworkAccess
```

You’ll usually discover: lots of legacy defaults, and a handful of “special” workloads that truly need exceptions.

### Phase 1 — DeployIfNotExists first (guardrails that help)

Use Policy to *push you toward compliance*:

- **DeployIfNotExists** to add diagnostics
- **Append/Modify** for safe defaults (where supported)
- **Audit** for publicNetworkAccess enabled

This is the phase where you fix your IaC modules so the secure config is the default.

### Phase 2 — Make Private Endpoint + DNS a standard module

Most “Private Link broke my app” incidents are not about Private Link.

They’re DNS.

Your platform module should bundle:

- the **Private Endpoint**
- the **Private DNS zone group** link
- the **VNet link** for the zones
- (optionally) **Private DNS Resolver** if you need cross-prem / complex DNS flows

If engineers have to “remember the DNS pieces” per service, you’ll never scale.

### Phase 3 — Deny, but only when you can prove a paved road exists

Only then: turn on Deny.

But do it per service and per scope:

- management group → subscription → landing zone
- start with **new deployments only** (new resource types / new subscriptions)
- add **exemptions** for the handful of justified legacy cases

## 3) The common failure: Deny collides with pipeline reality

The biggest practical issue is that Deny turns into:

- “my Terraform plan fails”
- “my Bicep deployment errors”
- “my app can’t reach Storage anymore”

What you want instead:

- pipelines that fail **early** with a clear message
- modules that are secure-by-default
- exceptions that are explicit, time-bounded, and reviewable

### Make policy failure developer-friendly

Do two things:

1) Standardize the Policy assignment display name / description so it tells the engineer what to do.
2) Put a link to your internal runbook in the policy assignment metadata (or your docs site).

Example (human-friendly guidance):

- “Public endpoints are blocked. Use module `private_endpoint` and link zone `privatelink.blob.core.windows.net`.”

## 4) IaC patterns (Terraform + Bicep) that reduce pain

### Pattern A — Terraform: one module owns the networking contract

A good module interface:

- inputs: subnet id, dns zone ids (or a `dns` object), resource settings
- outputs: private endpoint id, NIC id, FQDN(s) if relevant

Engineers shouldn’t need to know the service-specific DNS zone names.

### Pattern B — Bicep: keep "publicNetworkAccess" explicit

Don’t leave defaults.

Even if you’re not enforcing Deny yet, set:

- `publicNetworkAccess: 'Disabled'` (where supported)
- `networkAcls.defaultAction: 'Deny'` (for services that still use ACLs)

And only then add explicit allow rules if truly needed.

### Pattern C — Exceptions are code, not tribal knowledge

If a workload needs a public endpoint for a real reason:

- use **Policy exemptions** with an owner + expiry
- track them in code (Terraform/Bicep) and PR-review them

This is where governance becomes an engineering artifact.

## 5) FinOps angle: Private Link has a cost profile

Private endpoints aren’t free:

- Private Endpoint hourly
- data processing (varies)
- Private DNS / Resolver components if you go that route

But the cost isn’t the real issue.

The real FinOps win is **reducing accidental spend caused by insecure defaults** (shadow resources, workaround architectures, duplicated gateways) and making network paths predictable.

## 6) A simple checklist for “Deny public endpoints” readiness

Before you flip Deny at scale:

- [ ] IaC modules create Private Endpoint + DNS correctly by default
- [ ] You have a standard subnet strategy (and IP capacity) for private endpoints
- [ ] You can answer: “how does DNS resolve from every place we run workloads?”
- [ ] You have a documented exception process with expiry
- [ ] Your monitoring catches broken name resolution quickly

---

If you want one thing to take away:

**Policy should codify a paved road, not replace one.**
