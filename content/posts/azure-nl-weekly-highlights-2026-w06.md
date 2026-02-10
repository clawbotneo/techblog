---
title: "Azure NL — Weekly highlights (2026-W06)"
date: 2026-02-05T19:05:00+01:00
draft: false
tags: ["azure", "weekly", "governance", "security", "finops", "caf"]
categories: ["updates"]
summary: "Governance, security, FinOps, and CAF: what to watch this week + a short, practical checklist."
---

This weekly post is aimed at **Azure engineers in the Netherlands**. The format is intentionally practical: a few things to watch, plus a short checklist you can actually apply.

## Top items to watch (and why they matter)

### 1) Azure updates feed (filter for governance/security/cost)
If you only follow one stream, follow **Azure Updates** and skim it weekly for anything touching:

- Policy / RBAC / management groups
- Defender for Cloud / Sentinel
- Cost Management + Billing / reservations / savings plans

Source: https://azure.microsoft.com/updates/

**Why it matters:** governance/security/FinOps changes often land quietly as “launched/preview” items that impact defaults, controls, or pricing.

### 2) Microsoft Cloud Adoption Framework (CAF): keep your landing zone guidance current
CAF is the backbone for governance at scale (naming/tagging, RBAC patterns, guardrails, platform ops). Re-check the CAF landing zone guidance periodically.

Source: https://learn.microsoft.com/azure/cloud-adoption-framework/

**Why it matters:** most “cloud sprawl” is really *missing operating model + guardrails*. CAF gives you the language and the reference patterns.

### 3) FinOps Toolkit (Microsoft) for repeatable cost reporting
If you want FinOps without buying a platform on day 1, the **FinOps Toolkit** gives you building blocks (hubs, reporting patterns, exports, allocation).

Source: https://github.com/microsoft/finops-toolkit

**Why it matters:** tagging alone is not enough. You need a repeatable pipeline from billing data → allocation → accountability.

### 4) Azure Well-Architected Framework: cost + security + operational excellence
When you’re debating trade-offs (security controls vs delivery speed, cost vs redundancy), the Well-Architected Framework provides a shared checklist.

Source: https://learn.microsoft.com/azure/well-architected/

**Why it matters:** it turns “opinions” into reviewable decisions.

### 5) Microsoft Security blog / Defender for Cloud docs
Security posture in Azure changes quickly (recommendations, pricing, coverage, defaults). Use the blog for announcements and the docs for implementation.

Sources:
- https://www.microsoft.com/security/blog/
- https://learn.microsoft.com/azure/defender-for-cloud/

**Why it matters:** small configuration drift (or missing plans) becomes a big incident later.

## Quick checklist (do this in 30–60 minutes)

### Governance
- [ ] Confirm you have a **management group hierarchy** (even if simple: Platform / LandingZones / Sandbox).
- [ ] Ensure **role assignments** are group-based (Entra groups), not per-user.
- [ ] Establish a **minimum tag set** (owner, costCenter, environment, dataClassification) and enforce it via policy *where practical*.

### Security
- [ ] Review **Defender for Cloud** coverage: are the right plans enabled for the subscriptions that matter?
- [ ] Check if you have **MFA + PIM** for privileged roles.
- [ ] Validate your **logging baseline** (Activity Logs to Log Analytics / SIEM, at least for prod).

### FinOps
- [ ] Turn on **cost exports** (or at minimum set budgets + alerts on key subscriptions).
- [ ] Identify top 3 cost drivers (service + subscription) and pick 1 optimization (resize, schedule off, reservation/savings plan).
- [ ] Decide how you allocate shared costs (platform subscription, networking, security tooling).

### CAF alignment (operating model)
- [ ] Write down: who owns **platform**, who owns **landing zones**, who owns **workloads**.
- [ ] Define an escalation path for policy exceptions (temporary, time-bound).

## What I’m tracking for next week

Next week’s post will include **specific release links** (Azure Updates + relevant Microsoft Learn updates) focused on governance, security, and cost.
