---
title: The validate command
order: 3
issue: 60
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The validate command

Give the engine its front door: `bin/ccgh`, an executable Bun runs directly, dispatching to
subcommands — and the first subcommand, `validate`, which is the four lines of the origin's
`cli.ts` with its hardcoded root replaced by the resolver from task 1.

This is the task where the extraction becomes visible. `ccgh validate`, typed in a
repository the engine has never seen, reports that repository's content.

**Files**

- Create: `bin/ccgh`
- Create: `src/commands/validate.ts`
- Test: `src/commands/validate.test.ts`
- Modify: `package.json` — declare `bin`

**Interfaces**

- Consumes: `contentRoot` from `src/project.ts` (task 1); `loadContent` and `validate` from `src/model/` (task 2).
- Produces: the executable `bin/ccgh` and its dispatch table. Tasks 4, 5 and 6 add one entry each to that table and one file under `src/commands/`. Each command module exports `const run = ({ argv, cwd }: { argv: string[]; cwd: string }): Promise<number>` returning the process exit code, so that a command can be tested without spawning a process.

- [ ] **Write the failing test**

`src/commands/validate.test.ts`:

```ts
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { run } from "./validate";

let root = "";

const write = async ({ file, body }: { file: string; body: string }): Promise<void> => {
  await mkdir(join(root, "docs", file, ".."), { recursive: true });
  await writeFile(join(root, "docs", file), body, "utf8");
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ccgh-validate-"));
  await mkdir(join(root, ".git"));
  await mkdir(join(root, "docs"), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("ccgh validate", () => {
  it("accepts a well-formed tree", async () => {
    await write({
      file: "engine/index.md",
      body: "---\ntitle: Engine\nsummary: The engine.\n---\n\nProse.\n",
    });

    expect(await run({ argv: [], cwd: root })).toBe(0);
  });

  it("refuses a domain missing its summary", async () => {
    await write({ file: "engine/index.md", body: "---\ntitle: Engine\n---\n\nProse.\n" });

    expect(await run({ argv: [], cwd: root })).toBe(1);
  });

  it("reads the root ccgh.json names rather than docs", async () => {
    await writeFile(join(root, "ccgh.json"), '{ "content": "elsewhere" }', "utf8");
    await mkdir(join(root, "elsewhere", "engine"), { recursive: true });
    await writeFile(
      join(root, "elsewhere", "engine", "index.md"),
      "---\ntitle: Engine\n---\n\nProse.\n",
      "utf8",
    );

    expect(await run({ argv: [], cwd: root })).toBe(1);
  });

  it("says so when the content directory does not exist", async () => {
    await rm(join(root, "docs"), { recursive: true });

    expect(await run({ argv: [], cwd: root })).toBe(1);
  });
});
```

The third test is the one that matters: it passes only if the override is read, because the
tree it points at is invalid while `docs/` is empty and valid.

- [ ] **Run it to verify it fails**

```bash
bun test src/commands/validate.test.ts
```

- [ ] **Write the implementation**

`src/commands/validate.ts`:

```ts
import { existsSync } from "node:fs";
import { loadContent } from "../model/load";
import { validate } from "../model/validate";
import { contentRoot } from "../project";

export const run = async ({ cwd }: { argv: string[]; cwd: string }): Promise<number> => {
  const root = contentRoot({ from: cwd });

  if (!existsSync(root)) {
    process.stderr.write(`no content directory at ${root}\n`);

    return 1;
  }

  const failures = validate(await loadContent(root));

  for (const failure of failures) {
    process.stderr.write(`${failure.file}: ${failure.message}\n`);
  }

  process.stdout.write(
    failures.length === 0 ? "content is valid\n" : `${failures.length} problem(s) found\n`,
  );

  return failures.length === 0 ? 0 : 1;
};
```

The missing-directory branch is new, and it is the reason this is not a copy: the origin
could assume its content directory existed, because it shipped with it.

`bin/ccgh`, with no extension and the executable bit set:

```ts
#!/usr/bin/env bun
import { run as requireAHome } from "../src/commands/require-a-home";
import { run as promote } from "../src/commands/promote";
import { run as scaffold } from "../src/commands/scaffold";
import { run as validate } from "../src/commands/validate";

const commands: Record<string, (input: { argv: string[]; cwd: string }) => Promise<number>> = {
  validate,
  scaffold,
  promote,
  "require-a-home": requireAHome,
};

const usage = [
  "usage:",
  "  ccgh validate",
  "  ccgh scaffold iteration <domain>/<slug>",
  "  ccgh scaffold fix <domain>/<slug>",
  "  ccgh scaffold task <domain>/<iteration> <slug>",
  "  ccgh promote <domain>/<iteration> --to <status> [--dry-run]",
  "  ccgh require-a-home <base> <changed...>",
  "",
].join("\n");

const [name, ...argv] = process.argv.slice(2);
const command = name ? commands[name] : undefined;

if (!command) {
  process.stderr.write(usage);
  process.exit(1);
}

process.exit(await command({ argv, cwd: process.cwd() }));
```

The three imports it does not use yet are written now on purpose: tasks 4, 5 and 6 each add
one file and change nothing here. Until they land, `bun run typecheck` fails on the missing
modules, so **write the three files as one-line stubs returning 1** and let their tasks fill
them. A stub that exits non-zero is honest; a missing module is a broken executable.

Make it executable and declare it:

```bash
chmod +x bin/ccgh
```

```json
"bin": { "ccgh": "./bin/ccgh" }
```

- [ ] **Run the tests to verify they pass**

```bash
bun test
bun run typecheck
bun run lint
```

Then run it against a real tree, which is the point of the whole iteration — this repository
is one:

```bash
./bin/ccgh validate
```

- [ ] **Commit**
