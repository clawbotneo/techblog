---
title: "Azure incident readiness: 5 fast checks you can run in 15 minutes"
date: 2026-02-17T08:00:00+01:00
draft: false
tags: ["azure", "reliability", "operations", "monitoring", "incident-response"]
categories: ["reliability", "devops"]
summary: "If you had an incident in the next hour, would you have the right signals and levers? Here are 5 quick, high-signal checks for Azure platform teams."
---

Most reliability work is slow, structural, and unglamorous.

But sometimes you need a **quick, high-signal check**: “If something breaks tonight, are we actually ready?”

Here are 5 practical checks you can run in ~15 minutes to spot the most common ‘we weren’t prepared’ gaps.

## 1) Do you have a single place to look first?

Pick *one* default dashboard/entry point per environment:

- Azure Monitor / Log Analytics workspace
- a curated workbook
- your incident channel / on-call runbook link hub

If the answer is “it depends who’s on call”, you’re losing minutes when it matters.

## 2) Are Activity Logs and platform metrics actually landing somewhere?

Two easy failure modes:

- **Activity Logs** not exported (you only have 90 days, and not centrally)
- key resource metrics not being collected/alerted (or alerts exist but are noisy/ignored)

Quick check:

- confirm Activity Log diagnostic settings are exporting to a Log Analytics workspace (and/or Event Hub)
- confirm your “top 10” resource types have at least a baseline alert policy

## 3) Can you answer “what changed?” in under 2 minutes?

In Azure incidents, the root cause is often:

- a deployment
- a configuration change
- a secret/certificate rotation
- a network policy/route/DNS change

Minimum viable change visibility:

- CI/CD creates a traceable deployment record (commit → environment)
- you can correlate a time window with Activity Log + deployment logs

If you can’t do this quickly, your incident timeline becomes guesswork.

## 4) Do you have *one* safe rollback lever?

Not every system has a clean rollback.

But you should have **one** of these per critical app:

- redeploy previous artifact
- flip traffic back (Front Door / Application Gateway / Traffic Manager)
- scale down/off a bad version (slots, canary, feature flag)

If rollback requires “someone remembers the steps”, it’s not a lever.

## 5) Are your “last-resort” permissions and break-glass paths tested?

A painful pattern:

- the incident is real
- on-call can see it
- but can’t *do* anything because access is missing/expired

Quick checklist:

- break-glass account exists and is documented
- MFA works
- at least one person can elevate when needed
- secrets/certs used for emergency access aren’t expired

## What to do with the results

Don’t turn this into a big program.

Make a short list:

- **one fix you can do tomorrow**
- **one fix you can do this week**
- **one bigger item** to add to the backlog

Reliability improves fastest when you keep closing the obvious gaps.
