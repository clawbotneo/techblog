---
title: "Claude Opus 4.6 in Microsoft Foundry: governance-first patterns for enterprise coding agents"
date: 2026-02-09T08:00:00+01:00
draft: true
tags: ["azure", "ai", "security", "governance", "finops", "entra", "platform-engineering"]
categories: ["security", "architecture", "finops"]
summary: "Claude Opus 4.6 is now available in Microsoft Foundry. Here’s how I’d approach rolling it out for coding/ops agents in a way that doesn’t blow up your security model or your token bill."
---

Claude Opus 4.6 is now available in **Microsoft Foundry** (Azure-hosted), positioned as a strong model for **coding**, **agents**, and long-running workflows. That’s cool — but the interesting part for Azure/Entra/security folks isn’t “new model dropped”.

The interesting part is this: once you let an agent touch real systems (repos, tickets, subscriptions, logs), your failure modes move from “bad completion” to “bad change”. You need **governance-by-default**, not “we’ll bolt it on later.”

Also: agentic workflows can quietly become a **FinOps problem**. One enthusiastic team + long context windows + unattended retries = surprise invoice.

## 1) Why this matters

If you’re already experimenting with coding assistants, Opus 4.6 in Foundry is basically an invitation to take the next step: **tool-using agents** that plan, call APIs, and keep going for a while.

But enterprise reality hits fast:

- **Identity:** what identity does the agent run as, and what can it do?
- **Data:** what corp data is it allowed to retrieve, and how is that enforced?
- **Network:** are you about to create a new “public SaaS exception” path?
- **Audit:** can you explain *why* the agent changed something?
- **Cost:** can you cap spend per project/team/environment?

Foundry’s pitch is that you can bring “frontier” models into an Azure-ish control plane (projects, governance, security posture) instead of stitching everything together yourself. Microsoft also frames **Foundry IQ** as a unified knowledge layer (preview) to avoid every team rebuilding bespoke RAG pipelines.

## 2) How it works (diagram-in-words)

A typical “enterprise coding agent” setup in Foundry looks like:

- Developer or CI job triggers an agent (chat, PR comment, scheduled run)
- Agent calls a **model endpoint** in Microsoft Foundry (Opus 4.6)
- Agent uses **tools** (your code):
  - Git provider API (read/write PRs)
  - Work tracking (ADO/Jira)
  - Azure APIs (read logs, open incidents, create resources)
- Agent pulls context from knowledge sources:
  - docs, runbooks, past incidents
  - optionally via **Foundry IQ knowledge bases** (preview) for retrieval + citations
- Guardrails wrap the whole thing:
  - authn/z (Entra), least privilege, approvals
  - logging/audit
  - budget + rate limits

The model is the easy piece. The glue is where you win or lose.

## 3) Practical steps (what I’d actually do)

### Step 0 — Decide the blast radius

Pick one:

- **Read-only agent** (safe default): can read repos/tickets/logs, but can’t merge/close/modify.
- **Propose-only agent**: can open PRs and drafts, but humans approve merges.
- **Limited-change agent**: can execute narrow, pre-approved ops actions (e.g., “rotate Key Vault secret”, “open a PIM activation request”, “restart a deployment”).

If you can’t describe the blast radius in one paragraph, you’re not ready to productionize it.

### Step 1 — Treat the agent as an application identity (Entra)

- Use a **dedicated workload identity** per environment (dev/test/prod) and per major agent.
- Prefer **managed identity** where applicable; otherwise use an app registration with tight creds hygiene.
- Assign RBAC using least privilege:
  - avoid subscription-wide access
  - avoid Owner/User Access Administrator

If you want the agent to touch Azure, constrain it like any other automation account.

### Step 2 — Put a “human checkpoint” in the workflow

For anything that changes state:

- require a **PR approval** (code)
- require an **ITSM approval** (change)
- require a **PIM activation** step for privileged actions

In other words: let the agent do the boring work, but keep humans as the “commit bit” for risky operations.

