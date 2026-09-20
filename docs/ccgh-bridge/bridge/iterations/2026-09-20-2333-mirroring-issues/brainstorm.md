---
title: Mirroring issues
date: 2026-09-20
participants:
  - hovannes
  - claude
---

# Mirroring issues

## What prompted this

Three specifications are stuck. `shipped` has exactly one writer — the bridge — and the bridge
does not exist, so `engine/bootstrap` is still `draft` although it shipped, and two more sit in
`ready` with nothing able to move them. Every task file carries `issue: null` that nothing will
ever fill. Two skills describe workflows that no command writes.

And this repository still has no continuous integration. It was deferred once during the
extraction, again during the plugin shell, and again during the site, each time to the
iteration that builds the bridge. Twenty-three pull requests have been merged on a local
verification and one person's word.

## What was considered

**How the engine reaches a GitHub runner.** This is the question the plugin-shell iteration
left open and could not answer: `ccgh` lives inside a plugin, and a runner has neither Claude
Code nor a plugin. Three shapes.

Publishing the package to npm gives clean versioning and a familiar `bunx ccgh-bridge@1.2.3`,
and costs a release process to keep and a second registry in the chain — the plugin installed
from GitHub while the CI installs from npm, two sources that can drift apart with nothing
saying so.

Pulling the repository directly with `bunx github:Hova25/ccgh-bridge` adds no infrastructure
at all, and re-downloads and re-resolves on every run, pins no further than a git reference,
and breaks every consumer's CI at once when this repository has a bad day.

**A composite action in this repository.** A workflow says `uses: Hova25/ccgh-bridge@v1` and
GitHub fetches the action itself; the consumer clones nothing, installs nothing and names no
path. The action installs Bun and its own dependencies in `$GITHUB_ACTION_PATH`. Consumer
workflows drop from around forty-five lines to fifteen, and a fix to the bridge reaches every
consumer by moving a tag rather than by asking them to re-run `init`.

The cost is a second shape of distribution to keep coherent with the first: this repository is
now both a plugin and an action. Two conditions follow, and they are conditions rather than
preferences: the repository must stay public, or a consumer needs a token to fetch the action;
and `bun.lock` must stay committed, because the action installs its dependencies where it
lands.

**Running it without publishing anything.** Raised after the shape was chosen, and it changed
the plan rather than decorating it: a composite action pinned to `v1` cannot be tested before
`v1` exists, which would have made the first task impossible to finish honestly.

GitHub resolves `uses: ./` against the checked-out repository, so this repository's own
workflows point at `./` and never at a tag. The action is exercised on every pull request
before any version exists, and a change to the action is tested by the pull request that makes
it — which a tag can never do, since a tag by definition moves after the fact.

For a consumer, `ccgh init --from <reference>` decides what goes behind `uses:`, stored in
`ccgh.json` so that re-running `init` does not forget it. `Hova25/ccgh-bridge@v1` by default,
`@main` to follow the trunk, `./` for this repository.

And `ccgh bridge <verb>` runs from a terminal with a token in the environment. No runner, no
action, no push: an iteration's issues can be created by hand and looked at before a workflow
is trusted to do it. It is also the only way to develop the bridge without pushing twenty times
to read a log.

That third path moved the risk. The first thing to touch a real GitHub repository is now a
command run deliberately, with a dry run in front of it, rather than a workflow reacting to a
push.

**What the validate workflow can be.** The origin's is welded to one repository: `pnpm lint`,
`pnpm conventions`, four `pnpm --filter` invocations. A generic one was impossible until the
plugin-shell iteration added `check` to `ccgh.json` for the commit hook. The same key answers
here, which is the first time a decision from an earlier iteration has paid for itself
unprompted.

**Splitting the iteration.** Ten tasks is larger than anything attempted so far. Splitting it
after the outbound half was considered and rejected: a bridge that creates issues and never
closes them is worse than no bridge, because it writes to GitHub and reads nothing back, and
the repository would rest in that state for however long the second half took.

**`relink` and `reconcile`.** `relink` rewrites issue bodies after a mass rename; it is the
tool of a migration that already happened. It crosses anyway, because a mass rename will happen
again and rebuilding it under pressure is worse. `reconcile` is the nightly consistency check
that catches a mirror that silently stopped updating, which is the failure mode of every
mirror ever built.

## Not settled here

Publishing `v1`. The tag is a deliberate act at the end, not a prerequisite, and nothing in
this iteration depends on it existing.

Migrating the origin repository. Unchanged since the bootstrap: extract, prove it here, migrate
later as its own decision.

Whether this repository's `main` passes its own validation. It has never been asked. Task 9
asks it for the first time, and the answer may be no.
