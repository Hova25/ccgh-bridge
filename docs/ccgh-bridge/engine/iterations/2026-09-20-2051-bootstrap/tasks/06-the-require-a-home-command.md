---
title: The require-a-home command
order: 6
issue: 63
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The require-a-home command

The last of the four, and the smallest: fifty-two lines that answer one question — does this
set of changed files belong to an iteration, to a task, to a fix, or to nothing? A pull
request whose answer is "nothing" is refused, which is what keeps code from reaching `main`
without a specification or a repair record behind it.

It is called twice in a consuming repository: by a hook before a local commit, and by a
workflow on every pull request. The hook and the workflow have disagreed before — the hook
accepts a `task/<nn>-<slug>` branch and the CI script does not accept one as a *base* — and
that divergence cost two red checks the day it was found. This task moves the script; it
does not fix that, because the workflow half does not exist here yet. It records it instead,
so the iteration that writes the workflows arrives knowing.

**Files**

- Modify: `src/commands/require-a-home.ts` — replace the stub from task 3
- Test: `src/commands/require-a-home.test.ts`

**Interfaces**

- Consumes: `DATED_NAME` and `SLUG` from `src/model/schemas` (task 2); the `run` contract from task 3. It does **not** use `contentRoot`: it is given the changed paths and compares them against a pattern, and never reads the disk.
- Produces: `type Home = { kind: "iteration-branch" | "iteration" | "fix" | "content-only"; detail: string }` and `const homeOf = ({ base, changed }: { base: string; changed: string[] }): Home | null`.

- [ ] **Write the failing test**

Copy the origin's `require-a-home.test.ts` with the two mechanical changes, then add the case
the move creates:

```ts
describe("the content path it recognises", () => {
  it("follows the repository's own content root rather than the origin's", () => {
    expect(
      homeOf({ base: "main", changed: ["docs/engine/fixes/2026-01-01-0900-probe.md"] }),
    ).toEqual({ kind: "fix", detail: "engine/fixes/2026-01-01-0900-probe.md" });
  });
});
```

This fails against the copied implementation, and that failure is the whole point of the
task. The origin hardcodes its own content directory in three regular expressions. Here the
content directory is `docs/` by convention and anything by configuration, so the paths handed
to this command must already be relative to the content root, or the command must be told what
it is.

Choose the first: **`homeOf` keeps taking repository-relative paths and gains a `content`
parameter** naming the content directory relative to the repository. The caller resolves it;
this function stays pure and stays testable without a disk.

```ts
export const homeOf = ({
  base,
  changed,
  content,
}: {
  base: string;
  changed: string[];
  content: string;
}): Home | null;
```

Write the test above against that signature, passing `content: "docs"`, and add one showing
a different content directory being honoured.

- [ ] **Run it to verify it fails**

```bash
bun test src/commands/require-a-home.test.ts
```

- [ ] **Write the implementation**

Copy the origin's `require-a-home.ts`, and replace the module-level `CONTENT` constant with
the parameter: the three regular expressions are built inside `homeOf` from `content` rather
than at module load. Escape it before interpolating — a
content path is a user-supplied string reaching a regular expression, and a dot in a
directory name would otherwise match anything.

`run` resolves the content directory as a path relative to the repository root:

```ts
export const run = async ({
  argv,
  cwd,
}: {
  argv: string[];
  cwd: string;
}): Promise<number> => {
  const [base = "", ...changed] = argv;
  const root = repositoryRoot({ from: cwd });
  const content = relative(root, contentRoot({ from: cwd }));
  const home = homeOf({ base, changed, content });

  if (!home) {
    process.stderr.write(
      [
        "This pull request changes code and belongs to nothing.",
        "Code reaching main belongs to an iteration, whose specification and tasks it changes,",
        `or to a fix recorded at ${content}/<domain>/fixes/<yyyy-mm-dd-HHMM>-<slug>.md.`,
        "",
        "Changed:",
        ...changed.map((file) => `  ${file}`),
        "",
      ].join("\n"),
    );

    return 1;
  }

  process.stdout.write(`home: ${home.kind}${home.detail ? ` ${home.detail}` : ""}\n`);

  return 0;
};
```

The refusal message now names the repository's own content directory instead of one it does
not have, which is the difference between a message that helps and a message that confuses.

- [ ] **Run the tests to verify they pass**

```bash
bun test
bun run typecheck
bun run lint
```

All four subcommands are real now, and no stub is left. Check that from the outside rather
than from the test suite:

```bash
./bin/ccgh
./bin/ccgh validate
./bin/ccgh require-a-home main docs/engine/index.md
```

- [ ] **Commit**
