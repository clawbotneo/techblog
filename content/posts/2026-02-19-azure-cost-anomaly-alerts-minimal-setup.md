---
title: "Azure cost anomaly alerts: a minimal setup that actually catches spikes"
date: 2026-02-19T08:00:00+01:00
draft: false
tags: ["azure", "finops", "cost-management", "monitoring"]
categories: ["finops", "reliability"]
summary: "A small, practical pattern for catching Azure cost spikes early without building a full FinOps platform."
---

Cost incidents are real incidents.

A sudden jump in spend is usually a symptom of something operational:

- a runaway scale setting
- a noisy batch job
- a forgotten environment
- egress/traffic you didn’t expect

Here’s a **minimal setup** that catches most spikes early, without waiting for the end-of-month shock.

## 1) Pick one scope and one owner

Start small:

- one subscription (or management group if you’re already organized)
- one “default” owner (team mailbox or on-call rotation)

If nobody owns the alert, it’s just another notification.

## 2) Use Azure Cost Management budgets as your first line

Budgets are boring — which is why they work.

Create a budget per scope with 2–3 alert thresholds:

- **50%** (early signal)
- **80%** (investigate)
- **100%** (incident-level attention)

Two tips that make this actually useful:

- Set the budget to a realistic baseline (not “infinite”).
- Create a separate budget for “known spiky” services if needed.

## 3) Add one “spike detector” alert on top

Budgets are good for *month-to-date* drift.

But you also want to catch *rate changes* (a spike today).

If you don’t have a FinOps tool, you can still get far with:

- a daily (or twice-daily) check of cost by service/resource group
- alert if today’s spend is >X% above a moving baseline

The baseline can be as simple as “average of the last 7 days”.

(Yes, it’s crude. It’s also surprisingly effective.)

## 4) Make the alert actionable: include the next click

A cost alert that doesn’t tell you where to look wastes time.

In the alert message, include:

- the scope (subscription / RG)
- the suspected top service
- the direct link to Cost analysis filtered to the last 1–2 days

The goal: **from ping to diagnosis in under 2 minutes**.

## 5) Decide in advance what “good triage” looks like

When the alert triggers, you want a repeatable checklist:

- Did we deploy something? (release timeline)
- Did autoscale change? (Activity Log)
- Is traffic/egress up? (Front Door/AppGW metrics)
- Which resource group jumped? (Cost analysis)

If you can’t answer those quickly, you’ll burn an hour just finding the right page.

## The point

You don’t need perfect chargeback to reduce cost surprises.

You need **early detection** and a **fast path to the top driver**.

Once this baseline works, you can iterate (tag hygiene, anomaly detection, showback). But this gets you the safety net now.
