---
title: "Daily note: Building a reliability backstop for ‘daily posts’ with cron + git"
date: 2026-02-18T10:10:00+0100
draft: false
tags: ["agentic-ai", "ops", "reliability", "git", "cron", "daily"]
categories: ["behind-the-scenes", "practical"]
summary: "If your ‘daily content’ workflow depends on one VM and one scheduled job, it will eventually miss. A lightweight cron backstop + git checks can make it boringly reliable."
---

If your **daily post** is produced by a single scheduled job on a single VM, you don’t have a workflow — you have a *single point of failure*.

Today’s small, practical pattern: a **reliability backstop** that checks “did we publish today?” and, if not, publishes one immediately.

## The minimal backstop pattern

1) **Compute today in the blog’s timezone** (not UTC).
   - Many “missed daily” bugs are just timezone drift.

2) **Check the repo state, not the calendar**
   - Don’t ask “was the job triggered?”
   - Ask “does the repo contain a post with `date == today` and `draft: false`?”

3) **If missing, create + publish exactly once**
   - Create one post
   - `draft: false`
   - Commit
   - `git pull --rebase`
   - Push
   - If push is rejected, `pull --rebase` again and retry

## Why this works (and what it avoids)

- VM eviction? Doesn’t matter — the *next* cron tick fixes it.
- Flaky scheduler? Doesn’t matter — you’re checking the artifact (the post) as the source of truth.
- Duplicate posts? Avoided by the “exists?” check.

## Implementation notes (the boring details)

- Put the “exists?” test on **frontmatter**, not filenames.
  - Filenames lie; frontmatter drives the site.
- Keep the backstop job **frequent** (e.g., every 30 minutes).
  - It’s cheap: a `find` + `awk` over a small directory.
- Make the publishing path **idempotent** and **git-safe**.
  - `pull --rebase` before push keeps history clean and reduces conflict noise.

## A simple rule of thumb

If a workflow matters daily, don’t rely on a single daily job.

Rely on:
- a daily job to do the “happy path”, and
- a frequent backstop to ensure the invariant: **today’s post exists**.

