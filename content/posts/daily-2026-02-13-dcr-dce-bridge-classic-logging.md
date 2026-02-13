---
title: "Bridge classic file-based logging into Azure Monitor with DCRs + DCEs (without rewriting apps)"
date: 2026-02-13T08:00:00+01:00
draft: true
tags: ["azure", "azure-monitor", "log-analytics", "observability", "security", "platform-engineering", "finops"]
categories: ["operations", "security", "architecture"]
summary: "Azure Monitor’s Data Collection Rules (DCR) + Data Collection Endpoints (DCE) let you ingest legacy/file-based logs into Log Analytics with transformations, private-link-ready endpoints, and IaC-friendly config. Here’s the mental model + a practical rollout path." 
---

Lots of production systems still log like it’s 2014: append-only files on VMs, custom log formats, maybe a sidecar shipper that “works” but nobody wants to touch. And every time you modernize *anything* else (networking, identity, platform), the logging pipeline becomes the brittle dependency.

The key thing I keep seeing: teams think they need to rewrite logging to move to Azure Monitor / Log Analytics. You usually don’t.

Azure Monitor’s newer ingestion/config model — **Data Collection Rules (DCRs)** plus (optionally) **Data Collection Endpoints (DCEs)** — is a pretty solid “bridge” pattern: keep your application logs as-is, but standardize the *collection and routing* layer.

## 1) Why this matters

### Modernization without the “rewrite tax”
If your app logs are embedded in a legacy framework, rewriting them can be a multi-quarter migration with a high chance of breaking observability right when you need it most.

DCRs let you **collect, transform, and route** data centrally. That means you can:

- onboard logs incrementally (one VM group at a time)
- normalize fields over time
- move off third-party shippers/pipelines without a flag day

### Security + governance: fewer mystery data paths
If you care about security posture, the most important part isn’t “do we have logs?” but:

- where do logs flow (and over what network path)?
- can we restrict/segment that flow per environment?
- can we prove what was collected and where it landed?

DCEs become relevant as soon as you want **private-link-aligned ingestion** or need explicit endpoint control for some scenarios.

### FinOps: ingestion is a billable workload
Log Analytics ingestion costs money. DCRs (and their transformations) are one of the most practical levers to reduce waste:

- drop noisy fields
- filter low-value events at ingest
- route different log types to different workspaces/tables

## 2) How it works (diagram-in-words)

Think in three layers:

- **Source**: VM / Arc-enabled server / container host
  - logs exist as event logs, syslog, or plain files
- **Collection & routing**:
  - **Azure Monitor Agent (AMA)** runs on the machine
  - it pulls configuration from Azure Monitor
  - configuration is defined by **DCRs**
  - if you’re doing private link / certain data sources, you add a **DCE**
- **Destination**:
  - Log Analytics workspace + tables
  - (and then Sentinel / workbooks / alerts / KQL queries)

In other words:

1) AMA gets told “collect X” (via DCR)
2) Data flows through the Monitor ingestion pipeline
3) Optional transformation runs
4) Data lands in Log Analytics

## 3) Practical steps (a rollout path that doesn’t hurt)

### Step 0 — Decide your landing zone for logs

Pick a destination strategy (don’t overthink it, but decide):

- **Single workspace per environment** (common): `log-dev`, `log-prod`
- **Separate workspace per platform domain**: `log-secops`, `log-platform`
- **Strict tenancy / BU isolation** (more complex): workspace-per-team

Rule of thumb: if you can’t assign a clear “owner” for a workspace, you will have problems (retention, alerts, access, cost).

### Step 1 — Install Azure Monitor Agent (AMA)

AMA is the workhorse here. At scale, you typically deploy via:

- Azure Policy (for Azure VMs)
- Arc extension deployment (for on-prem/other clouds)
- or your own IaC pipeline for VM extensions

### Step 2 — Create a DCR for one *boring* log source first

Start with something that gives value quickly and won’t drown you:

- IIS logs (Windows)
- a single app’s file logs
- syslog facility subset (Linux)

Then expand.

DCRs are an ETL-like config object: define the inputs, optional transformations, and the destination table/workspace.

### Step 3 — Add a DCE when you need endpoint control / private link

A DCE is an Azure resource that defines ingestion/config endpoints for Azure Monitor collection.

Important nuance: you don’t always need a DCE. If you’re going private link, or your scenario requires it, you’ll know — because the docs and/or portal workflow will force your hand.

### Step 4 — Associate the DCR to your machines (DCRA)

For AMA scenarios, you associate a DCR to a VM (or a scope) via a **Data Collection Rule Association**. That’s the “attach this config to that fleet” binding.

### Step 5 — Validate with KQL (and measure ingestion)

Don’t stop at “logs arrived”. Do:

- a query that validates parsing/fields
- a usage check that validates cost/volume

Example KQL sanity checks:

```kusto
// Find the newest records in a custom table
// (replace with your target table)
MyApp_CL
| top 50 by TimeGenerated desc
```

```kusto
// Volume by hour (quick-and-dirty ingestion trend)
MyApp_CL
| summarize Count=count() by bin(TimeGenerated, 1h)
| render timechart
```

## 4) Gotchas / pitfalls

- **Region alignment matters.** DCE components have regional considerations (config vs ingestion endpoints) and misalignment shows up as confusing “it deployed but doesn’t ingest” behaviour.

- **Don’t skip transformations as a first-class design tool.** If you ingest everything “raw” forever, Log Analytics becomes the most expensive JSON dumpster in your subscription.

- **Table sprawl is real.** If each team creates their own custom tables without standards, your KQL and detections become fragile.

- **Private link adds operational overhead.** It’s worth it for sensitive environments, but it’s not free: DNS, AMPLS, and endpoint lifecycle become part of your monitoring platform.

- **Agent configuration drift**: if you bind too many DCRs to the same machines, troubleshooting becomes “which DCR did what?”. Keep DCRs composable and documented.

## 5) What I’d do next (checklist)

- [ ] Decide workspace strategy + retention defaults per environment
- [ ] Define naming conventions for DCRs/DCEs and custom tables
- [ ] Create one DCR for one log type and onboard one pilot VM set
- [ ] Add a transformation to drop obvious noise (prove FinOps value early)
- [ ] Build one workbook + one alert (prove operator value early)
- [ ] If you need private link, design AMPLS + DCE topology before scale-out
- [ ] Document the “how to onboard a new log” runbook for other teams

## 6) Sources

- Microsoft Tech Community event: Bridging Classic Logging and Azure Monitor using Azure DCEs and DCRs
  https://techcommunity.microsoft.com/event/905f6364-959b-4f0a-bb85-10c14d665ed6/bridging-classic-logging-and-azure-monitor-using-azure-dces-and-dcrs/4491629
- Data collection rules (DCRs) in Azure Monitor
  https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-rule-overview
- Data collection endpoints (DCEs) in Azure Monitor
  https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-endpoint-overview
- Azure Monitor Agent (AMA) overview
  https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-overview
