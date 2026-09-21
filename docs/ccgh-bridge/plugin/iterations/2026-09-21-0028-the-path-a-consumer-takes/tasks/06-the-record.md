---
title: The record
order: 6
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The record

Say what is true now, in the two places anyone looks: the README, and a decision record about
the repository this was extracted from.

The README has said "nothing is published yet" since the extraction started. After task 1 that
is false, and a README that is false about installation is worse than one that says nothing.

The decision record is the one piece of writing this project has deferred five times. The
origin still runs its own copy of everything here, and every iteration has ended with
"migrating the origin is its own decision" — which is true, and has never been written down as
a decision with a shape.

**Files**

- Modify: `README.md`
- Create: `docs/ccgh-bridge/plugin/decisions/001-what-happens-to-the-repository-this-came-from.md`
- Test: `tests/plugin.test.ts` — the README does not promise the absent

**Interfaces**

- Consumes: everything tasks 1 to 5 produced.
- Produces: nothing. The iteration ends here.

- [x] **Write the failing test**

The assertion that would have caught the README drifting, which it has done twice:

```ts
it("does not say something is unpublished once it is", async () => {
  const readme = await readFile(join(root, "README.md"), "utf8");

  expect(readme).not.toMatch(/nothing is installable|not published yet|does not exist/i);
});
```

- [x] **Run it to verify it fails**

```bash
bun test tests/plugin.test.ts
```

- [x] **Write the implementation**

The README gains the install line that now works, the published site's URL, and the release
procedure from task 1. It loses the sentence about `v1` not existing.

The decision record states the choice and what it costs, in the form the schema demands —
`status: accepted`, and a body that says what was decided, what was rejected, and what the
decision leaves open. The three options are: migrate the origin onto the plugin and delete its
copy; leave it and let the copies diverge; or leave it and schedule the migration with a
trigger. What the sandbox cost is now known, so the estimate in it is evidence rather than a
guess.

Write the decision that is actually true, not the tidy one. If the answer is "not now, and
here is what will make it urgent", that is a decision and it belongs on the record.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

- [x] **Commit**
