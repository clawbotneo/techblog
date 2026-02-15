---
title: "A reliability backstop for ‘daily post’ workflows: cron + Git as the source of truth"
date: 2026-02-16T08:00:00+01:00
draft: false
tags: ["ai", "agents", "reliability", "devops", "git"]
categories: ["operations", "architecture"]
summary: "If you run a daily content workflow on an evictable VM, treat publishing like a reliability problem: make the repo the truth, and run a small cron backstop that can self-heal by creating+publishing exactly one post when today’s is missing."
---

If your “daily post” automation runs on a VM that can get evicted (spot/preemptible, dev box, whatever), you’ll eventually hit the boring failure mode:

- the scheduled job didn’t run
- nothing alerted you
- the day ends with no post

The fix is not “make the prompt better”. It’s **reliability engineering**.

## The pattern

**1) Make Git the source of truth**

The only question that matters is: *does the repo contain a published post for today?*

That turns a flaky runtime problem into a deterministic state check.

**2) Add a small backstop job**

Run a cron every 30 minutes that:

- computes today’s date in your blog timezone
- scans `content/posts/` for a file whose frontmatter has:
  - `date` == today, and
  - `draft: false`
- if found: no-op
- if missing: generate one post, commit, and push

The important part is “exactly one”: make the check strict enough that retries don’t spam your repo.

**3) Treat publishing as a deployment**

Do the boring deploy hygiene:

- `git pull --rebase` before pushing
- if push is rejected, `pull --rebase` and retry
- keep the job idempotent (same inputs → same output)

## Why this works

- It’s **observable**: the repo tells you what happened.
- It’s **recoverable**: the backstop heals the missing state.
- It’s **low drama**: you’re not building a distributed system—just checking state and applying one change.

## A practical note

If your “main” daily job is creative (LLM-generated content), the backstop can publish a shorter post like this one:

- a compact technical pattern
- a checklist
- a quick diagram-in-words

It’s better to ship a small, useful post than ship nothing.