### Step 3 — Make retrieval permissions a first-class design constraint

If you’re pulling internal content into agent context, the question is not “can it retrieve?” but:

- **whose permissions** are enforced?
- is access **document-level**, or “index-level”?
- can you show citations back to operators?

Microsoft’s Foundry IQ framing is that knowledge bases respect existing permissions models and can apply governance through Entra ID-based controls (preview). If you can’t keep permission boundaries, don’t centralize the knowledge base yet.

### Step 4 — Cost controls (FinOps) before scale

Agentic usage patterns are spiky and easy to hide in shared spend.

What I’d set up on day 1:

- budgets/alerts per subscription/resource group used for the agent platform
- per-project quotas / rate limits (where the platform supports it)
- a “max tokens per run” convention in your agent harness
- logging that includes:
  - project/team
  - environment
  - model
  - tokens in/out
  - tool calls count

If you can’t attribute cost, you can’t govern it.

### Step 5 — A minimal “agent harness” pattern (pseudo-code)

Keep the agent brain separate from permissions and tools:

```python
# PSEUDO-CODE: keep it boring
ctx = {
  "project": "platform-dev",
  "env": "dev",
  "budget": {"max_tokens": 200_000, "max_tool_calls": 40},
  "identity": "mi://agent-platform-dev"
}

tools = [
  GitTool(read=True, write_pr=True, merge=False),
  AzureTool(read_logs=True, deploy=False),
  TicketTool(read=True, write_comment=True, close=False)
]

answer = foundry.chat(
  model="claude-opus-4-6",
  system="You are a cautious enterprise engineer. Propose changes; do not execute destructive actions.",
  tools=tools,
  context=ctx,
)

# enforce policy OUTSIDE the model
assert answer.tokens <= ctx["budget"]["max_tokens"]
```

This sounds obvious, but teams routinely put “policy” in the system prompt and call it a day. Don’t.

## 4) Gotchas / pitfalls

- **"It’s in Azure" doesn’t automatically mean private.** Validate network paths and data egress assumptions.
- **RAG permission drift:** if you build one mega-index, you will eventually leak information across teams unless doc-level permissions are real and tested.
- **Over-trusting tool output:** your tools (APIs) can fail partially. Treat tool calls as untrusted input, with retries and idempotency.
- **Long context ≠ free context:** large context windows are great, but they can turn into silent cost multipliers.
- **Audit gaps:** if you can’t reconstruct “prompt + retrieved sources + tool calls”, your incident review will be vibes-based.

## 5) What I’d do next (checklist)

- [ ] Pick one workflow: “PR review + refactor suggestion”, propose-only
- [ ] Define the agent identity + least-privilege RBAC (and test denied actions)
- [ ] Add a human approval gate (PR approval / change approval)
- [ ] Turn on logging for prompts, tool calls, retrieved citations (redact secrets)
- [ ] Add cost attribution tags and budgets
- [ ] Run a tabletop exercise: "agent tries to do something dumb" (permissions + controls)

## 6) Sources

- Microsoft Azure Blog — Claude Opus 4.6 now available in Microsoft Foundry: <https://azure.microsoft.com/en-us/blog/claude-opus-4-6-anthropics-powerful-model-for-coding-agents-and-enterprise-workflows-is-now-available-in-microsoft-foundry-on-azure/>
- Anthropic — Claude Opus 4.6 announcement: <https://www.anthropic.com/news/claude-opus-4-6>
- Microsoft Tech Community — Foundry IQ (preview) overview: <https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/foundry-iq-unlocking-ubiquitous-knowledge-for-agents/4470812>
- Microsoft Foundry portal: <https://ai.azure.com/>
- Microsoft Azure Blog — Agentic AI build guidance (context for "agent-driven workflows"): <https://azure.microsoft.com/en-us/blog/actioning-agentic-ai-5-ways-to-build-with-news-from-microsoft-ignite-2025/>
