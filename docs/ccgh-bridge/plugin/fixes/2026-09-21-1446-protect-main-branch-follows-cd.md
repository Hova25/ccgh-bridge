---
title: Judge a commit by the directory it runs in
date: 2026-09-21
issue: null
pr: null
---

# Judge a commit by the directory it runs in

The commit hooks asked git about the directory the hook process ran in, which is the session's,
not the one the command commits in. From a session opened in the clone, the very command the
`open-fix` skill prescribes, `cd ../worktrees/fix-<domain>-<slug> && git commit`, was refused by
`protect-main-branch` as a commit on `main`, and `require-a-home`, `enforce-iteration-isolation`
and `check-staged-files` read the clone's staged files instead of the worktree's. The reverse
failed open: `git -C <clone> commit` from anywhere was not even recognised as a commit, because
the pattern shared by those rules only allowed options written as a single word, so neither
`-C <dir>` nor `-c <key=value>` let it see the `commit` behind them.

`hooks/commit.ts` now holds the one commit pattern, which accepts `-C` and `-c` with their
value, and `commitDirectory`, which follows every `cd` before the commit and any `-C` on it,
starting from the `cwd` Claude Code sends in the hook input. `run.ts` builds the context from
that directory: `shell` became a function of it, and runs git and the configured checks there.
Git Bash spells drives as `/c/`, which is translated on Windows; a `cd` written after the
commit is ignored, and a command that commits nothing is judged from the session's directory as
before.
