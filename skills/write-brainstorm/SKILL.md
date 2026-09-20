---
name: write-brainstorm
description: Use when a brainstorming conversation has produced decisions worth keeping, to record it as the brainstorm of an iteration before any specification is written.
---

# Writing a brainstorm

Write to the `brainstorm.md` that `ccgh scaffold iteration <domain>/<slug>` reported. The
scaffold prints the files it wrote; take the path from it rather than composing one, because
a repository decides where its content lives and a second copy of that decision will be
wrong.

Front matter: `title`, `date`, `participants`. Nothing else.

Record what was decided **and what was rejected, with the reason**. A brainstorm that lists
only the chosen option is worthless six months later: the reader cannot tell whether an
alternative was considered and dismissed, or never seen at all.

Structure the body around the decisions, not around the chronology of the conversation. Each
decision gets its own heading, states the context, the choice, and the trade-off accepted.

Close with what was deliberately deferred, so that the next reader does not mistake a
conscious omission for an oversight.

Run `ccgh validate` before finishing.

Never write `status`, `issue` or anything under `github:`. Those fields do not belong to a
brainstorm, and a hook will refuse the attempt.
