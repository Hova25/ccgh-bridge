---
title: What the sandbox revealed
order: 5
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# What the sandbox revealed

Repair what tasks 3 and 4 found, and write down what they found even where nothing needs
repairing.

This task cannot be specified in advance, and saying so is more honest than inventing a list.
What can be specified is its shape: every defect gets a failing test here before it gets a
fix, and every surprise that is not a defect gets a sentence in this file, because "we noticed
and decided it was fine" is worth keeping and disappears otherwise.

**Files**

- Modify: whatever the sandbox proved wrong.
- Test: a failing test per defect, in the module that owns it.
- Modify: this file — the list, written as the defects are found.

**Interfaces**

- Consumes: the transcripts from tasks 3 and 4.
- Produces: a consumer path that works. Task 6 records it.

- [ ] **Write the failing test**

One per defect, in the module that owns it, before the fix. A defect found by running something
is exactly the kind that hides again: it was invisible to four iterations of tests, so the test
that names it is the deliverable, not the patch.

If the sandbox found nothing, say that here in one line and leave the checkbox ticked with
nothing behind it. An empty repair list after a real trial is a result.

- [ ] **Run it to verify it fails**

```bash
bun test
```

- [ ] **Write the implementation**

The smallest change that makes each test pass. Resist widening: the sandbox is a sample of one
machine and one account, and a defect it found is evidence about that path, not licence to
redesign.

Anything too large to be a fix here becomes a fix record or its own iteration, named in this
file rather than started quietly.

- [ ] **Run the tests to verify they pass**

```bash
bun run verify
```

Then repeat the part of tasks 3 and 4 that failed, in the sandbox, against the moved `v1`.
A repair that has not been re-run on the path that broke is a repair nobody has seen work.

- [ ] **Commit**
