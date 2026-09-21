---
title: The path a consumer takes
status: active
depends_on: []
impacts:
  - site
  - bridge
validated_by: hovannes
validated_at: '2026-09-21T00:31:21.036Z'
launched_by: hovannes
launched_at: '2026-09-21T00:48:54.306Z'
launched_tasks:
  - tasks/01-version-and-the-tag.md
  - tasks/02-the-pages-workflow.md
  - tasks/03-the-sandbox-installs-it.md
  - tasks/04-one-iteration-in-the-sandbox.md
  - tasks/05-what-the-sandbox-revealed.md
  - tasks/06-the-record.md
---

# The path a consumer takes

## Problem

Nobody has installed this. Everything proved so far was proved by the repository that wrote
it, and every convenience it relied on is exactly what a consumer does not have: `uses: ./`
resolves because the action is in the checkout, the plugin loads because the settings point at
`.`, and `ccgh` is on the PATH because the plugin directory is this directory.

There is also a promise outstanding: `ccgh init` defaults to `Hova25/ccgh-bridge@v1`, and `v1`
does not exist. A repository running `ccgh init` today gets five workflows that all fail at
`uses:`.

## Goals

`v1` and `v1.0.0` existing, agreeing with the manifest, and a test that says so when they stop.

A sandbox repository that installed this plugin the way anyone would — from the marketplace,
by name — ran `ccgh init` with the default reference, and carried one real iteration from
brainstorm to `shipped` with issues created and closed by the bridge.

Whatever that reveals, repaired.

This repository's site published, so that the content tree can be read by someone who has
installed nothing.

## Non-goals

**Migrating the origin repository.** Still its own decision, and cheaper afterwards than
before.

**Publishing to npm.** The action and the plugin both come from this repository; a third
channel would be a third thing to keep in step.

**A pages workflow for every repository.** `ccgh init` writes one only when `site` is
configured. A repository that has not said where it publishes does not want a workflow that
publishes.

## Contract

### Version

`plugin.json` leads. `v1.0.0` is the immovable tag, `v1` the major tag that moves, and a test
refuses a manifest whose version disagrees with the tag the repository is checked out at when
one exists.

### The sixth workflow

`ccgh-pages.yml`, written by `ccgh init` only when `ccgh.json` carries `site`:

| | |
| --- | --- |
| Fires on | push to `main` |
| Runs | `ccgh docs --build`, then `actions/deploy-pages` |
| Needs | `pages: write` and `id-token: write` |

The build already refuses without `site`, so the workflow that runs it cannot be written for a
repository where it would fail.

### The sandbox

A repository of its own under the same account, created empty. Not a fork: a fork inherits
this repository's settings, content and workflows, which is the coupling being tested against.

It proves, in order:

1. `claude plugin marketplace add Hova25/ccgh-bridge` and `claude plugin install ccgh@ccgh-bridge` succeed from a machine that has never cloned this repository.
2. `ccgh` answers in a session there, with no flags.
3. `ccgh init` writes five workflows pointing at `Hova25/ccgh-bridge@v1`, and they resolve.
4. One iteration goes from brainstorm to `shipped`, with its issues created and closed by the bridge.

Each of those four is a thing that has never happened.

## Failure modes

**`v1` does not resolve.** The sandbox's workflows fail at `uses:` with GitHub's own message,
which names the reference. This is the failure that exists today and the tag removes.

**The plugin installs but `ccgh` is not on the PATH.** Then `bin/ccgh` is not executable in the
installed copy, or the manifest is wrong. Nothing here has ever been tested from a cache
directory.

**The install runs no `bun install`.** The plugin's dependencies would be absent and every
command would fail on a missing module. The installer is documented to run it; documented is
not the same as observed.

**A pages deployment with no Pages enabled.** GitHub's own error; `ccgh init` cannot enable
Pages for a repository and should not pretend to.

## Risks

**This is a test, and a test can fail.** Four iterations were built on conveniences that the
sandbox removes one by one. Something will break, and the useful outcome is finding out which.

**The sandbox is real.** It creates a repository, installs a plugin, opens issues and merges
pull requests under the same account. Everything it does is small and deletable, and none of it
touches this repository.

**A moving `v1` is a promise to keep it working.** Once it exists, anything merged here reaches
every consumer pinned to it the moment the tag moves. This repository has one consumer and it
is a sandbox; the discipline still starts now.

## Open questions

None blocking. What a consumer's older Bun does with this lockfile is unknown, and the sandbox
runs on the same machine, so it will stay unknown.
