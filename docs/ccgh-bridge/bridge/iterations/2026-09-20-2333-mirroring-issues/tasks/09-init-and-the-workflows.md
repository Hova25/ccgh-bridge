---
title: Init and the workflows
order: 9
issue: 42
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# Init and the workflows

`ccgh init`, the seventh subcommand, writing the five workflows a repository needs and nothing
else. It is the piece the plugin cannot be: a plugin carries skills, hooks and executables, and
it cannot carry a file in `.github/workflows/`.

Each workflow is around fifteen lines, because everything heavy belongs to the action.

**Files**

- Create: `src/commands/init.ts`
- Create: `src/workflows/*.yml` — the five templates
- Test: `src/commands/init.test.ts`
- Modify: `bin/ccgh` — the seventh subcommand
- Modify: `src/configuration.ts` — the `action` key

**Interfaces**

- Consumes: `repositoryRoot` and `configuration`.
- Produces: `run({ argv, cwd })`, and the five files in the consumer's `.github/workflows/`. Task 10 runs it here.

- [x] **Write the failing test**

```ts
describe("ccgh init", () => {
  it("writes the five workflows", async () => {
    await run({ argv: [], cwd: root });

    expect((await readdir(join(root, ".github/workflows"))).sort()).toEqual([
      "ccgh-fixes.yml",
      "ccgh-push.yml",
      "ccgh-reconcile.yml",
      "ccgh-sync.yml",
      "ccgh-validate.yml",
    ]);
  });

  it("points them at the reference it was given, and remembers it", async () => {
    await run({ argv: ["--from", "Hova25/ccgh-bridge@main"], cwd: root });

    const workflow = await readFile(join(root, ".github/workflows/ccgh-push.yml"), "utf8");

    expect(workflow).toContain("uses: Hova25/ccgh-bridge@main");
    expect(JSON.parse(await readFile(join(root, "ccgh.json"), "utf8")).action).toBe(
      "Hova25/ccgh-bridge@main",
    );
  });

  it("is re-runnable, rewriting what it wrote", async () => {
    await run({ argv: [], cwd: root });

    expect(await run({ argv: [], cwd: root })).toBe(0);
  });

  it("refuses a file it did not write, names it, and writes the rest", async () => {
    await mkdir(join(root, ".github/workflows"), { recursive: true });
    await writeFile(join(root, ".github/workflows/ccgh-push.yml"), "name: mine\n", "utf8");

    expect(await run({ argv: [], cwd: root })).toBe(1);
    expect(await readFile(join(root, ".github/workflows/ccgh-push.yml"), "utf8")).toBe(
      "name: mine\n",
    );
    expect(await readdir(join(root, ".github/workflows"))).toContain("ccgh-sync.yml");
  });
});
```

The last one is the task's reason to exist as its own task. A command that writes into someone
else's `.github/` and gets it wrong destroys work that has nothing to do with this workflow.

Ownership is a marker comment on the first line — `# written by ccgh init; edits are
overwritten` — rather than a manifest, because a manifest is one more file to go stale.

- [x] **Run it to verify it fails**

```bash
bun test src/commands/init.test.ts
```

- [x] **Write the implementation**

The five templates, adapted from the origin's, with `pnpm/action-setup`, `setup-node`,
`pnpm install` and the bot identity all deleted — the action does them — and the body replaced
by `uses: <reference>` with a `command:` input.

`ccgh-validate.yml` is the one that changes most. The origin's runs eight repository-specific
steps; this one runs `ccgh validate`, `ccgh require-a-home` against the pull request's base,
and the commands from `check` in `ccgh.json`. That key was added for the commit hook two
iterations ago and it answers here unchanged.

`init` writes each file, refusing any that exists without the marker, and stores `--from` in
`ccgh.json` under `action`, defaulting to `Hova25/ccgh-bridge@v1`.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

Then run it here, with `--from ./`, and read the diff. This repository's own workflows are the
first consumer, and `./` is the reference that keeps the action testable before any tag exists.

- [x] **Commit**
