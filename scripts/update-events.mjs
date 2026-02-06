#!/usr/bin/env node
/**
 * Fetch Meetup group iCal feeds and generate content/events/_index.md
 *
 * Design goals:
 * - No external deps (works on stock Node 18+).
 * - Minimal parsing: enough for Meetup ICS.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const REPO = process.env.TECHBLOG_REPO || '/home/azureuser/techblog';
const OUT_FILE = path.join(REPO, 'content/events/_index.md');

const sources = [
  {
    name: 'Dutch Azure Meetup',
    groupUrl: 'https://www.meetup.com/nl-nl/dutch-azure-meetup/',
    icalUrl: 'https://www.meetup.com/nl-nl/dutch-azure-meetup/events/ical/',
  },
  {
    name: 'Azure Heroes Netherlands',
    groupUrl: 'https://www.meetup.com/nl-nl/azure-heroes-netherlands/',
    icalUrl: 'https://www.meetup.com/nl-nl/azure-heroes-netherlands/events/ical/',
  },
  {
    name: 'Azure Thursdays',
    groupUrl: 'https://www.meetup.com/nl-nl/azure-thursdays/',
    icalUrl: 'https://www.meetup.com/nl-nl/azure-thursdays/events/ical/',
  },
  {
    name: 'Azure Platform Engineering (APE)',
    groupUrl: 'https://www.meetup.com/nl-nl/azure-platform-engineering/',
    icalUrl: 'https://www.meetup.com/nl-nl/azure-platform-engineering/events/ical/',
  },
];

function unfoldIcs(text) {
  // RFC5545 line folding: CRLF + space/tab means continuation.
  return text.replace(/\r?\n[\t ]/g, '');
}

function parseProps(block) {
  const props = {};
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith('BEGIN:') || line.startsWith('END:')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const keyPart = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const key = keyPart.split(';')[0].toUpperCase();

    // Store first occurrence; keep list for multi fields.
    if (props[key] === undefined) props[key] = value;
    else if (Array.isArray(props[key])) props[key].push(value);
    else props[key] = [props[key], value];
  }
  return props;
}

function parseMeetupIcs(text, sourceName) {
  const unfolded = unfoldIcs(text);
  const events = [];

  const veventRe = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let m;
  while ((m = veventRe.exec(unfolded)) !== null) {
    const block = m[0];
    const props = parseProps(block);
    const dtstart = props.DTSTART;
    const dtend = props.DTEND;
    const summary = props.SUMMARY;
    const url = props.URL;
    const location = props.LOCATION || '';

    if (!dtstart || !summary) continue;

    events.push({
      source: sourceName,
      summary,
      dtstart,
      dtend,
      location,
      url,
    });
  }

  return events;
}

function parseIcsDate(s) {
  // Supports: 20260303T180000 or 20260303
  const m = String(s).match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/);
  if (!m) return null;
  const [_, y, mo, d, hh = '00', mm = '00', ss = '00'] = m;
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss)));
}

function fmtDate(d) {
  // Render as YYYY-MM-DD
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtTimeRange(start, end) {
  if (!start) return '';
  const sh = String(start.getUTCHours()).padStart(2, '0');
  const sm = String(start.getUTCMinutes()).padStart(2, '0');
  if (!end) return `${sh}:${sm}`;
  const eh = String(end.getUTCHours()).padStart(2, '0');
  const em = String(end.getUTCMinutes()).padStart(2, '0');
  // Many Meetup ICS use Europe/Amsterdam TZ but we parsed as UTC; time may be off.
  // So we avoid claiming exact time unless both provided; keep it as "local time" hint.
  return `${sh}:${sm}–${eh}:${em}`;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Neo-Techblog-EventsBot/1.0 (+https://clawbotneo.github.io/techblog/)',
      'Accept': 'text/calendar,text/plain,*/*',
    },
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return await res.text();
}

async function main() {
  const all = [];
  for (const src of sources) {
    const ics = await fetchText(src.icalUrl);
    const events = parseMeetupIcs(ics, src.name);
    for (const e of events) all.push(e);
  }

  // filter to 2026
  const enriched = all
    .map(e => {
      const start = parseIcsDate(e.dtstart);
      const end = e.dtend ? parseIcsDate(e.dtend) : null;
      return { ...e, start, end };
    })
    .filter(e => e.start && e.start.getUTCFullYear() === 2026);

  enriched.sort((a, b) => a.start - b.start);

  // group by month
  const byMonth = new Map();
  for (const e of enriched) {
    const key = `${e.start.getUTCFullYear()}-${String(e.start.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(e);
  }

  const lines = [];
  lines.push('---');
  lines.push('title: "Events (Netherlands)"');
  lines.push('---');
  lines.push('');
  lines.push('Upcoming Azure meetups and events in the Netherlands.');
  lines.push('');
  lines.push('## Larger events (NL)');
  lines.push('');
  lines.push('- **Experts Live Netherlands** — 1–2 June 2026 — NBC Congrescentrum, Nieuwegein — https://www.expertslive.nl/');
  lines.push('- **Azure Fest NL** — Wednesday, September 16 (year not clearly stated on the site; likely annual) — Sopra Steria, Ringwade 1, Nieuwegein — https://www.azurefest.nl/');
  lines.push('- **Azure Lowlands** — 2–3 December 2026 — De Fabrique — https://azurelowlands.com/');
  lines.push('');
  lines.push('## Meetups (auto-generated from iCal)');
  lines.push('');
  lines.push('This section is auto-generated from Meetup iCal feeds for these groups:');
  for (const s of sources) lines.push(`- ${s.name}: ${s.groupUrl}`);
  lines.push('');
  lines.push('Also useful directory: https://www.meetup.com/nl-nl/topics/azure/');
  lines.push('');
  lines.push('## 2026 calendar (from Meetup iCal)');
  lines.push('');

  if (enriched.length === 0) {
    lines.push('_No 2026 events found in the configured feeds (yet)._');
  } else {
    for (const [month, events] of byMonth.entries()) {
      lines.push(`### ${month}`);
      lines.push('');
      for (const e of events) {
        const date = fmtDate(e.start);
        const time = fmtTimeRange(e.start, e.end);
        const loc = e.location ? ` — ${e.location}` : '';
        const url = e.url || '';
        const timeNote = time ? ` (${time} local time)` : '';
        lines.push(`- **${date}**${timeNote}: [${e.summary}](${url}) (${e.source})${loc}`);
      }
      lines.push('');
    }
  }

  lines.push('## Add / correct an event');
  lines.push('');
  lines.push('If you want an event listed (or corrected), send:');
  lines.push('- event name');
  lines.push('- date/time');
  lines.push('- location');
  lines.push('- link');
  lines.push('');

  await fs.writeFile(OUT_FILE, lines.join('\n'), 'utf8');
  console.log(`Wrote ${OUT_FILE} with ${enriched.length} events`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
