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
count what a second, fresher plan found after the checkout — `live`, not `preview`. Somewhere
between the two the count is lost. Reading the code did not settle which, and guessing at a
cause is how a reporting defect becomes a logic one.

**Not repaired here.** It is written down with its reproduction because the run that found it
was a one-off trial in another repository, and the next person to see this line deserves to
know it is known. The repair belongs with a test that pins the counters against a fake client
and a temporary content root — which is a test the bridge does not have, and the reason the
defect survived every other one.
