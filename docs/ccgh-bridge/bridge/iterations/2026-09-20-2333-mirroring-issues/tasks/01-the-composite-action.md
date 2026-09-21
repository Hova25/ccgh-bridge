---
title: The composite action
order: 1
issue: 34
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The composite action

Prove that a workflow can reach `ccgh` without cloning anything, with no bridge behind it yet.
The action installs Bun, installs this repository's dependencies where GitHub put it, and runs
one command. A workflow in this repository calls it by path, so it is exercised on every pull
request before any tag exists.

If a composite action cannot do this — install its own dependencies and run a Bun shebang on a
runner — the iteration changes shape here rather than at task 9.

**Files**

- Create: `action.yml`
- Create: `.github/workflows/ccgh-action.yml`
- Test: `tests/action.test.ts`

**Interfaces**

- Consumes: `bin/ccgh` and `bun.lock`, both already committed.
- Produces: the action, addressed as `./` in this repository and `<owner>/<repo>@<ref>` elsewhere. Task 9 writes the workflows that use it; nothing else depends on it.

- [x] **Write the failing test**

What can be asserted without a runner is that the action and the workflows agree about what
exists. `tests/action.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

describe("the composite action", () => {
  it("is composite, because a Docker action would rebuild an image on every run", async () => {
    const action = await readFile(join(root, "action.yml"), "utf8");

    expect(action).toMatch(/using:\s*["']?composite/);
  });

  it("installs where GitHub put it, not where the workflow is running", async () => {
    const action = await readFile(join(root, "action.yml"), "utf8");

    expect(action).toContain("github.action_path");
    expect(action).toContain("--frozen-lockfile");
  });

  it("is exercised by this repository through a path rather than a tag", async () => {
    const workflow = await readFile(join(root, ".github/workflows/ccgh-action.yml"), "utf8");

    expect(workflow).toContain("uses: ./");
    expect(workflow).not.toMatch(/uses:\s*[\w-]+\/ccgh-bridge@/);
  });
});
```

The third is the one that matters. A tag cannot test the commit that changes the action, so
this repository must never reach its own action by one.

- [x] **Run it to verify it fails**

```bash
bun test tests/action.test.ts
```

- [x] **Write the implementation**

`action.yml` as the specification gives it, with one input, `command`, and one output: whatever
`ccgh` printed. `bun install --frozen-lockfile` runs with `working-directory:
${{ github.action_path }}`, which is where GitHub unpacked the action — not the consumer's
checkout, which may not be a JavaScript project at all.

`.github/workflows/ccgh-action.yml` checks out, then:

```yaml
- uses: ./
  with:
    command: --help
```

`--help` because there is no bridge yet and the point is that the command runs at all.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

Then push the branch and read the run. This cannot be proved locally: the acceptance criterion
is a green job on GitHub whose log shows Bun installed, the dependencies resolved from the
committed lockfile, and `ccgh` printing its usage.

Then prove the other address. From a scratch repository with a workflow that says
`uses: Hova25/ccgh-bridge@<this branch>`, the same job must pass. Both paths are the same file
and only one of them is exercised by this repository's own pull requests.

- [x] **Commit**
