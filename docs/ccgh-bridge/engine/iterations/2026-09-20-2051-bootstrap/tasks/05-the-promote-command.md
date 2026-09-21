---
title: The promote command
order: 5
issue: 62
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The promote command

Move the promotion behind `ccgh promote`: the script that alone may write `status`, that
refuses an illegal transition, that refuses to launch an iteration whose dependencies have
not shipped, and that stamps `validated_by` and `launched_by` with whoever ran it.

Everything in `planPromotion` is already pure and already takes its content as an argument.
What moves is the entry point, and what changes is the root it writes into.

One property of this command is not in its code and must survive the move: **it is the human
gate**. A hook cannot tell a status change a human asked for from one the assistant decided
on, so the assistant is forbidden from writing `status` at all and this command is kept out
of the permission allowlist, which makes every invocation raise an approval prompt. Nothing
here enforces that — the plugin's settings do, in the next iteration. Write it down in the
commit message so that the iteration that writes those settings knows it inherits an
obligation.

**Files**

- Modify: `src/commands/promote.ts` — replace the stub from task 3
- Test: `src/commands/promote.test.ts`

**Interfaces**

- Consumes: `contentRoot` from `src/project.ts` (task 1); `loadContent` and `validate` from `src/model/` (task 2); the `run` contract from task 3.
- Produces: `type Target = "ready" | "active"`, `type PromotionPlan`, `const planPromotion` and `const applyPromotion`, all exported. The plugin's `/validate-iteration` and `/launch-iteration` skills call `ccgh promote <reference> --to ready|active [--dry-run]` and read its stdout; the two-step shape — a dry run whose output is shown to the human, then the real invocation — is a property of those skills, not of this command, and this command must keep making it possible.

- [ ] **Write the failing test**

Copy the origin's `promote-iteration.test.ts` to `src/commands/promote.test.ts`, with the two
mechanical changes only. It already covers the legal transitions, the relaunch case, the
missing iteration, the iteration with no task, and the unshipped dependency.

Add the two cases the origin could not express, because its root was a constant:

```ts
describe("ccgh promote", () => {
  it("writes into the repository it was run in", async () => {
    expect(await run({ argv: ["engine/2026-01-01-0900-probe", "--to", "ready"], cwd: root })).toBe(0);

    const written = await readFile(
      join(root, "docs/engine/iterations/2026-01-01-0900-probe/spec.md"),
      "utf8",
    );

    expect(written).toContain("status: ready");
    expect(written).toContain("validated_by:");
  });

  it("writes nothing on a dry run", async () => {
    const before = await readFile(
      join(root, "docs/engine/iterations/2026-01-01-0900-probe/spec.md"),
      "utf8",
    );

    expect(
      await run({
        argv: ["engine/2026-01-01-0900-probe", "--to", "ready", "--dry-run"],
        cwd: root,
      }),
    ).toBe(0);

    expect(
      await readFile(join(root, "docs/engine/iterations/2026-01-01-0900-probe/spec.md"), "utf8"),
    ).toBe(before);
  });

  it("refuses a target that is not a status it may write", async () => {
    expect(
      await run({ argv: ["engine/2026-01-01-0900-probe", "--to", "shipped"], cwd: root }),
    ).toBe(1);
  });
});
```

The third one guards something easy to lose in a move: `shipped` belongs to the GitHub
bridge, and this command must refuse to write it even when asked politely.

- [ ] **Run it to verify it fails**

```bash
bun test src/commands/promote.test.ts
```

- [ ] **Write the implementation**

Copy the origin's `promote-iteration.ts` into `src/commands/promote.ts`, keeping
`legalTransitions`, `planPromotion` and `applyPromotion` unchanged apart from the `.js`
extensions and the import paths now pointing at `../model/`.

Replace the trailing `if (import.meta.url === …)` block with `run`, taking the root from
`contentRoot({ from: cwd })` instead of `fileURLToPath(new URL("../src/content", import.meta.url))`,
parsing `--to` and `--dry-run` out of `argv`, and returning an exit code rather than calling
`process.exit`. Keep the output identical, line for line: the transition, the numbered task
list, then either `Dry run: nothing was written.` or the instruction to commit — the skills
show that output to a human and were written against those words.

`actor` keeps coming from the environment, as it does today.

- [ ] **Run the tests to verify they pass**

```bash
bun test
bun run typecheck
bun run lint
```

- [ ] **Commit**
