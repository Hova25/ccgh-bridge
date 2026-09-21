---
title: What happens to the repository this came from
date: 2026-09-21
status: accepted
supersedes: null
---

# What happens to the repository this came from

Every iteration so far has ended with the same sentence: migrating the origin is its own
decision. Five times, which is the point at which a deferral stops being a plan.

## What the question is

The repository this was extracted from still runs its own copy of all of it — the content
model, the scaffold, the promotion script, the hooks, the site, the bridge. That copy has not
moved since the extraction began, and this one has changed under it in four iterations. They
are already different.

## What was decided

**Not now, and here is what makes it urgent.**

The origin is a working product repository. Migrating it means replacing the harness under
active work, and the benefit — one copy instead of two — is invisible on the day it happens
and only pays later. Doing it during the extraction would also have meant migrating onto a
harness nobody had installed, which is exactly what this iteration spent its time proving was
worth waiting for.

The trigger is the first of these to happen:

- a defect is fixed here that the origin also has, and someone has to fix it twice;
- the origin's workflow needs a change that this one already has;
- a third repository adopts the plugin, which makes the origin the only one running a copy.

Any one of those turns "two copies" from a cost nobody feels into work someone is doing twice.

## What was rejected

**Migrating now.** It is the tidiest answer and the most expensive: a product repository stops
while its harness is replaced, to gain something it will not notice for weeks.

**Leaving it and letting the copies diverge.** This is what happens by default, and it ends
with two workflows that are nearly the same, which is worse than two that are obviously
different — the near-miss is what makes a fix land in the wrong one.

## What this leaves open

What the migration costs is now better known than it was: installing took one command,
`ccgh init` wrote five workflows, and the whole path was exercised in a repository that had
never seen the code. What is not known is what an existing content tree costs to move — the
origin has ninety files under a different root, and nothing here has ever moved content that
already existed.
