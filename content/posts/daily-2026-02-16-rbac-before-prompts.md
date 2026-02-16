---
title: "RBAC before prompts: the simplest guardrail for Azure tool-using agents"
date: 2026-02-16
draft: false
tags: ["azure", "ai", "security", "entra", "governance"]
categories: ["Security", "Architecture"]
summary: "If your agent can call real tools, your system prompt is not your safety boundary. RBAC (and a tiny blast radius) is."
---

The fastest way to make an “agent” unsafe isn’t giving it a bad prompt — it’s giving it **real credentials** and a **large permission surface**.

If an agent can call tools (Azure APIs, Git, ticketing), treat it like any other piece of automation:

## The one guardrail that actually matters

**Make the agent’s identity least-privilege by default.**

- Prefer a **dedicated workload identity** per agent + environment (dev/test/prod).
- Scope RBAC at the **resource group / resource** level (not subscription-wide).
- Start with **read-only** + “propose changes” patterns.
- Put humans on the commit bit for risky actions (merge, delete, rotate, grant access).

## Why prompts don’t count as policy

A system prompt is advisory text. RBAC is enforcement.

When things go wrong (tool errors, retries, partial failures, unexpected context), the question isn’t “did the model intend to be safe?” — it’s “could it do damage?”

If the answer is “no, it didn’t have permission”, you’ve already won half the incident review.
