---
title: The scaffold command
order: 4
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The scaffold command

Replace the stub with the real scaffold: `ccgh scaffold iteration`, `ccgh scaffold fix` and
`ccgh scaffold task`, writing the skeletons that a brainstorm, a specification and a task are
filled into. The pure part — turning a slug and a clock into a set of files — moves
unchanged; only the part that decided where to write them is replaced.

The clock stays the scaffold's own, `new Date().toISOString()` to the minute in UTC, never a
value a caller passes in production. One clock means one order, and names that sort by
creation everywhere they are listed.

**Files**

- Modify: `src/commands/scaffold.ts` — replace the stub from task 3
- Test: `src/commands/scaffold.test.ts`

**Interfaces**

- Consumes: `contentRoot` from `src/project.ts` (task 1); `SLUG` from `src/model/schemas` (task 2); the `run` contract declared in task 3.
- Produces: `const iterationScaffold`, `const fixScaffold`, `const taskScaffold` and `const iterationName`, all exported and all pure — they take `now` and return `{ reference, files }` without touching the file system, which is what makes them testable without a temporary directory. `run` is the only part that writes.

- [ ] **Write the failing test**

The pure tests come with the code: copy the origin's `scaffold.test.ts` to
`src/commands/scaffold.test.ts`, changing only the `vitest` import to `bun:test` and dropping
the `.js` from relative imports. It already covers the dated prefix,
the suffix on a collision within the same minute, the refusal of a slug that is not a slug,
and the shape of each skeleton.

Then add what the origin could not test, because its root was a constant. Append:

```ts
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach } from "bun:test";
import { run } from "./scaffold";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ccgh-scaffold-"));
  await mkdir(join(root, ".git"));
  await mkdir(join(root, "docs", "engine"), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("ccgh scaffold", () => {
  it("writes into the repository it was run in", async () => {
    expect(await run({ argv: ["iteration", "engine/probe"], cwd: root })).toBe(0);

    const written = await readdir(join(root, "docs", "engine", "iterations"));

    expect(written).toHaveLength(1);
    expect(written[0]).toMatch(/^\d{4}-\d{2}-\d{2}-\d{4}-probe$/);
  });

  it("refuses to overwrite a skeleton that already exists", async () => {
    await run({ argv: ["iteration", "engine/probe"], cwd: root });

    expect(await run({ argv: ["iteration", "engine/probe"], cwd: root })).toBe(1);
  });

  it("numbers a task from the count already in the directory", async () => {
    await run({ argv: ["iteration", "engine/probe"], cwd: root });
    const [iteration] = await readdir(join(root, "docs", "engine", "iterations"));

    await run({ argv: ["task", `engine/${iteration}`, "first"], cwd: root });
    await run({ argv: ["task", `engine/${iteration}`, "second"], cwd: root });

    const tasks = await readdir(join(root, "docs", "engine", "iterations", iteration, "tasks"));

    expect(tasks.sort()).toEqual(["01-first.md", "02-second.md"]);
  });

  it("refuses an unknown kind rather than guessing", async () => {
    expect(await run({ argv: ["nonsense", "engine/probe"], cwd: root })).toBe(1);
  });
});
```

The second test is the one worth having: refusing to overwrite is the only thing standing
between a re-run and a specification someone had already written.

- [ ] **Run it to verify it fails**

```bash
bun test src/commands/scaffold.test.ts
```

- [ ] **Write the implementation**

Copy the origin's `scaffold.ts` into `src/commands/scaffold.ts`, keeping `prefixAt`,
`iterationName`, `iterationScaffold`, `fixScaffold`, `taskScaffold`, `write`,
`existingIterations` and `nextOrder` as they are,
with the two mechanical changes — the `.js` extensions and the import of `SLUG` now coming
from `../model/schemas`.

Then replace the trailing `if (import.meta.url === …)` block, which read `process.argv`
directly and computed `contentRoot` from its own file location, with the `run` contract:

```ts
export const run = async ({
  argv,
  cwd,
}: {
  argv: string[];
  cwd: string;
}): Promise<number> => {
  const root = contentRoot({ from: cwd });
  const [kind, target, slug] = argv;
  const now = new Date();

  try {
    if (kind === "iteration" && target) {
      const [domain = "", name = ""] = target.split("/");
      const plan = iterationScaffold({
        domain,
        slug: name,
        now,
        taken: await existingIterations({ root, domain }),
        author: process.env.USER ?? "unknown",
      });

      await write({ root, files: plan.files });
      process.stdout.write(`\n${plan.reference}\n`);

      return 0;
    }

    if (kind === "fix" && target) {
      const [domain = "", name = ""] = target.split("/");
      const plan = fixScaffold({ domain, slug: name, now });

      await write({ root, files: plan.files });
      process.stdout.write(`\n${plan.reference}\n`);

      return 0;
    }

    if (kind === "task" && target && slug) {
      const order = await nextOrder({ root, reference: target });

      await write({ root, files: [taskScaffold({ reference: target, slug, order })] });

      return 0;
    }
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);

    return 1;
  }

  process.stderr.write(
    [
      "usage:",
      "  ccgh scaffold iteration <domain>/<slug>",
      "  ccgh scaffold fix <domain>/<slug>",
      "  ccgh scaffold task <domain>/<iteration> <slug>",
      "",
    ].join("\n"),
  );

  return 1;
};
```

`write`, `existingIterations` and `nextOrder` each gain a `root` parameter where they read
the module-level constant today. That constant is the last of the four hardcoded roots the
specification names, and it goes with this task.

`author` falls back to `"unknown"` rather than to a person's name, which is what the origin
did: a default naming one particular human has no business in a tool meant for other
repositories.

- [ ] **Run the tests to verify they pass**

```bash
bun test
bun run typecheck
bun run lint
```

Then scaffold something real in this repository and delete it again:

```bash
./bin/ccgh scaffold iteration engine/probe
./bin/ccgh validate
```

- [ ] **Commit**
