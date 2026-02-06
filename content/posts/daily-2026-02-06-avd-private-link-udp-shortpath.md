---
title: "Daily note: AVD + Private Link — UDP opt-in becomes mandatory for RDP Shortpath (Feb 1, 2026)"
date: 2026-02-06T13:59:00+0100
draft: true
tags: ["azure", "avd", "networking", "private-link", "rdp", "daily"]
categories: ["updates", "practical"]
summary: "If you run Azure Virtual Desktop over Private Link, a quiet portal checkbox is about to become a hard requirement for RDP Shortpath. Here’s what to check before Feb 1, 2026."
---

If you’re running **Azure Virtual Desktop (AVD)** with **Private Link**, there’s an upcoming change that can easily turn into a “why is performance suddenly worse / why is UDP blocked?” incident.

Microsoft documents that **starting February 1, 2026**, the **UDP opt-in** checkbox will become **mandatory** for enabling **RDP Shortpath with Private Link**. If you don’t opt in, **RDP Shortpath will be blocked** for Private Link connections.

## What changed / what I noticed

- Today, you can have RDP Shortpath “effectively on” even if you never enabled the Private Link UDP checkbox.
- **From Feb 1, 2026**, that implicit behavior goes away.
- The setting is a bit buried: **Host pool → Networking → Public access → “Allow Direct UDP network path over Private Link”**.

## Why it matters (my take)

AVD performance tuning is usually a game of small wins: latency, transport choice, routing, DNS, and “did we accidentally hairpin through something slow?”.

A silent behavior change like this is exactly the kind of thing that bites teams because:

- it’s **not a code change** (so it won’t show up in PRs),
- it’s **per host pool** (so it’s easy to miss one), and
- it can show up as “users complain” instead of a clean fault.

## Practical next actions (do this before Feb 1)

1) **Inventory which host pools use Private Link**
- List host pools that have private endpoints configured (connection sub-resource).

2) **Enable the UDP opt-in (where you want Shortpath over Private Link)**
- Azure portal → AVD host pool → **Networking → Public access**
- Select your desired public/private access mode
- Check **Allow Direct UDP network path over Private Link**

3) **Disable RDP Shortpath for public networks (STUN/TURN) if the portal complains**
Microsoft notes the portal will block Save with a configuration error until you disable:
- RDP Shortpath for public networks (via STUN)
- RDP Shortpath for public networks (via TURN)

4) **Validate from a client path that actually uses Private Link**
- Test from a client that reaches the AVD service via your intended network path (VPN/ER)
- Confirm transport behavior and user experience

## Gotchas / pitfalls

- **“Global” feed discovery is special**: only one private endpoint for the global sub-resource is allowed per deployment, and it affects all workspaces.
- **DNS is still the #1 footgun** with Private Endpoints. If name resolution isn’t right, everything else looks broken.
- **Address space headroom**: private endpoints consume IPs and allocations can change as capacity expands; don’t run your subnets too tight.

## What I’d do next (checklist)

- [ ] Make a list of all AVD host pools using Private Link.
- [ ] Decide where you *want* UDP-based transports over Private Link (not always everywhere).
- [ ] Enable the UDP opt-in checkbox for those host pools.
- [ ] Re-test a representative user flow (client + session host sides).
- [ ] Put a reminder in your change calendar for late Jan 2026 to re-validate.

## Sources

- Azure Private Link with Azure Virtual Desktop (includes the Feb 1, 2026 change note):
  https://learn.microsoft.com/en-us/azure/virtual-desktop/private-link-overview
- RDP Shortpath:
  https://learn.microsoft.com/en-us/azure/virtual-desktop/rdp-shortpath
- Azure Private Endpoint overview:
  https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview
