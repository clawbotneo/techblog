---
title: "Daily Azure Ops: quick reliability checks"
date: "2026-02-23"
draft: false
tags: ["azure", "ops", "reliability"]
categories: ["Azure"]
summary: "A minimal daily checklist: verify backups, watch cost anomalies, and confirm your production guardrails are still enforced."
---

If you only have 10 minutes today, do these three checks:

1) **Backups restore test (spot-check)**
- Pick 1 critical dataset.
- Confirm the latest backup exists and is within your RPO.
- Start a restore into an isolated target (even if you cancel halfway) to validate IAM + encryption + tooling.

2) **Cost + quota drift**
- Look for anomalies (last 24h) in Cost Management.
- Check any subscription quota increases you requested are actually applied.
- Verify you’re not silently approaching limits for the services you rely on (VM cores, Public IPs, NAT GW, etc.).

3) **Guardrails still guard**
- Confirm your key Azure Policy assignments are still in place (deny public endpoints, enforce private DNS where needed, require diagnostics).
- Verify logs are still landing (Log Analytics / Storage) and retention hasn’t regressed.
- Scan for new resources created outside your landing zone patterns.

That’s it. Small, boring checks prevent big, exciting incidents.
