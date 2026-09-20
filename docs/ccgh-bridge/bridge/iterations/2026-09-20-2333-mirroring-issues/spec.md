---
title: Mirroring issues
status: ready
depends_on: []
impacts:
  - plugin
  - engine
validated_by: hovannes
validated_at: '2026-09-20T23:37:22.830Z'
---

# Mirroring issues

## Problem

`shipped` has one writer and it does not exist. Three specifications are stuck — one in `draft`
whose work shipped a day ago, two in `ready` with nothing able to move them — and every task
file carries an `issue: null` that nothing will ever fill.

The bridge exists, in the repository this was extracted from: around fourteen hundred lines in
eleven modules, with eighteen hundred lines of tests, and five GitHub Actions workflows. It is
coupled to that repository in the same place everything else was — one hardcoded content path —
and in one place nothing else was: it runs on a GitHub runner, where `ccgh` does not exist,
because `ccgh` lives inside a Claude Code plugin and a runner has no Claude Code.

This repository also still has no continuous integration, deferred three times to this
iteration. Twenty-three pull requests have merged on a local verification and one person's
word.

## Goals

A composite action in this repository, so that a consumer's workflow says `uses:` and nothing
else — no clone, no path, no install, and no knowledge of where the engine lives.

The same bridge runnable from a terminal, as `ccgh bridge <verb>`, so that it can be exercised
and debugged without pushing and reading a log.

`ccgh init`, writing five workflows into a repository and re-runnable without destroying
anything it did not write.

A `validate` workflow that is generic, running `ccgh validate`, `ccgh require-a-home` and the
commands a repository lists under `check` in `ccgh.json`.

The three stuck iterations moving, and this repository's own `main` checked by its own rules
for the first time.

## Non-goals

**Publishing `v1`.** Tagging is a deliberate act at the end. Nothing in this iteration depends
on the tag existing, which is exactly why the local path is built first.

**The published site.** The build writes `.ccgh/site`; sending it anywhere is a separate
decision, and this iteration does not make it.

**The remote marketplace.** Unchanged: installing this plugin from another repository belongs
to the iteration that publishes it.

**Migrating the origin.** Unchanged since the bootstrap.

## Contract

### The composite action

`action.yml` at the repository root:

```yaml
name: ccgh
inputs:
  command:
    required: true
runs:
  using: composite
  steps:
    - uses: oven-sh/setup-bun@v2
    - run: bun install --frozen-lockfile
      shell: bash
      working-directory: ${{ github.action_path }}
    - run: ${{ github.action_path }}/bin/ccgh bridge ${{ inputs.command }}
      shell: bash
```

Two conditions follow, and they are conditions rather than preferences. This repository must
stay public, or a consumer needs a token to fetch the action. And `bun.lock` must stay
committed, because the action installs its dependencies where GitHub puts it.

### Three ways to reach the same code

| | |
| --- | --- |
| `uses: ./` | this repository's own workflows, exercising the action before any tag exists |
| `uses: <owner>/<repo>@<ref>` | a consumer, with `ref` a tag or a branch |
| `ccgh bridge <verb>` | a terminal, with `GITHUB_TOKEN` in the environment |

`ccgh init --from <reference>` decides what a consumer's workflows put behind `uses:`, and
stores it in `ccgh.json` as `action` so that re-running `init` does not forget it. It defaults
to `Hova25/ccgh-bridge@v1`.

### What crosses, and the four couplings

The eleven modules and their tests cross unchanged. Four things move:

| Was | Becomes |
| --- | --- |
| `CONTENT_PREFIX`, a hardcoded path | `contentRoot`, relative to the repository |
| `issueUrl` → `blob/main/<that prefix>/…` | the same, resolved |
| `pnpm --filter … bridge <verb>` | `ccgh bridge <verb>` |
| the root from `import.meta.url` | `contentRoot({ from: process.cwd() })` |

### The five workflows

| Workflow | Fires on | Runs |
| --- | --- | --- |
| `ccgh-validate` | pull request, push to main | `validate`, `require-a-home`, and `check` |
| `ccgh-push` | push to an iteration branch, content changed | `bridge push` |
| `ccgh-fixes` | pull request on a `fix/` branch | `bridge fixes` |
| `ccgh-sync` | issue closed, reopened, deleted; pull request closed | `bridge complete`, then `bridge sync` |
| `ccgh-reconcile` | schedule, and on demand | `bridge reconcile` |

Each is around fifteen lines: checkout, then `uses:` the action. Everything else — Bun, the
install, the bot identity — belongs to the action.

### The six verbs

`push` creates one issue per task and writes the numbers back on the iteration branch.
`fixes` creates the issue for a fix record and adds the `Closes` line to its pull request.
`complete` labels and comments the issues a merge closed, and mirrors their completion.
`sync` mirrors issue state, and marks an iteration `shipped` when every task is closed.
`reconcile` runs `push` and `sync`, then reports what has gone stale or been abandoned.
`relink` rewrites the paths inside issue bodies after a mass rename.

Each takes `--dry-run`, and prints what it would do without touching anything.

## Failure modes

**No token.** Every verb refuses before reading anything, naming `GITHUB_TOKEN` and where to
get one. A bridge that starts and fails halfway has already written something.

**Invalid content.** `push` and `sync` validate before they plan, and refuse entirely rather
than mirroring part of a broken tree. The origin does this and it is worth keeping: a tree that
fails `ccgh validate` is a tree whose issue bodies would be wrong.

**A hand-written issue number.** The hooks already refuse it on the way in. The bridge refuses
it on the way out: a task whose `issue` disagrees with GitHub is reported rather than corrected,
because guessing which one is right is how a mirror corrupts both sides.

**`ccgh init` meeting a file it did not write.** It refuses that file, names it, and writes the
rest. A consumer with their own `validate.yml` must be told, not overwritten.

**The action fetched from a private repository.** The consumer's workflow fails at `uses:`, with
GitHub's own message. The README says the repository must be public or the token must be
supplied.

## Risks

**The first task can fail, and that is what it is for.** A composite action that installs its
own dependencies, on a runner, with Bun, referenced once by path and once by tag: every piece is
supported and the assembly is not common. It is proved with a real workflow before a line of
bridge is written.

**This is the first thing that writes to GitHub.** Everything built so far has been refusable
and reversible. An issue created by mistake is closed by hand, and a mirror written to the wrong
branch is a commit someone has to find. Tasks 2 to 7 build everything as plans that can be
printed; task 8 is the first that can create anything, deliberately, from a terminal, with a
dry run in front of it.

**This repository's `main` has never been validated.** Twenty-three pull requests merged without
CI. Task 9 asks the question for the first time and the answer may be no, which would be a good
thing discovered late rather than never.

**Two ways to reach the action must not drift.** `./` and `<owner>/<repo>@<ref>` are the same
file, but only the first is exercised by this repository's own pull requests. Task 1 proves both.

## Open questions

None blocking. Publishing `v1` and sending the built site somewhere are both deliberately left
to whoever decides this repository is ready to be installed by someone else.
