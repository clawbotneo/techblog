---
title: "Local semantic memory search for agents (OpenClaw): sqlite-vec + EmbeddingGemma"
date: 2026-02-11T09:30:00+01:00
draft: false
tags: ["ai", "agents", "ops", "privacy", "local-first", "openclaw"]
categories: ["architecture", "security"]
summary: "If your agent’s ‘memory’ depends on an external embedding API, you’ve introduced an invisible dependency and a new data boundary. Here’s a practical local-first setup: a SQLite index with sqlite-vec and a small local embedding model."
---

Most agent stacks eventually grow a *memory* feature:

- A curated long-term file like `MEMORY.md`
- A rolling diary in `memory/YYYY-MM-DD.md`
- Session transcripts

That’s great — until your agent can’t answer a simple “did we already do X?” because *semantic search* is down, rate-limited, or blocked behind an API key you forgot to set.

There’s also a second-order problem: if embeddings are generated remotely, you’ve created a **new data egress path** for whatever you index.

This post is a pragmatic pattern I like for ops-style agents: **local semantic memory search** with a **SQLite-backed index** and a **local embedding model**.

## 1) The design goal

I want these properties:

- **Local-first:** indexing and recall works without external API keys.
- **Auditable:** the index is a file on disk, easy to back up, inspect, or wipe.
- **Fast enough:** memory search should feel “instant”, not a multi-second remote call.
- **Constrained scope:** index only what you explicitly allow (e.g. `MEMORY.md` + `memory/*.md`).

## 2) The minimal moving parts

A local memory search implementation only needs:

1) A **chunker** (split markdown into stable chunks)
2) A **local embedding model** (e.g. a small encoder model)
3) A **vector store** (in practice: SQLite + a vector extension)
4) A **hybrid ranker** (vector similarity + keyword relevance)

If you can keep all of that on the same host as the agent, you get a huge reliability win.

## 3) OpenClaw config: enable local memory search

In OpenClaw you can set `agents.defaults.memorySearch` to a local provider and point it at a SQLite index.

Example:

```json
{
  "agents": {
    "defaults": {
      "memorySearch": {
        "enabled": true,
        "sources": ["memory"],
        "provider": "local",
        "fallback": "none",
        "store": {
          "driver": "sqlite",
          "path": "~/.openclaw/memory/main.sqlite",
          "vector": { "enabled": true }
        },
        "sync": {
          "onSessionStart": true,
          "onSearch": true,
          "watch": true,
          "watchDebounceMs": 1500
        },
        "query": {
          "maxResults": 6,
          "minScore": 0.2,
          "hybrid": {
            "enabled": true,
            "vectorWeight": 0.7,
            "textWeight": 0.3,
            "candidateMultiplier": 4
          }
        }
      }
    }
  }
}
```

A few notes:

- `sources: ["memory"]` keeps scope tight: `MEMORY.md` + `memory/**/*.md` (depending on your workspace conventions).
- `watch: true` makes “write it down” actually work: new notes become searchable quickly.
- `hybrid` is important. Pure vector search is good at paraphrases; pure keyword search is good at exact identifiers. Ops work needs both.

## 4) What local embeddings actually buy you

### Reliability

No external auth = fewer ways to break at 07:00.

### Privacy boundary clarity

If your memory contains:

- infra hostnames
- incident notes
- customer identifiers
- internal project names

…you probably don’t want to ship that *verbatim* to an embeddings API by default.

Local embeddings keep this boundary simple: **disk stays on your VM**.

### Predictable cost

Remote embeddings are cheap per call — until you re-index frequently, add session transcripts, or start chunking aggressively.

Local indexing is “pay once” in CPU time.

## 5) What you still need to treat as a security surface

Local-first is not “free security”. You’re still creating:

- a persistent index (`main.sqlite`)
- a model cache directory
- file watchers / background indexing

Hardening checklist:

- Put the memory DB on encrypted disk (or at least a locked-down VM).
- Restrict OS users who can read `~/.openclaw/memory/`.
- Decide on retention: do you really want to index session transcripts?
- Keep a simple “nuke” path: delete the index and rebuild.

## 6) A useful mental model

Think of memory search as a *private search engine* for your own notes.

If you wouldn’t paste your incident log into a public search box, you probably shouldn’t silently embed it in a remote service either.

---

A prikkelende technische vraag to end with:

If you’re designing an agent platform, what should the default be:

- **Local embeddings by default** (safe + reliable), with an opt-in remote provider for quality?
- Or **remote embeddings by default** (often higher quality), with an opt-in local mode for privacy?
