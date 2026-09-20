---
name: write-spec
description: Use when a validated brainstorm needs to become the specification of an iteration, defining the problem, the goals, the non-goals and the contract to implement.
---

# Writing a specification

Write to the `spec.md` that `ccgh scaffold iteration <domain>/<slug>` reported. The scaffold
prints the file it wrote; take the path from it rather than composing one, because a
repository decides where its content lives and a second copy of that decision will be wrong.

Front matter: `title`, `status: draft`, `depends_on`, `impacts`. Always `draft`, without
exception: a specification is promoted by `/ccgh:validate-iteration`, never by writing a
different value here.

`depends_on` lists iterations in `<domain>/<iteration>` form that must be `shipped` before
this one can be launched. `impacts` lists domains this iteration changes without owning.
Work that must ship together belongs to one iteration; do not split it across two and link
them with a dependency, which would impose an order where none exists.

Cover, each scaled to its real complexity: the problem, the goals, the explicit non-goals,
the contract or data shapes involved, the failure modes, and the open questions. State the
risks honestly, including the weaknesses of the chosen design.

Run `ccgh validate` before finishing.

Never write `issue`, `validated_by`, `launched_by` or anything under `github:`.
