---
title: Make init write the lifecycle rules into CLAUDE.md
date: 2026-09-21
issue: null
pr: 84
---

# Make init write the lifecycle rules into CLAUDE.md

`ccgh init` wrote the workflows and `ccgh.json` and nothing else, so a repository that adopted
the plugin gained its skills and its hooks but not a word telling the session how the work
moves: that iterations and fixes go through the `/ccgh:` skills, that issues and generated
fields have one writer, that work happens in worktrees and pull requests merge with `--merge`,
that every step ends by naming the next command. The hooks refuse the mistakes; nothing
explained them beforehand. Found by adopting the plugin in an existing repository, whose own
`CLAUDE.md` came out of `init` unchanged.

`init` now writes those rules into `CLAUDE.md`, between a `<!-- ccgh:begin … -->` and a
`<!-- ccgh:end -->` line. It creates the file when there is none, appends the block to one that
exists, and on a re-run replaces only the block, so the repository's own instructions around it
are never touched. That is the workflows' ownership marker adapted to a file the repository
shares: a line marks what `init` owns, rather than a manifest. A block that has lost its end
marker is refused rather than replaced to the end of the file, which would delete whatever
follows it.

The text lives in `src/templates/claude-md.md` and names the content directory from
`ccgh.json`. It carries only what holds in every consumer; conventions of a repository's own —
language, formatting, checks — stay outside the block. This repository gains a `CLAUDE.md` of
its own the same way: its specific rules by hand, then the block written by `bun bin/ccgh init
--from ./`.
