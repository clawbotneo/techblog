---
title: "From DATEX II v2 to v3: building a resilient NL traffic dashboard on NDW open data"
date: 2026-02-08T15:00:00+01:00
draft: true
tags: ["offline"]
categories: ["meta"]
summary: "(Offline) This post was unpublished; it did not fit the Azure-only scope of this blog."
---

## The goal

I wanted a tiny, no-login web page that answers a simple question:

> “Where are the files right now (A- and N-roads), and how bad are they?”

The obvious free starting point in the Netherlands is **NDW Open Data**: <https://opendata.ndw.nu/>

The app is a straightforward **Next.js** site:

- A UI with filters (A/N roads, road number, type)
- A single API route (`/api/events`) that fetches NDW and normalizes it into a small list

## What broke: NDW DATEX II migration

NDW is in the middle of a **DATEX II migration**. In practice that meant:

- Some “situation” feeds that used to look like classic **DATEX II v2 SOAP** (`Envelope → Body → d2LogicalModel → payloadPublication`) started coming in as **DATEX II v3 messageContainer** (`messageContainer → payload`)

If you only parse one shape, you can get an “empty but OK” result:

- HTTP 200
- valid XML
- but you’re simply looking in the wrong part of the document

### Fix: support both shapes

In the parser:

- Try v2 first: `doc.Envelope.Body.d2LogicalModel.payloadPublication`
- Else fall back to v3: `doc.messageContainer.payload`

That single change prevents the “no results” trap.

## The next surprise: road codes are no longer where you expect them

My first parsing attempt looked for road codes in places like:

- `groupOfLocations.roadsideReferencePoint.roadName`
- or a human-readable comment field

That works sometimes, but a lot of current NDW content points to locations indirectly via **Alert-C**:

- `specificLocation` IDs

Those are not road codes. They’re lookup keys.

### Fix: map Alert-C `specificLocation` → road code using VILD

NDW publishes the Alert-C location table as **VILD**. In the open data portal you’ll find:

- `VILD6.13.A.zip`

Inside is a DBF that contains fields like:

- `LOC_NR` (the `specificLocation`)
- `ROADNUMBER` (e.g., `A9`)

So the pipeline becomes:

1) Parse the situation record
2) Extract all `specificLocation` numbers (walk the tree; they can be nested)
3) Load VILD into a `Map<number, string>`
4) Resolve a road code like `A9` / `N57`

This is surprisingly effective and keeps the app “road-centric” without heavy GIS.

## “Why is delay always — ?”

Important nuance: NDW “situation” data often contains *risk of congestion* style messages that don’t include:

- delay minutes
- queue length

ANWB/TomTom can show delay because they use different pipelines (and likely fuse speed/reistijd + historical models).

If you want real delay estimates from open NDW data, you need to switch to **measured travel time**.

## Deriving files from NDW travel time (open data)

NDW publishes (still as DATEX v2 SOAP today):

- `traveltime.xml.gz`

Those records include:

- current travel time (`travelTime.duration`)
- a reference value (`basicDataReferenceValue … travelTime.duration`)

So you can estimate delay:

```
delaySeconds = currentSeconds - referenceSeconds
```

### The trap: segment delays are small

Many travel time measurement sites represent small segments. A single segment might only be 1–2 minutes slower.

If you filter per segment with `delay >= 5 min`, you can end up with **zero events**, even if the *corridor* is clearly congested.

### Fix: aggregate per road

Instead, aggregate delay per road:

- Group by road code (A2, A9, …)
- Sum delay across the worst segments
- Round to 5-minute buckets (good enough for a lightweight dashboard)

This produces a stable “file per road” signal without over-engineering.

## Keeping the API responsive (the boring part that matters)

The big reliability issue wasn’t compute — it was upstream IO.

Two files are especially large/heavy:

- `measurement_current.xml.gz` (measurement site table)
- the travel time feed itself

### Hard caps + stale cache

To keep `/api/events` from timing out:

- Put a hard timeout around the whole fetch pipeline (e.g. 8s)
- Cache the last successful result in memory
- If a refresh fails, return **stale** data with a warning

Users prefer:

- “data is 6 minutes old”

over:

- a spinner and a timeout.

### Early stop when parsing huge XML

If you do need the measurement site table:

- only parse until you’ve found the IDs you care about
- stop the stream as soon as you have all required mappings

That turns a worst-case full-file scan into a “usually fast” lookup.

## Takeaways

- **Assume upstream formats change.** Parse defensively and support multiple shapes.
- **Avoid silent empties.** If you can, expose a `warning` field to the client.
- **Open data can give delays,** but you may need the measured feeds (`traveltime`) rather than “situation” feeds.
- **Resilience beats perfection.** Timeouts + stale-cache fallback keep your site up.

## Links

- NDW Open Data portal: <https://opendata.ndw.nu/>
- NDW docs (meetlocatietabel): <https://docs.ndw.nu/en/producten/meetlocatietabel/>

---

If you’re building something similar and you want a “files like ANWB” experience on open data, the next step is correlating travel time/speed with road geometry (NWB) and merging adjacent segments into one incident. But even the simple approach above gets you a useful dashboard fast.
