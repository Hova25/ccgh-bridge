---
title: Bootstrap
date: 2026-09-20
participants:
  - hovannes
  - claude
---

# Bootstrap

## What prompted this

The workflow this repository is being built to ship already exists, and it works. It grew
inside a product monorepo — specifications and tasks as content, four statuses with two human
gates, a GitHub bridge with one writer per field, nine hooks refusing what the rules forbid,
and a documentation site rendering all of it. Roughly ninety files, eight decision records,
and several months of arguments settled.

It is also welded to that one repository. Two hundred and fifty-four call sites reach the
engine through a pnpm filter naming that repository's documentation application. The content
root is a path relative to the script that reads it, which forces the content to live inside
the Astro application. The site is branded. None of it can be pointed at a second project.

The next project will want the same workflow, and copying ninety files into it would create
two divergent copies on the first day.

## What was considered

**The vehicle.** A Claude Code plugin was proposed, and the reference was read rather than
recalled. A plugin carries skills in exactly the shape these are already written, hooks
through `hooks/hooks.json`, and — the part that decided the design — **executables in `bin/`,
added to the Bash tool's PATH**. That last one dissolves the two hundred and fifty-four call
sites into `ccgh <subcommand>`, which is the whole coupling and is mechanical.

A plugin cannot carry GitHub Actions workflow files. Half the bridge lives in
`.github/workflows/`, and those files must exist in the consuming repository. So the plugin
is not the whole answer: there will also be a command that writes them and can be re-run to
update them.

**Where the site lives.** Three shapes. An npm package with a ten-line Astro application in
each consuming project: conventional and upgradeable through npm, but every project then
carries an application and its dependencies. A template copied by an init command: nothing to
package, everything readable on the spot, and no upgrade path — an improvement reaches a
project only if someone re-runs init and resolves the conflicts by hand. **The site ships
inside the plugin** and reads `${CLAUDE_PROJECT_DIR}`: a consuming repository holds no Astro
file at all, and `ccgh docs` opens it. The cost is that a heavy application runs out of a
plugin cache directory, which is the least comfortable of the three to package.

**Bun rather than Node and pnpm.** Not a preference: Claude Code installs a plugin's
dependencies with npm or bun and **explicitly skips pnpm**, which is what this workflow's home
repository uses. Bun also runs TypeScript directly, so `bin/ccgh` is a file with a
`#!/usr/bin/env bun` shebang and there is no build step and no `tsx` dependency.

`bun build --compile` was considered and rejected. It produces a standalone binary, which
would remove Bun as a prerequisite, but a plugin would then have to carry one binary per
platform — tens of megabytes each, in a directory Claude Code copies on every version. Bun
becomes a prerequisite on the consuming machine instead, stated in the onboarding page the
way Node is stated today.

**What happens to the repository it came from.** Migrating it immediately would be the
strongest proof and would prevent any drift; it would also immobilise a working product
repository during the operation. Extracting and changing nothing there is the fastest route
to a reusable plugin and proves nothing until the next project starts. **Extract, prove it on
a sandbox repository created for that, and migrate the origin later as its own decision.**
The drift is real and accepted: the origin keeps a copy that will fall behind, and closing
that gap is scheduled work rather than an accident.

**Self-hosting.** This repository develops itself with the workflow it ships: its
specifications, decisions and tasks live under `docs/`, and its own changes go through
`/open-iteration`. Every change to the harness becomes a full-scale trial of it, and a defect
in the workflow is felt here before it is felt by a consumer. The sandbox repository stays
necessary alongside it, because self-hosting exercises the plugin loaded from a directory,
never the path a real consumer takes — installing it from a marketplace.

The bootstrap is circular and the circle is broken by hand: this iteration's brainstorm and
specification were written without the scaffold that writes them, and this iteration is
promoted without the promotion script that promotes them, because it is the iteration that
builds both. From the next one on, the real gates apply.

**The history.** `git filter-repo` could have carried the history of those ninety files —
the reversal on git worktrees, the renaming of the whole tree by the minute, the eight
decisions in the context that produced them. **A fresh first commit was chosen instead.** The
eight decision records move across regardless and become the only memory of why, which is
what they were written for. The origin repository keeps the full history and is not going
anywhere.

**The names.** The repository and the plugin are `cc-gh-bridge`. The command is `ccgh`,
because it appears in all eight skills and gets typed every day, and `cc-gh-bridge scaffold
task <reference> <slug>` is too long to be typed correctly.

## Not settled here

**The domain map.** This repository will hold more than one domain — the engine, the plugin
shell, the site, the bridge, and the workflow itself with the eight decisions it inherits.
Only `engine` is created now. Creating a domain is a decision, and making four of them in
advance for iterations nobody has specified would be four guesses.

**Publishing the command to npm.** The GitHub Actions workflows run the bridge, and in a
consuming repository they will need it without the plugin being installed. Publishing `ccgh`
to npm alongside the plugin is the obvious answer — one codebase, two channels — and it
belongs to the iteration that builds the workflows, not to this one.

**Whether the marketplace is public.** It has to be reachable for `claude plugin install` to
work, which constrains how private this repository can stay. The question arrives with the
marketplace, not before.

**The test runner.** The tests being moved are written for Vitest, and Bun has its own runner
built in. Dropping Vitest would remove a dependency; the migration is mostly rewriting
imports. It is decided in this iteration's specification rather than here, because it is a
detail of how the engine is moved rather than a reason for moving it.
