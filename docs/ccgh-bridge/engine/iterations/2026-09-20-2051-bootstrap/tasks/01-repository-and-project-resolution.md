---
title: Repository and project resolution
order: 1
issue: 58
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# Repository and project resolution

Stand up the repository on Bun and write the two functions the whole extraction turns on:
finding the repository being worked on, and finding its content inside it. Every command in
this iteration calls them, and they are what replace the line repeated four times in the
origin — `fileURLToPath(new URL("../src/content", import.meta.url))` — which welded the
content to the application that rendered it.

Nothing else in this task: no model, no command, no executable. It exists so that the five
that follow have a repository to land in and a root to resolve.

**Files**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `biome.json`
- Create: `src/project.ts`
- Test: `src/project.test.ts`

**Interfaces**

- Consumes: nothing.
- Produces: `const repositoryRoot = ({ from }: { from: string }): string` and `const contentRoot = ({ from }: { from: string }): string`, both from `src/project.ts`. Every command in tasks 3 to 6 calls `contentRoot({ from: process.cwd() })` exactly once, at its entry point.

- [ ] **Write the failing test**

`src/project.test.ts`:

```ts
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { contentRoot, repositoryRoot } from "./project";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ccgh-"));
  await mkdir(join(root, ".git"));
  await mkdir(join(root, "packages", "deep"), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("the repository root", () => {
  it("is the directory holding .git", () => {
    expect(repositoryRoot({ from: root })).toBe(root);
  });

  it("is found from any directory below it", () => {
    expect(repositoryRoot({ from: join(root, "packages", "deep") })).toBe(root);
  });

  it("accepts a worktree, where .git is a file rather than a directory", async () => {
    const worktree = await mkdtemp(join(tmpdir(), "ccgh-worktree-"));
    await writeFile(join(worktree, ".git"), `gitdir: ${join(root, ".git")}\n`, "utf8");

    expect(repositoryRoot({ from: worktree })).toBe(worktree);

    await rm(worktree, { recursive: true, force: true });
  });

  it("says where it looked when there is no repository", () => {
    expect(() => repositoryRoot({ from: tmpdir() })).toThrow(/no repository above/);
  });
});

describe("the content root", () => {
  it("is docs, by convention", () => {
    expect(contentRoot({ from: root })).toBe(join(root, "docs"));
  });

  it("is whatever ccgh.json says, relative to the repository", async () => {
    await writeFile(join(root, "ccgh.json"), '{ "content": "apps/site/src/content" }', "utf8");

    expect(contentRoot({ from: root })).toBe(join(root, "apps/site/src/content"));
  });

  it("falls back to docs when ccgh.json carries no content key", async () => {
    await writeFile(join(root, "ccgh.json"), '{ "other": true }', "utf8");

    expect(contentRoot({ from: root })).toBe(join(root, "docs"));
  });

  it("refuses a malformed ccgh.json rather than silently using docs", async () => {
    await writeFile(join(root, "ccgh.json"), "{ not json", "utf8");

    expect(() => contentRoot({ from: root })).toThrow(/ccgh\.json is not valid JSON/);
  });
});
```

The worktree case is not a curiosity: this workflow puts every branch in a worktree, so the
common case for `ccgh` is a directory whose `.git` is a file.

- [ ] **Run it to verify it fails**

```bash
bun test src/project.test.ts
```

- [ ] **Write the implementation**

```bash
bun init -y
bun add -d @biomejs/biome typescript @types/bun
```

`package.json`, after that install, reads:

```json
{
  "name": "cc-gh-bridge",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "bun test",
    "typecheck": "tsc --noEmit",
    "lint": "biome check --error-on-warnings",
    "lint:fix": "biome check --write --error-on-warnings",
    "verify": "bun run lint && bun run typecheck && bun test"
  }
}
```

`biome.json`, at the settings the code being moved was written for, so that nineteen hundred
lines arrive without a reformatting diff hiding a real change:

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "files": {
    "includes": ["**", "!**/node_modules", "!**/dist", "!**/.astro", "!bun.lock"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "preset": "recommended",
      "style": {
        "useConsistentTypeDefinitions": {
          "level": "error",
          "options": { "style": "type" }
        }
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always"
    }
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "preserve",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "types": ["bun"]
  },
  "include": ["src", "bin"]
}
```

`moduleResolution: bundler` rather than the origin's `nodenext`, because Bun resolves like a
bundler and the relative imports carry no extension. This is the one place the moved code
changes shape: its `./thing.js` imports become `./thing`.

`src/project.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

const configuration = "ccgh.json";
const convention = "docs";

export const repositoryRoot = ({ from }: { from: string }): string => {
  const start = resolve(from);
  let directory = start;
  let parent = dirname(directory);

  while (directory !== parent) {
    if (existsSync(join(directory, ".git"))) return directory;

    directory = parent;
    parent = dirname(directory);
  }

  throw new Error(`no repository above ${start}: no .git found`);
};

export const contentRoot = ({ from }: { from: string }): string => {
  const root = repositoryRoot({ from });
  const file = join(root, configuration);

  if (!existsSync(file)) return join(root, convention);

  let parsed: { content?: unknown };

  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${configuration} is not valid JSON: ${(error as Error).message}`);
  }

  if (typeof parsed.content !== "string") return join(root, convention);

  return isAbsolute(parsed.content) ? parsed.content : join(root, parsed.content);
};
```

`existsSync` rather than a stat, because a worktree's `.git` is a file and a clone's is a
directory, and neither kind matters — only that the name is there.

- [ ] **Run the tests to verify they pass**

```bash
bun test
bun run typecheck
bun run lint
```

- [ ] **Commit**
