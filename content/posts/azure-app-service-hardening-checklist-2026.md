---
title: "Azure App Service hardening checklist (2026): a practical baseline"
slug: "azure-app-service-hardening-checklist-2026"
date: 2026-02-09T08:00:00Z
draft: false
tags: ["azure", "app-service", "security", "hardening", "operations"]
categories: ["azure", "security"]
summary: "A pragmatic, Azure-native hardening checklist for App Service (Web Apps) you can apply in an hour: identity, networking, TLS, logging, backups, and safe deployment." 
---

This blog is Azure-only, so here’s a **practical** hardening baseline for **Azure App Service (Linux/Windows Web Apps)**. It’s not theoretical—these are the controls that most often prevent the “why did we get popped / why did we lose data / why can’t we investigate” incidents.

## 0) Know what you’re protecting
Before changing anything, capture:

- **App name(s)**, environment (dev/test/prod)
- **Inbound exposure**: public internet vs internal-only
- **Auth model**: Entra ID, custom auth, API keys
- **Data**: where state lives (Storage, SQL, Cosmos, Redis, etc.)
- **Secrets**: Key Vault vs App Settings

If the app is stateful on local disk, treat that as a risk: App Service instances move.

## 1) Identity and access (least privilege)
### Use Managed Identity
- Enable **System-assigned managed identity** on the Web App.
- Prefer MI over secrets for:
  - Key Vault access
  - Storage access
  - Azure SQL / Cosmos where applicable

### Lock down who can change the app
- Use Azure RBAC with separate roles for:
  - deploy (CI/CD)
  - operations
  - read-only
- Require MFA + Conditional Access for portal access.

## 2) Secrets: Key Vault first
- Put secrets (API keys, connection strings) in **Azure Key Vault**.
- Use **Key Vault references** in App Settings where possible.
- Rotate anything long-lived.

Minimum: if you must keep a secret in App Settings, ensure:
- it’s not in your repo
- it’s not in build logs
- access to App Settings is restricted via RBAC

## 3) Network exposure: reduce the blast radius
### If public exposure is not required
- Put the app behind **Private Endpoint** (App Service Private Link).
- Use internal DNS resolution (Private DNS Zone).

### If the app must be public
- Front it with **Azure Front Door** or **Application Gateway (WAF)**.
- Restrict direct access with **Access Restrictions** (IP allowlist) where feasible.
- Disable legacy/unused inbound paths.

### Outbound control (often missed)
- Use **VNet integration** for predictable egress.
- If you need strict egress control, route through an Azure Firewall/NVA.

## 4) TLS and transport security
- Enforce **HTTPS only**.
- Ensure modern TLS (platform-managed; verify your front door / gateway policies too).
- Set correct **HSTS** at the edge (Front Door/WAF) if you control it.

## 5) App Service platform security settings
In App Service Configuration:
- **Always On** enabled for production (stability, avoids cold-start surprises)
- Disable **FTP/FTPS basic auth** if you don’t need it
- Disable **remote debugging** in prod
- Consider **HTTP/2** where it helps (performance)

If you use deployment slots:
- keep secrets in **slot settings** where appropriate
- require swap approvals for prod

## 6) Observability you’ll actually use
### Logs
- Enable **App Service logs** (application + web server) with retention.
- Send to **Log Analytics** (recommended) for queryability.

### Metrics and alerts
Set alerts for:
- 5xx rate
- high response time
- CPU/memory (plan-level)
- restarts / health check failures

### App Insights
- Enable **Application Insights**.
- Capture dependencies and failures.
- Add a simple **correlation id** header if you have multiple services.

## 7) Backups and disaster recovery
- Configure **App Service backups** only for what App Service can back up (content + config). Don’t treat it as full DR.
- Ensure your **real state** has its own backup policy:
  - Azure SQL automated backups + PITR
  - Storage soft delete / versioning
  - Cosmos backups where required

Write down recovery steps. Test them.

## 8) Deployment safety
- Use CI/CD (GitHub Actions/Azure DevOps) with:
  - build once, deploy immutably
  - approvals for prod
  - automatic rollback strategy (slot swap is the simplest)
- Add **health checks** and fail swaps if unhealthy.

## 9) Quick “one-hour” hardening checklist
If you do nothing else, do these:

1. Enable **Managed Identity**
2. Move secrets to **Key Vault** (or at least restrict RBAC)
3. Put a **WAF** in front (Front Door/App Gateway)
4. Turn on **App Insights** + Log Analytics
5. Add alerts for **5xx** and **latency**
6. Ensure your backing data stores have real backups

## Final
App Service is a great PaaS, but the defaults are not a security posture. The win is making the “secure path” the easy path: Managed Identity, Key Vault, a WAF at the edge, logging you actually look at, and deployments that fail safely.
