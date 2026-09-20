---
title: Plugin
summary: The shell that carries the engine into a repository — the manifest, the eight skills, the hooks that refuse what the workflow forbids, and the executable on the PATH.
---

The engine knows the content model and nothing about Claude Code. The plugin is what puts it
in front of someone: eight skills that walk a change from a brainstorm to a shipped
iteration, eight hook rules that refuse what the workflow forbids, and `ccgh` on the Bash
tool's `PATH` so every one of them can say `ccgh validate` rather than name a path.

The division is deliberate. A rule that decides whether content is valid belongs to the
engine and is tested without a repository. A rule that refuses a commit on `main` belongs
here and is tested against a tool call. When the two are confused, a workflow decision ends
up somewhere no test can reach it.

Two things are settled here and nowhere else: which skills exist, and what the assistant is
not allowed to do. A skill is the whole of how a step is performed, so a step nobody can
name has no skill; and a hook is the whole of what is forbidden, because anything merely
discouraged in prose will eventually be done.
