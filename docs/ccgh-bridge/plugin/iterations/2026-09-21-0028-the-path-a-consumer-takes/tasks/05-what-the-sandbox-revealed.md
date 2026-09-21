---
title: What the sandbox revealed
order: 5
issue: 79
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

**What the sandbox found**

*A repository that has just run `ccgh init` has a red build.* Its first push fails, because
`ccgh validate` refused a repository with no content directory — which is every repository
that has just started. It now accepts that and says what to write; it still refuses a content
directory that `ccgh.json` named and that is not there, because that is a typo rather than a
beginning.

*The sync fires before the merge it reacts to is visible.* Closing an issue and landing the
merge are the same instant, and the workflow that reads `main` can read it without the merge.
It fired, found nothing, and nothing retried it until the nightly reconcile. `ccgh-sync` now
also fires on a push to `main`, which makes the second attempt certain.

*Sync reported `0 mirrored, 0 shipped` in a run that shipped.* Recorded as a fix rather than
repaired: reading the code did not settle the cause, and the test that would pin it — the
counters against a fake client — is exactly the test the bridge does not have.

**What worked, which is worth as much**

The plugin installed from the marketplace by name and brought its dependencies. `ccgh`
answered in a session that had never cloned this repository, and refused by naming the
sandbox's own path rather than the plugin's. The action resolved from `@v1` on a runner. The
bridge created one issue per task, wrote their numbers back onto the branch, and supplied its
own token — the sandbox configured nothing for it.

- [x] **Write the failing test**

One per defect, in the module that owns it, before the fix. A defect found by running something
is exactly the kind that hides again: it was invisible to four iterations of tests, so the test
that names it is the deliverable, not the patch.

If the sandbox found nothing, say that here in one line and leave the checkbox ticked with
nothing behind it. An empty repair list after a real trial is a result.

- [x] **Run it to verify it fails**

```bash
bun test
```

- [x] **Write the implementation**

The smallest change that makes each test pass. Resist widening: the sandbox is a sample of one
machine and one account, and a defect it found is evidence about that path, not licence to
redesign.

Anything too large to be a fix here becomes a fix record or its own iteration, named in this
file rather than started quietly.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

Then repeat the part of tasks 3 and 4 that failed, in the sandbox, against the moved `v1`.
A repair that has not been re-run on the path that broke is a repair nobody has seen work.

- [x] **Commit**
