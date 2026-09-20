---
title: Planning and applying
order: 3
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# Planning and applying

What the bridge would do, separated from doing it. `plan` compares the content tree against
what GitHub reports and returns a list of actions — create this issue, update that one, report
this divergence. `apply` carries them out.

That separation is the reason `--dry-run` is possible at all, and it is why every later task
can be tested without a network: a plan is a value.

**Files**

- Create: `src/bridge/plan.ts`, `src/bridge/apply.ts`
- Test: `src/bridge/plan.test.ts`, `src/bridge/apply.test.ts`

**Interfaces**

- Consumes: `renderIssue` and `fileFromMarker` from task 2, `GitHubClient` from task 2, and `ParsedEntry`.
- Produces: `planActions({ entries, remote, url }): Action[]`, `missingIssueNumbers({ entries, remote })`, `applyActions({ actions, client }): ApplyResult`, `formatDivergence(...)`, and the types `RemoteIssue`, `RemoteState`, `Action`. Tasks 4, 7 and 8 use them.

- [x] **Write the failing test**

Both tests come with the code, and they are the largest pair in the bridge. Copy
`plan.test.ts` and `apply.test.ts` with the two mechanical changes.

They already cover what matters: a task with no issue is created, a task whose issue exists and
whose body changed is updated, a task whose `issue` disagrees with the marker in the body is
**reported rather than corrected**, and an issue that exists for a file no longer in the tree
is left alone.

Add the one the move makes possible:

```ts
it("reports a divergence rather than deciding which side is right", () => {
  const actions = planActions({
    entries: [taskWith({ issue: 7 })],
    remote: { issues: [issueFor({ file: "engine/…/01-a.md", number: 9 })] },
    url: () => "https://example.test",
  });

  expect(actions.filter((action) => action.kind === "report")).toHaveLength(1);
  expect(actions.some((action) => action.kind === "update")).toBe(false);
});
```

Guessing which of two numbers is right is how a mirror corrupts both sides.

- [x] **Run it to verify it fails**

```bash
bun test src/bridge
```

- [x] **Write the implementation**

Copy `plan.ts` and `apply.ts` from the origin, imports only. No logic moves: the planner is the
piece with the most edge cases in the whole bridge and the tests arriving green is the
acceptance criterion.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

- [x] **Commit**
