---
title: "Microsoft Foundry guardrails for agentic AI: identity, governance, and cost control (before you go ‘autonomous’)"
date: 2026-02-15
draft: true
tags:
  - azure-ai
  - microsoft-foundry
  - entra-id
  - governance
  - finops
categories:
  - Azure
  - Security
  - FinOps
summary: "Claude Opus 4.6 landing in Microsoft Foundry is a reminder: frontier models are the easy part; enterprise guardrails (identity, data access, audit, and spend) are what make agents shippable."
---

## Why this matters

Microsoft is clearly betting that “agents” are the next abstraction layer: you point them at your business context, give them tools, and they execute multi-step work. The model is rarely the blocker — it’s the blast radius.

With frontier models (like Claude Opus 4.6) showing up inside **Microsoft Foundry**, more teams will try to operationalize agentic workloads in enterprise environments. That’s where the uncomfortable questions start: *Which identity does the agent run as? What data can it see? How do we audit actions? How do we stop a runaway token bill?*

My take: if you can’t answer those four, you don’t have an agent — you have a demo.

## How it works (diagram-in-words)

Think of a production-grade agent in Foundry as a pipeline with checkpoints:

- **User / workload identity** (Entra ID) → determines who is asking / acting
- **Foundry project boundary** → determines where the agent can operate
- **Knowledge layer (Foundry IQ / search / data connections)** → determines what it can read
- **Tools / actions (connectors, APIs, functions, MCP, etc.)** → determines what it can do
- **Telemetry + governance** → determines whether you can prove what happened later
- **Budgets / quotas / rate limits** → determines whether you can afford what happened

Foundry IQ is a good example of the “knowledge checkpoint”: it’s positioned as a managed knowledge layer for agents, built on Azure AI Search, that can respect enterprise permissions (Entra ID-based governance) while providing retrieval + citations.

## Practical steps (what I’d implement this week)

### 1) Treat identity as a first-class architecture decision

Pick one pattern and document it:

- **User-delegated** (agent acts “as the user”)
  - Pros: least surprise, natural per-user authorization
  - Cons: harder auditing, harder automation, tricky with long-running/background jobs

- **Service principal / managed identity** (agent acts as an app)
  - Pros: stable permissions, easier to audit, easier to automate
  - Cons: you must build guardrails or you’ll over-permission it

Rule of thumb: background agents should use managed identity; interactive copilots can use user delegation.

### 2) Create a “least privilege” permission set for your first agent

Start narrow and boring. Example (conceptual):

- Read-only access to the specific data source(s) it needs
- Write access only to a single target system (e.g., one storage container, one repo, one ticketing queue)
- No broad subscription-level roles on day 1

If you’re using Azure resources as tools, it’s usually better to grant:

- **Resource-scoped** roles (resource group or resource)
- **Custom roles** for tight action sets

…instead of handing out Contributor because “we’ll fix it later”.

### 3) Budget for tokens like you budget for egress

Agentic workloads fail in a new way: they can be correct and still bankrupt you.

Concrete things to do:

- Put your Foundry/AI resources in a dedicated subscription or RG with **budgets + alerts**
- Set internal SLOs like “max cost per successful run”
- Use model controls (effort/thinking settings, context compaction, max output) to cap worst-case runs

### 4) Build an audit trail that survives the incident review

Minimum viable audit trail for an agent:

- Prompt + tool calls + tool results (redacted where needed)
- Who/what identity triggered the run
- Which knowledge sources were accessed
- Output artifacts produced (files, tickets, changes)

If you can’t reconstruct “why did the agent do this?” from logs, you don’t have a production system.

### 5) Roll out Foundry IQ knowledge bases for repeatable grounding

If multiple teams are building their own RAG stacks, Foundry IQ’s “knowledge base” abstraction is worth piloting:

- Centralize indexing/chunking/vectorization once
- Reuse grounding across multiple agents
- Keep permissions aligned with Entra ID expectations

The success criteria isn’t “the demo worked” — it’s “we reduced duplicated RAG plumbing without weakening access control”.

## Gotchas / pitfalls

- **Over-permissioned managed identity**: agents amplify mistakes because they execute a lot.
- **No explicit cost boundary**: a single bug can turn into a multi-hour tool loop.
- **RAG permission drift**: if your knowledge layer doesn’t truly respect source permissions, you’ll leak data.
- **Prompt ≠ policy**: “don’t do dangerous actions” is not a control. RBAC, allowlists, and approvals are.
- **Silent tool failures**: agents can hallucinate success if tool errors aren’t handled and logged.

## What I’d do next (checklist)

- [ ] Decide: user-delegated vs managed identity per agent type
- [ ] Create a minimal RBAC/custom-role package for the first agent
- [ ] Put AI resources behind budgets + alerts; define max cost/run
- [ ] Add tool allowlists and explicit approval steps for risky actions
- [ ] Pilot a Foundry IQ knowledge base for one bounded domain (e.g., runbooks)
- [ ] Run a tabletop exercise: “agent changed the wrong thing” — can we trace and contain it?

## Sources

- https://azure.microsoft.com/en-us/blog/claude-opus-4-6-anthropics-powerful-model-for-coding-agents-and-enterprise-workflows-is-now-available-in-microsoft-foundry-on-azure/
- https://azure.microsoft.com/en-us/products/ai-foundry/
- https://ai.azure.com/
- https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/foundry-iq-unlocking-ubiquitous-knowledge-for-agents/4470812
- https://www.anthropic.com/news/claude-opus-4-6
