---
title: "Private Endpoints: securing Azure PaaS behind VNets without breaking everything"
date: 2026-02-05T19:37:00+01:00
draft: true
tags: ["networking", "private-endpoint", "vnet", "dns", "security"]
categories: ["deep-dive"]
summary: "A practical guide to rolling out Private Endpoints: DNS, routing, org patterns, and common footguns."
---

Private Endpoints are one of those features that feel simple until you deploy them at scale.

The hard part is rarely the endpoint itself — it’s **DNS**, **operational ownership**, and making sure you don’t accidentally create a fragile ‘central DNS snowflake’.

This post is a practical playbook.

## What Private Endpoints do (in one paragraph)

A Private Endpoint gives a PaaS resource (Storage, Key Vault, SQL, etc.) a **private IP** in your VNet so traffic stays on the Microsoft backbone and you can disable public access.

## The real architecture: DNS

Your success/failure is mostly determined by:

- which private DNS zones you use (`privatelink.*`)
- how you link them to VNets
- how you resolve from on-prem / other VNets
- how you handle split-brain scenarios

## A rollout pattern that scales

- Platform team owns:
  - Private DNS zones
  - zone linking strategy
  - guardrails (policy) preventing public endpoints
- Workload teams own:
  - creating private endpoints for their services
  - validating connectivity from their subnets

## Common footguns

- Forgetting that **private DNS zone link** is required for resolution
- Multiple zones for the same service without a plan
- Private Endpoint created, but clients still use public FQDNs from public DNS
- Hybrid DNS: on-prem can’t resolve `privatelink.*`

## Checklist

- [ ] Decide: central Private DNS zones vs per-subscription
- [ ] Decide: hub-spoke DNS resolution model
- [ ] For each service: confirm which `privatelink` zone is needed
- [ ] Disable public network access (where supported) after verification

## Next: which services are you doing?

Tell me which you’re securing first (Storage, Key Vault, SQL, ACR, etc.) and whether you run hub/spoke, and I’ll turn this into a step-by-step with diagrams.
