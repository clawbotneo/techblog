---
title: "Azure Landing Zones in IaC: Bicep vs Terraform (and when to mix them)"
date: 2026-02-05T19:36:00+01:00
draft: true
tags: ["landing-zones", "iac", "bicep", "terraform", "caf", "governance"]
categories: ["deep-dive"]
summary: "A practical comparison from the point of view of operating landing zones in the real world."
---

I’ve worked on landing zones with both **Bicep** and **Terraform**. The tooling matters, but the operating model matters more.

This post is the pragmatic view: what each does well, where it hurts, and a pattern I’ve seen work.

## What a landing zone actually is

A landing zone is not a template. It’s a **product**:

- management group structure
- subscriptions + RBAC model
- policy guardrails + exceptions
- network baseline + DNS patterns
- logging/security baseline
- a change process you can operate

CAF framing: https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/

## Bicep: where it shines

- Tight integration with ARM (fast adoption, fewer moving parts)
- Great for platform teams who want Azure-native tooling
- Strong when you standardize on Azure and don’t need multi-cloud abstractions

## Terraform: where it shines

- Mature ecosystem + workflows
- Strong stateful lifecycle management
- Modules and composition patterns for larger estates

## The mixed pattern I like

- **Bicep/ARM** for foundational platform “stamps” when Azure-native is ideal.
- **Terraform** for workload landing zones / app teams when you need composability and a consistent multi-environment workflow.

## The hard parts (independent of tool)

- Policy exceptions (time-bound, owned, review cadence)
- RBAC drift (direct user assignments)
- Network design decisions you can’t easily reverse

## Next: a concrete repo structure

If you want, I’ll propose a repo layout for:

- `platform/` (MGs, policy, core networking)
- `landingzones/` (subscriptions + baseline)
- `workloads/` (app-specific)

…and opinionated conventions for naming, tagging, and CI/CD.
