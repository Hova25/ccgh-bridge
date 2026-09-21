---
title: Stop reconcile reporting fixes under review as abandoned
date: 2026-09-21
issue: null
pr: null
---

# Stop reconcile reporting fixes under review as abandoned

The scheduled `ccgh bridge reconcile` failed while a fix pull request was open, reporting
`abandoned: #87 was opened for bridge/fixes/…, which is not on main`. It calls a fix abandoned
when its issue is open and its record is absent from `main` — which is also the ordinary state
of every fix under review, since the bridge opens the issue when the pull request opens and the
record reaches `main` only at the merge. The report could not tell the two apart. It never fired
before because, until the previous fix, no fix ever had an issue; now any fix pull request open
during the daily run turns the job red.

`abandonedFixIssues` now takes the branches that have an open pull request and leaves out any
fix whose branch is among them. The client lists them in one call,
`openPullRequestBranches`, rather than asking once per issue. A fix whose pull request was
closed without merging is still reported: its branch no longer has an open pull request, its
record never reached `main`, and its issue is still open — which is what the report is for.
