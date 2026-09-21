---
title: Adoption
status: draft
depends_on: []
impacts:
  - bridge
  - engine
---

# Adoption

## Problem

A repository that runs `ccgh init` cannot start working afterwards. Observed on the first
adoption outside the sandbox, a pnpm and React repository:

- `init` wrote the workflows, `ccgh.json` and the `CLAUDE.md` block, uncommitted on `main`, and
  no content directory. `/ccgh:open-fix` and `/ccgh:open-iteration` both refuse a domain that
  does not exist, and both forbid creating one, so no lifecycle command could run.
- The pull request carrying the output of `init` changes code outside any iteration or fix, so
  `require-a-home` refuses it in the validation workflow, and the commit hooks refuse it locally.
- `ccgh.json` held only `action`. The `check` and `language` keys an earlier attempt carried
  were the README's example copied verbatim.
- With no `language` key the prose hook refuses a list of French words, so in a
  French-speaking repository every edit to its French translations is refused.

## Goals

- On a repository with no content directory, `ccgh init` produces an iteration ready for
  `/ccgh:validate-iteration`, on its own branch and worktree, committed, with the clone left
  clean on `main`.
- That iteration goes through the whole lifecycle: validated, launched, its single task merged
  into the iteration branch, shipped into `main` by `/ccgh:ship-iteration`.
- Its task, configuring the repository's checks, carries a proposal built from the repository's
  scripts and package manager, and the rule a check command must follow.
- After adoption, a request for work is classified by the assistant as a fix or an iteration,
  in an existing domain or a new one it creates, announced in one line, without waiting.
- No word is refused by the prose hook unless `ccgh.json` lists it, and `init` writes the empty
  list so that a repository sees the setting it runs with.

## Non-goals

- Changing the contract of `check`, one list run with the staged files by the commit hook and
  without them by the validation workflow. The task documents that rule; a later iteration can
  separate commands that take files from commands that check the whole repository.
- Pushing anything. `init` commits locally; the push belongs to the human, at the launch.
- Adopting a repository that already has a content directory. There `init` keeps its present
  behaviour.
- Removing the approval GitHub asks for before running workflows on the bridge's commits.

## Contract

### `ccgh init`, adoption mode

Adoption mode applies when the content directory, `contentRoot`, does not exist. Otherwise
`init` behaves exactly as today and touches no branch.

Before writing anything, `init` refuses, exiting 1 with a message naming the cause, when:

- the repository has no commit;
- the checked-out branch of the clone is not `main`;
- `git status --porcelain` reports anything;
- the branch `ccgh/<yyyy-mm-dd-HHMM>-adopt-ccgh` or the directory
  `../worktrees/ccgh-<yyyy-mm-dd-HHMM>-adopt-ccgh` already exists.

The date is the UTC clock to the minute, as for every scaffold. Then, in order:

1. `git worktree add ../worktrees/ccgh-<date>-adopt-ccgh -b ccgh/<date>-adopt-ccgh main`,
   creating `../worktrees/` when it is missing.
2. In the worktree: the workflows, `ccgh.json`, the `CLAUDE.md` block, exactly as the normal
   mode writes them, then the content below.
3. `git add -A` and one commit, `Adopt ccgh`, in the worktree.
4. It prints the worktree path, the reference `ccgh/<date>-adopt-ccgh` and, on its own line,
   `/ccgh:validate-iteration ccgh/<date>-adopt-ccgh`.

When a step after the first fails, `init` removes the worktree and deletes the branch it
created, then exits 1 with the cause, leaving the repository as it found it.

The content written under the content directory:

```
<content>/ccgh/index.md
<content>/ccgh/iterations/<date>-adopt-ccgh/brainstorm.md
<content>/ccgh/iterations/<date>-adopt-ccgh/spec.md
<content>/ccgh/iterations/<date>-adopt-ccgh/tasks/01-configure-the-checks.md
```

Each is written from a template under `src/templates/adoption/`, in prose, with no placeholder
left in angle brackets. The specification is `status: draft`; the task carries `issue: null`
and the null `github:` block, as the task scaffold writes them. All of it passes
`ccgh validate`.

The task holds a proposal of `check` commands: for each script among `lint`, `format:check`,
`typecheck`, `test`, `check` and `verify` that `package.json` defines, the command running it
with the package manager the lockfile names (`bun run`, `pnpm`, `yarn`, `npm run`), and none
without `package.json`. It states the rule: the commit hook appends the staged files to each
command, so a command that refuses file arguments, such as `tsc -p`, fails every commit. Its
work is to fill `check` in `ccgh.json` and re-run `ccgh init` to regenerate
`ccgh-validate.yml`. Nothing is written into `check` by `init`.

### `ccgh.json`

`init`, in both modes, adds `"language": { "refuse": [] }` when `ccgh.json` has no `language`
key, and never changes one that exists. It rewrites the file only when it has something to add,
as it already does for `action`.

The prose hook refuses nothing when `language` is absent. The built-in French list is removed.

### `ccgh scaffold domain <name>`

Writes `<content>/<name>/index.md` with a `title` derived from the name and a `summary` line to
be completed, prints the path, and refuses a name that is not a slug or a domain that exists.
It creates the content directory when it is missing.

`ccgh scaffold iteration <domain>/<slug> --at <yyyy-mm-dd-HHMM>` uses the given prefix instead
of reading the clock, and refuses a prefix of another shape or an iteration that already
exists. The skill `open-iteration` scaffolded in the clone before its worktree existed, because
the reference is only known once the prefix is; it now reads the prefix with
`date -u +%Y-%m-%d-%H%M`, creates the worktree, and scaffolds inside it with `--at`, so that a
new domain and the iteration land in the same branch.

### Classification after adoption

The `CLAUDE.md` block and the skills `open-fix` and `open-iteration` say:

- A request that changes one or two files and takes no decision is a fix; any other is an
  iteration.
- The domain is the existing one that owns the code the work touches. When none does, the
  assistant creates one with `ccgh scaffold domain <name>`, in the worktree of the work, so the
  new domain travels in the same pull request.
- The assistant states the classification and the domain in one line, then proceeds.

The sentences forbidding the creation of a domain are removed from both skills.

## Failure modes

- **Dirty clone, wrong branch, no commit, or taken names.** Refused before anything is written,
  naming the cause.
- **A failure after the worktree exists**, a template that cannot be read, a commit refused
  because git has no identity: the worktree and the branch are removed, and the cause is
  printed.
- **`init` run from inside a worktree.** The checked-out branch is not `main`, so it is refused.
- **A repository without `package.json`.** The task proposes no command and says so; the task
  is still the place where the checks are chosen.
- **A content directory configured in `ccgh.json` but missing.** Adoption mode applies and
  writes into the configured directory, since `contentRoot` resolves it.
- **An assistant that misclassifies a request.** The classification is visible in its first
  line and in the pull request, where the human can refuse it.

## Risks

- `init` gains git side effects. A user who expected it to only write files finds a new branch
  and worktree; the output says where, and the preconditions keep it from touching a clone with
  work in progress.
- The adoption needs two human gates before the first merge. That is deliberate, and it is
  slower than a direct pull request.
- The classification is guidance in prose, followed by a model; nothing enforces the choice of
  fix or iteration, and a domain created in error has to be refused in review.
- Removing the French default drops the guard this repository relied on. Accepted.

## Open questions

None blocking.
