## The ccgh lifecycle

This repository develops itself through the ccgh plugin. Its specifications, brainstorms,
decisions, tasks and fixes live in `__CONTENT__/`, grouped by domain and iteration, and their
shape is enforced by `ccgh validate`. Decision records under `<domain>/decisions/` carry the
reasoning behind anything surprising, and `<domain>/fixes/` records every repair and why it was
needed: read the ones for the domain you are touching before changing it.

An iteration is scaffolded with `/ccgh:open-iteration <domain>/<slug>`, recorded with
`/ccgh:write-brainstorm` and `/ccgh:write-spec`, broken into tasks with
`/ccgh:decompose-into-tasks`, validated with `/ccgh:validate-iteration <domain>/<iteration>`
and launched with `/ccgh:launch-iteration <domain>/<iteration>`. When every task is merged it
is shipped with `/ccgh:ship-iteration <domain>/<iteration>`, which opens the pull request into
`main` carrying a `Closes` line for every task. A change too small to specify is a fix, opened
with `/ccgh:open-fix <domain>/<slug>` and committed together with the code it records.

Validation and launch are human gates: those two skills cannot be invoked by the model, only
typed by a human.

Issues are created by the bridge, never by hand, and closed by the merge into `main`, never by
hand either. Never write `status`, `issue`, `pr`, `validated_by`, `launched_by` or anything
under `github:`. `status` is written by the promotion script, which requires human approval;
the rest is written by the GitHub bridge.

Code that reaches `main` belonging to neither an iteration nor a fix is refused, by a hook
locally and by the validation workflow in CI.

### Git

Isolation comes from git worktrees. One worktree per iteration and per fix, task branches
inside their iteration's worktree, every worktree in `../worktrees/` next to the clone and
named after its branch with slashes turned into dashes, removed once its pull request is
merged. The clone itself stays on `main`. The lifecycle skills create the worktree.

Never commit directly to `main`, and never commit files belonging to two different iterations.

Merge every pull request with `gh pr merge --merge`. Never squash and never rebase-merge: both
rewrite commits, which forces every branch stacked on the merged one to be rebased, and both
collapse the step-by-step history a task's commits record.

### Decisions

Notify before acting, never after, when a change: adds a dependency, alters a public contract,
chooses between approaches the specification did not cover, reaches outside the scope of the
task, modifies `.claude/` or `CLAUDE.md`, or deletes or disables a test.

### Handing back

End every step of the workflow by naming the next action as the command to type, on its own
line. `/ccgh:launch-iteration <reference>`, not "the iteration then has to be launched".

The lifecycle has several human gates — validation, launch, merging a pull request — and the
state after each one cannot be read off the output. A report that says what happened without
saying what comes next leaves the reader guessing which gate they are standing at. When nothing
is required, say that too.
