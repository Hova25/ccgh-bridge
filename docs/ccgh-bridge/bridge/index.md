---
title: Bridge
summary: The half of the workflow that lives on GitHub — one issue per task, one writer per field, and the statuses that only a merge may change.
---

The engine decides what is valid and the site decides what is legible. The bridge decides what
is true on GitHub: which task has an issue, which issue is closed, which iteration has shipped.

It is the only writer of `issue`, of everything under `github:`, and of `status: shipped`. That
exclusivity is the whole design. A number written by hand is a number nobody can trust, so the
hooks refuse it, the schemas expect it, and the bridge fills it in from what GitHub actually
says rather than from what anyone intended.

It reaches a repository twice, and both are the same code. As a composite action, so that a
workflow says `uses:` and nothing else — no clone, no path, no install. And as `ccgh bridge`,
run from a terminal against the same token, because a bridge that can only be exercised by
pushing and reading a log is a bridge nobody debugs.
