---
title: The command and the skeleton
order: 1
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The command and the skeleton

Prove the arrangement the whole iteration rests on, with one page and nothing else: Astro
rooted in the plugin, reading content from another repository, writing its cache and its
output into a third place. Every one of those is a supported option; the combination is not
one many people exercise, and if Astro refuses it the iteration changes shape here rather
than at task 5.

The page renders the domains it found and their titles. That is enough to prove the loader
resolved an absolute `base` outside the project root, which is the only thing in doubt.

**Files**

- Create: `site/astro.config.ts`
- Create: `site/src/content.config.ts`
- Create: `site/src/pages/index.astro`
- Create: `src/commands/docs.ts`
- Create: `src/commands/docs.test.ts`
- Modify: `bin/ccgh` — the fifth subcommand
- Modify: `package.json` — `astro` as a dependency
- Modify: `biome.json` — ignore `.ccgh` and `site/.astro`

**Interfaces**

- Consumes: `contentRoot` and `repositoryRoot` from `src/project`, `configuration` from `src/configuration`, and the seven schemas from `src/model/schemas`.
- Produces: `const run = ({ argv, cwd }: { argv: string[]; cwd: string }): Promise<number>` from `src/commands/docs.ts`; and `site/`, the Astro project tasks 2 to 6 fill.

- [ ] **Write the failing test**

What can be tested without starting a server is what the command decides before it starts
one. `src/commands/docs.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { plan } from "./docs";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ccgh-docs-"));
  await mkdir(join(root, ".git"));
  await mkdir(join(root, "docs", "ccgh-bridge", "engine"), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("what ccgh docs tells Astro", () => {
  it("points the loader at the repository being read, not at the plugin", () => {
    expect(plan({ argv: [], cwd: root }).content).toBe(join(root, "docs", "ccgh-bridge"));
  });

  it("writes its cache and its output into that repository, never beside the site", () => {
    const { cacheDir, outDir } = plan({ argv: [], cwd: root });

    expect(cacheDir).toBe(join(root, ".ccgh", "cache"));
    expect(outDir).toBe(join(root, ".ccgh", "site"));
  });

  it("serves rather than builds unless asked", () => {
    expect(plan({ argv: [], cwd: root }).mode).toBe("dev");
    expect(plan({ argv: ["--build"], cwd: root }).mode).toBe("build");
  });

  it("follows the content directory a repository configures", async () => {
    await writeFile(join(root, "ccgh.json"), '{ "content": "elsewhere" }', "utf8");

    expect(plan({ argv: [], cwd: root }).content).toBe(join(root, "elsewhere"));
  });

  it("refuses when there is no content to render", async () => {
    await rm(join(root, "docs"), { recursive: true });

    expect(await run({ argv: [], cwd: root })).toBe(1);
  });
});
```

`plan` is separated from `run` for one reason: everything worth asserting is a decision, and
starting Astro to assert it would make the test a deployment.

- [ ] **Run it to verify it fails**

```bash
bun test src/commands/docs.test.ts
```

- [ ] **Write the implementation**

`src/commands/docs.ts` exports `plan` and `run`. `plan` returns
`{ mode, content, cacheDir, outDir, port }`, all absolute. `run` refuses when the content
directory does not exist, then spawns Astro with the plan in the environment:

```ts
const site = fileURLToPath(new URL("../../site", import.meta.url));

Bun.spawn(["bun", "x", "astro", mode === "build" ? "build" : "dev", "--root", site], {
  env: {
    ...process.env,
    CCGH_CONTENT: content,
    CCGH_CACHE_DIR: cacheDir,
    CCGH_OUT_DIR: outDir,
  },
  stdio: ["inherit", "inherit", "inherit"],
});
```

The environment rather than flags, because `glob({ base })` is read inside
`content.config.ts`, where no command line reaches.

`site/astro.config.ts`:

```ts
import { defineConfig } from "astro/config";

export default defineConfig({
  cacheDir: process.env.CCGH_CACHE_DIR,
  outDir: process.env.CCGH_OUT_DIR,
});
```

`site/src/content.config.ts` declares the seven collections — `domains`, `guides`,
`decisions`, `fixes`, `iterations`, `brainstorms`, `tasks` — each with the schema of the same
name from `src/model/schemas`, and each with:

```ts
loader: glob({ base: process.env.CCGH_CONTENT, pattern, generateId: keepPath })
```

`keepPath` strips the `.md` and keeps everything else, because the identifier is what
`locate()` parses.

`site/src/pages/index.astro` lists the domains and their titles. Nothing else: this page is
replaced in task 5.

- [ ] **Run the tests to verify they pass**

```bash
bun run verify
```

Then prove the arrangement, which is the point of the task and cannot be reached from the
test suite. From this repository:

```bash
./bin/ccgh docs
```

The page lists `engine`, `plugin` and `site`. Then prove it is not reading its own directory
by accident — from a different repository, with no content of its own, the command refuses;
and from one whose `ccgh.json` names another directory, the page follows it.

- [ ] **Commit**
