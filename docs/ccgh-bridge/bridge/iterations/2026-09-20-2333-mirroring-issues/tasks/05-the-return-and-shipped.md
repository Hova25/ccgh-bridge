---
title: The return and shipped
order: 5
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The return and shipped

The direction that makes the workflow a loop rather than a broadcast. `sync` reads what GitHub
says about every issue and mirrors it back into the task files; when every task of an iteration
is closed, it writes `status: shipped` onto its specification. `completion` works out which
issues a merged pull request closed, from the `Closes` lines in its body.

This is the task that unblocks three specifications. `shipped` has exactly one writer, and this
is it.

**Files**

- Create: `src/bridge/sync.ts`, `src/bridge/completion.ts`
- Test: `src/bridge/sync.test.ts`, `src/bridge/completion.test.ts`

**Interfaces**

- Consumes: `writeMirror`, `markShipped` and `writeCompletion` from task 4; `RemoteState` from task 3.
- Produces: `planSync({ entries, remote }): SyncPlan`, `staleTasks({ entries, now, maxAgeHours })`, `closingIssues({ body })`, `completionsFor({ entries, pr, mergedAt, body })`, `completionComment({ completion, base })`. Tasks 7 and 8 use them.

- [ ] **Write the failing test**

Both come with the code. Copy them with the two mechanical changes. They already cover an
iteration whose last task closes, an iteration with one task still open, an issue reopened
after closing, and a task whose `synced_at` has gone stale.

Add the assertion this workflow's own history makes obvious and the origin never wrote:

```ts
it("refuses to ship an iteration that has no tasks at all", () => {
  const plan = planSync({ entries: [specificationWith({ status: "active", tasks: [] })], remote });

  expect(plan.ship).toEqual([]);
});
```

An iteration with no tasks has no open tasks either, and "every task is closed" is true of an
empty list. Shipping on that is a status written from nothing.

- [ ] **Run it to verify it fails**

```bash
bun test src/bridge
```

If it passes immediately, the origin already guards it — check where, and keep the test anyway
rather than deleting the question.

- [ ] **Write the implementation**

Copy `sync.ts` and `completion.ts`, imports only, plus whatever the empty-iteration assertion
requires if it was genuinely missing.

- [ ] **Run the tests to verify they pass**

```bash
bun run verify
```

- [ ] **Commit**
