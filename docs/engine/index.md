---
title: Engine
summary: The content model, the scaffold, the promotion script and the checks, behind one command that any repository can run.
---

The engine is everything the workflow knows that has nothing to do with Claude Code or with
GitHub: what a specification looks like, what a task must contain, which names are legal,
which relations may exist, and what a promotion is allowed to change. It is the part that
would still be true if the plugin and the bridge were both thrown away.

It reaches a repository as `ccgh`, an executable on the Bash tool's PATH. `ccgh validate`
reports every problem in a content tree at once. `ccgh scaffold` writes the skeletons.
`ccgh promote` moves a specification between the four statuses and refuses to do it without
a human. `ccgh require-a-home` refuses a change that belongs to no iteration and no fix.

One thing is decided here and nowhere else: where a repository's content lives. The engine
resolves it from the project directory rather than from its own location, which is what makes
the same command work in a repository it has never seen.
