---
title: The bridge command
order: 8
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The bridge command

`ccgh bridge <verb>`, the sixth subcommand, wiring six verbs to the modules tasks 2 to 7 built.
This is where the content root is resolved, where the token is demanded, and where `--dry-run`
lives.

It is also the first thing in this iteration that can create an issue. Everything before it
returns plans; this one applies them. So it refuses before it reads rather than failing
halfway, and it can always be asked what it would do instead.

**Files**

- Create: `src/commands/bridge.ts`
- Test: `src/commands/bridge.test.ts`
- Modify: `bin/ccgh` — the sixth subcommand

**Interfaces**

- Consumes: everything tasks 2 to 7 produced, plus `contentRoot` and `configuration`.
- Produces: `run({ argv, cwd }): Promise<number>`, and `issueUrl({ repository, content, file })`. Task 9's workflows call it; task 10 runs it.

- [ ] **Write the failing test**

```ts
describe("ccgh bridge", () => {
  it("refuses before it reads anything when there is no token", async () => {
    expect(await run({ argv: ["push"], cwd: root })).toBe(1);
  });

  it("names the verb it did not recognise", async () => {
    expect(await run({ argv: ["shove"], cwd: withToken(root) })).toBe(1);
  });

  it("links an issue back through the repository's own content root", () => {
    expect(issueUrl({ repository: "o/r", content: "elsewhere", file: "engine/a.md" })).toBe(
      "https://github.com/o/r/blob/main/elsewhere/engine/a.md",
    );
  });

  it("plans without applying when asked what it would do", async () => {
    const planned = await run({ argv: ["push", "--dry-run"], cwd: withToken(root) });

    expect(planned).toBe(0);
  });
});
```

The dry run is asserted here rather than in the modules, because the modules cannot apply
anything — this is the only place where the difference exists.

- [ ] **Run it to verify it fails**

```bash
bun test src/commands/bridge.test.ts
```

- [ ] **Write the implementation**

Copy the body of the origin's `cli.ts` — `runPush`, `runFixes`, `runSync` and the `complete`,
`relink` and `reconcile` branches — into `src/commands/bridge.ts`, changing four things:

`CONTENT_PREFIX` becomes `relative(repositoryRoot({ from: cwd }), contentRoot({ from: cwd }))`,
resolved once at the top of `run` and passed down. `issueUrl` takes it as an argument. `root`
becomes `contentRoot({ from: cwd })` rather than a path derived from the module's own location.
And the trailing `if (import.meta.url === …)` block becomes `run`, returning a code rather than
exiting.

The repository comes from `GITHUB_REPOSITORY` when a runner sets it, and from `repository` in
`ccgh.json` otherwise — which is the key the site already added, now paying twice.

`--dry-run` prints the plan and returns before `applyActions`, `commitToIterationBranch` or any
client call that writes.

- [ ] **Run the tests to verify they pass**

```bash
bun run verify
```

Then run it against this repository, from a terminal, with a real token — which is the whole
reason this path exists:

```bash
GITHUB_TOKEN=… ./bin/ccgh bridge push --dry-run
```

It should name one issue per task of every `active` iteration. There are none yet: all three
are `draft` or `ready`, so the honest output is that there is nothing to create. That is the
correct answer and it proves the reading half without touching anything.

- [ ] **Commit**
