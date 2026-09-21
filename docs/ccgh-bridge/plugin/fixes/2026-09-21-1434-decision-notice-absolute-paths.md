---
title: Ask before harness edits whose path arrives absolute
date: 2026-09-21
issue: null
pr: null
---

# Ask before harness edits whose path arrives absolute

The `require-decision-notice` hook is meant to ask for confirmation before the assistant edits
the harness: `.claude/`, `.claude-plugin/`, `hooks/` or `skills/`. It compared the edited path
against those prefixes with `startsWith`, but Claude Code sends `Write` and `Edit` an absolute
path such as `C:/Users/me/project/.claude/settings.json`, which never starts with `.claude/`.
In a real session the rule therefore never asked, for any file under those directories; only
`CLAUDE.md`, matched by its ending, was caught. The tests passed relative paths, so nothing
showed it.

The rule now makes an absolute path relative to the repository root before matching, through a
new `repository` member of the hook context, answered by `repositoryRoot` in the shell. Matching
the prefixes anywhere in the path instead would have caught a consumer's `src/hooks/` on every
edit, which a test now guards against. A relative path is still matched as given.
