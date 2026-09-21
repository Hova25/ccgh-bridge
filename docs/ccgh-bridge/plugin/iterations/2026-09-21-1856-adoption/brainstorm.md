---
title: Adoption
date: 2026-09-21
participants:
  - hovannes
  - claude
---

# Adoption

## What prompted this

The first real adoption outside the sandbox, a pnpm and React repository, stalled right after
`ccgh init`. The command wrote five workflows, `ccgh.json` and the `CLAUDE.md` block, all left
uncommitted on `main`, and nothing else. There was no content directory, so `/ccgh:open-fix`
and `/ccgh:open-iteration` both refused to start: each checks that its domain exists, and both
say that creating a domain is not theirs to do. The pull request carrying the output of `init`
changed code and belonged to no iteration or fix, so `require-a-home` would refuse it. The
session was left improvising a `chore/` branch, which the lifecycle has no place for.

Three more things surfaced on the way. `ccgh.json` came out holding only `action`, and the
`check` and `language` keys a previous attempt had carried were the README's example copied
verbatim, not something `init` inferred. The language hook refuses French by default, which in
a French-speaking repository refuses every edit to its French translations. And inferring
`check` from `package.json` is not safe as it stands: the commit hook appends the staged files
to every check command, and `tsc -p tsconfig.json src/a.tsx` fails on every commit.

## What was considered

**What `init` creates.** The content directory, since nothing works without one, but the
question was what it holds.

A real first cycle was chosen: `init` writes a domain named `ccgh` and in it an iteration,
`adopt-ccgh`, with its brainstorm, specification and one task already written. The human
validates and launches it like any other, the task becomes an issue, the pull request closes
it, and the iteration ships. The repository's first act under the lifecycle is the lifecycle
itself, gates included; that is heavier than any alternative, two human gates before the first
merge, and was taken for exactly that reason.

An iteration used only as an anchor, so that the adoption pull request has a home, was
rejected: it would stay `draft` forever, never launched nor shipped, a false "in progress" in
the tree and on the site. A fix record instead of an iteration was rejected too, although a fix
is the lighter tool for committing code with its record; the adoption was wanted as a full
cycle rather than as a repair.

**Who does the git work.** A launch creates its issues through `ccgh-push`, which runs on a
push to the iteration branch, and GitHub runs the workflows found in the pushed branch. The
output of `init` therefore has to be committed on the iteration branch before the launch.

`init` does it: it creates the branch and its worktree beside the clone, writes everything
there, and commits. The clone stays clean on `main`, and the outcome is the same whichever
model, or none, runs the command. The trade-off is that `init` now has git side effects, and
must refuse when the clone is not clean or not on `main`.

Leaving the files where `init` writes them today and telling the assistant, through
`CLAUDE.md`, to carry them into a worktree was rejected: moving uncommitted files off `main`
into a worktree is precisely the step that went wrong in that adoption. A separate `ccgh adopt`
command was rejected as one more thing to remember for no gain in safety.

Adoption only happens once. When the content directory already exists, `init` keeps its
present behaviour: it regenerates the workflows and the `CLAUDE.md` block and touches no
branch. This repository runs `ccgh init --from ./` for exactly that.

**What the task is.** Everything `init` writes is on the iteration branch before the launch,
so the task needs a change of its own. Configuring the repository's checks was chosen: `init`
reads the scripts in `package.json` and the lockfile and writes a proposal into the task, never
into `ccgh.json`, together with the rule a check command must follow, since it receives the
staged files as arguments. Choosing the commands is a decision specific to each repository, and
it is taken by a human in a pull request.

Describing the repository's domains was rejected as a task: it is content, and content needs no
task. Doing both in two tasks was rejected as two pull requests before adoption is over.

**How work is classified afterwards.** Once adopted, a request for work is classified by the
assistant: a change to one or two files with no decision in it is a fix, anything else an
iteration. The domain is chosen among the existing ones from the code the work touches, or
created when none fits, by a new `ccgh scaffold domain <name>` that writes its `index.md`. The
assistant announces the classification in one line and goes on without waiting.

Waiting for approval only when a domain is created was considered, since a domain shapes the
site's URLs and the issue labels for good. It was rejected because the new domain travels in
the same branch as the work, and is seen and can be refused where every other change is: in
the pull request. Asking every time was rejected as the friction this iteration exists to
remove.

**The refused language.** The prose hook refuses a list of French words when `ccgh.json` says
nothing, which suited the repository it grew in and no other. The default becomes no refused
word, and `init` writes `"language": { "refuse": [] }` into `ccgh.json` when the key is absent,
so a repository sees the setting it runs with. This repository loses its own French guard in
the process, which was judged acceptable rather than carried as an explicit list.

## Not settled here

The contract of `check` stays as it is: one list of commands, run with the staged files as
arguments by the commit hook and without them by the validation workflow. Separating the
commands that take files from those that check the whole repository is the real fix for
scripts such as `tsc -p`, and it deserves its own iteration; this one only documents the
current rule where a human chooses the commands.

The approval button GitHub shows before running workflows on the bridge's own commits, and the
GitHub App token that would remove it, are left to their own iteration.

Nothing here writes the GitHub releases of versions published before the release workflow.
