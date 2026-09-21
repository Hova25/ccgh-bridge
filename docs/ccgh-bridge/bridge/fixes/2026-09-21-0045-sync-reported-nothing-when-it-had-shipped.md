---
title: Sync reported nothing when it had shipped
date: 2026-09-21
issue: null
pr: null
---

# Sync reported nothing when it had shipped

`ccgh bridge sync` printed `0 mirrored, 0 shipped` in a run that mirrored two tasks and wrote
`status: shipped`. The writes are real — the commit is on the branch and the specification
says `shipped` — so the defect is in what it says, not in what it does.

That is worse than cosmetic. A human reading a workflow log sees a line saying nothing
happened, and the next thing they do is run it again.

Observed in the sandbox repository, from a terminal:

```
$ ccgh bridge sync --dry-run
mirror sandbox/iterations/2026-09-21-0038-proving-the-consumer-path/tasks/02-…md
mirror sandbox/iterations/2026-09-21-0038-proving-the-consumer-path/tasks/01-…md
ship sandbox/iterations/2026-09-21-0038-proving-the-consumer-path/spec.md
$ ccgh bridge sync
0 mirrored, 0 shipped          # and the branch now carries [bot] Ship …
```

The counters live inside the `apply` closure that `commitToIterationBranch` calls, and they
count what a second, fresher plan found after the checkout — `live`, not `preview`.

**And then it did not reproduce.** The same command, in this repository, on an iteration in the
same state, printed `6 mirrored, 1 shipped`. So the counters are not simply broken: they count
`live`, and `live` can legitimately be empty when something else has already done the writing —
a cancelled workflow run, or a previous sync — while `preview`, computed from `main` before the
checkout, still lists them.

That is the likely explanation and it is still a guess. What is certain is the symptom: a run
that wrote to a branch and reported nothing.

**Not repaired here**, because a defect I cannot reproduce is not one I should patch. What it
needs is the test the bridge has never had — the counters pinned against a fake client and a
temporary content root — and that test is worth more than the line it would fix, since it is
also what would have caught this from the beginning.
