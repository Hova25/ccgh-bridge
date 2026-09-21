---
title: See a commit behind a wrapper or on a line of its own
date: 2026-09-21
issue: null
pr: null
---

# See a commit behind a wrapper or on a line of its own

The five commit hooks recognise a commit by one pattern, which required `git` to open the
command or to follow `;`, `&` or `|`. A session told to prefix every command with `rtk`, the
token filter, wrote `rtk git commit`, and no hook saw it: in a consumer repository, a commit
made while `main` was checked out went through, then a second one carrying code with no
iteration or fix. The same held for `env VAR=x git commit`, `command git commit`, and for a
commit written on its own line after a heredoc, since `^` only matched the start of the whole
command. Every such commit skipped every rule.

The pattern now also starts a command after a newline, `(` or `{`, lets it pass through
`rtk`, `env`, `command`, `exec`, `sudo`, `nice`, `time` and leading variable assignments, and
accepts `git.exe`. A `cd` is followed across the same separators, so the directory a wrapped
commit is judged from is still the one it runs in. A command that only mentions a commit inside
quotes, such as `echo 'rtk git commit'`, is still not taken for one.
