---
title: Make fix pull requests create their issue
date: 2026-09-21
issue: 87
pr: 86
---

# Make fix pull requests create their issue

A fix pull request never got its GitHub issue. `ccgh bridge fixes` creates one only for the
records its pull request brings, and it learned which those were from `BRIDGE_ARRIVING` — a
variable no generated workflow and not the action ever set. The list was always empty, the run
was green and printed `0 fix issue(s) created`, and nobody noticed: no fix since the bridge was
wired has an issue. The same run also rewrote each record's `date: 2026-09-21` as
`2026-09-21T00:00:00.000Z`, because YAML reads a bare day as a date and writes it back as a
timestamp.

When `BRIDGE_ARRIVING` is absent, the bridge now asks the branch itself:
`git diff --name-only origin/main...HEAD`, which the `ccgh-fixes` workflow makes resolvable by
checking out the whole history. The variable still wins when a workflow sets it. Consumers need
no new `ccgh init`: the change is in the action their workflows already call.

Every front matter write now keeps a day as a day. The two records that were rewritten this
way, the fixes behind #84 and #85, are put back by hand here.

The fixes already merged without an issue are not given one after the fact: an issue created
and closed in the same minute records nothing their pull requests do not.
