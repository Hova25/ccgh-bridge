---
title: The adoption content
order: 3
issue: 119
github:
  state: closed
  pr: 124
  merged_at: '2026-09-21T20:24:56Z'
  synced_at: '2026-09-21T20:39:06.221Z'
---

# The adoption content

Produce, as pure data, everything `ccgh init` writes under the content directory of a
repository it adopts: the `ccgh` domain, and in it the iteration `adopt-ccgh` with its
brainstorm, its specification and its one task, configuring the checks. The task carries a
proposal of `check` commands read from `package.json` and the package manager its lockfile
names. Keeping this apart from the git work of task 4 lets it be tested without a repository,
and lets the templates be read and reviewed as prose.

**Files**

- Create: `src/package-manager.ts` — which package manager a repository uses
- Create: `src/commands/adoption.ts` — `checkProposal` and `adoptionContent`
- Create: `src/templates/adoption/index.md`
- Create: `src/templates/adoption/brainstorm.md`
- Create: `src/templates/adoption/spec.md`
- Create: `src/templates/adoption/task.md`
- Modify: `src/commands/init.ts` — `installSteps` reads the package manager from the new module
- Test: `src/package-manager.test.ts`
- Test: `src/commands/adoption.test.ts`

**Interfaces**

- Consumes: `Scaffold` and `prefixAt` from `src/commands/scaffold.ts`; `loadContent` and
  `validate` in the test.
- Produces:
  - `type PackageManager = "bun" | "pnpm" | "yarn" | "npm"`
  - `packageManagerOf({ repository }: { repository: string }): PackageManager | null`, `null`
    when there is no `package.json`.
  - `checkProposal({ repository }: { repository: string }): string[]`
  - `adoptionContent({ now, proposal }: { now: Date; proposal: string[] }): { reference: string; files: Scaffold[] }`,
    whose `reference` is `ccgh/<yyyy-mm-dd-HHMM>-adopt-ccgh` and whose files are relative to
    the content directory. Task 4 writes them.

- [x] **Write the failing test**

`src/package-manager.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packageManagerOf } from "./package-manager";

let repository = "";

beforeEach(async () => {
  repository = await mkdtemp(join(tmpdir(), "ccgh-pm-"));
});

afterEach(async () => {
  await rm(repository, { recursive: true, force: true });
});

const given = async (files: string[]) => {
  for (const name of files) await writeFile(join(repository, name), "{}", "utf8");

  return packageManagerOf({ repository });
};

describe("packageManagerOf", () => {
  it("is none without package.json", async () => {
    expect(await given([])).toBeNull();
  });

  it("follows the lockfile", async () => {
    expect(await given(["package.json", "pnpm-lock.yaml"])).toBe("pnpm");
  });

  it("knows each of them", async () => {
    await given(["package.json"]);

    for (const [lockfile, manager] of [
      ["bun.lock", "bun"],
      ["bun.lockb", "bun"],
      ["yarn.lock", "yarn"],
      ["package-lock.json", "npm"],
      ["npm-shrinkwrap.json", "npm"],
    ] as const) {
      await writeFile(join(repository, lockfile), "", "utf8");
      expect(packageManagerOf({ repository })).toBe(manager);
      await rm(join(repository, lockfile));
    }
  });

  it("is npm when package.json has no lockfile beside it", async () => {
    expect(await given(["package.json"])).toBe("npm");
  });
});
```

`src/commands/adoption.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { loadContent } from "../model/load";
import { validate } from "../model/validate";
import { adoptionContent, checkProposal } from "./adoption";

const now = new Date("2026-09-21T18:56:00Z");

let repository = "";

beforeEach(async () => {
  repository = await mkdtemp(join(tmpdir(), "ccgh-adoption-"));
});

afterEach(async () => {
  await rm(repository, { recursive: true, force: true });
});

describe("checkProposal", () => {
  it("proposes the scripts that check, run by the repository's package manager", async () => {
    const scripts = { dev: "vite", lint: "eslint src", typecheck: "tsc -p .", test: "vitest run" };

    await writeFile(join(repository, "package.json"), JSON.stringify({ scripts }), "utf8");
    await writeFile(join(repository, "pnpm-lock.yaml"), "", "utf8");

    expect(checkProposal({ repository })).toEqual(["pnpm lint", "pnpm typecheck", "pnpm test"]);
  });

  it("runs a script through npm run when npm is the manager", async () => {
    await writeFile(join(repository, "package.json"), '{ "scripts": { "lint": "eslint" } }', "utf8");

    expect(checkProposal({ repository })).toEqual(["npm run lint"]);
  });

  it("proposes nothing without package.json", () => {
    expect(checkProposal({ repository })).toEqual([]);
  });
});

describe("adoptionContent", () => {
  const plan = adoptionContent({ now, proposal: ["pnpm lint"] });

  it("names the iteration it writes", () => {
    expect(plan.reference).toBe("ccgh/2026-09-21-1856-adopt-ccgh");
  });

  it("writes the domain, the iteration and its one task", () => {
    expect(plan.files.map((file) => file.file)).toEqual([
      "ccgh/index.md",
      "ccgh/iterations/2026-09-21-1856-adopt-ccgh/brainstorm.md",
      "ccgh/iterations/2026-09-21-1856-adopt-ccgh/spec.md",
      "ccgh/iterations/2026-09-21-1856-adopt-ccgh/tasks/01-configure-the-checks.md",
    ]);
  });

  it("leaves no placeholder and no template token behind", () => {
    for (const { file, content } of plan.files) {
      expect(content, file).not.toMatch(/<[A-Z][^>]*>/);
      expect(content, file).not.toContain("__");
    }
  });

  it("carries the proposal into the task, and says so when there is none", () => {
    const task = (files: { file: string; content: string }[]) =>
      files.find((file) => file.file.endsWith("configure-the-checks.md"))?.content ?? "";

    expect(task(plan.files)).toContain("`pnpm lint`");
    expect(task(adoptionContent({ now, proposal: [] }).files)).toMatch(/nothing is proposed/);
  });

  it("is content the validator accepts", async () => {
    const root = join(repository, "docs", "ccgh-bridge");

    for (const { file, content } of plan.files) {
      await mkdir(dirname(join(root, file)), { recursive: true });
      await writeFile(join(root, file), content, "utf8");
    }

    expect(validate(await loadContent(root))).toEqual([]);
  });
});
```

- [x] **Run it to verify it fails**

```bash
bun test src/package-manager.test.ts src/commands/adoption.test.ts
```

Neither module exists.

- [x] **Write the implementation**

`src/package-manager.ts`:

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";

export type PackageManager = "bun" | "pnpm" | "yarn" | "npm";

const lockfiles: [string, PackageManager][] = [
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
  ["npm-shrinkwrap.json", "npm"],
];

// The lockfile names the package manager; without one, package.json alone is npm's.
export const packageManagerOf = ({ repository }: { repository: string }): PackageManager | null => {
  if (!existsSync(join(repository, "package.json"))) return null;

  const found = lockfiles.find(([name]) => existsSync(join(repository, name)));

  return found ? found[1] : "npm";
};
```

In `src/commands/init.ts`, `installSteps` switches on `packageManagerOf({ repository })`
instead of testing the lockfiles itself; the Yarn branch still tests `.yarnrc.yml`, and a `null`
manager installs nothing. The steps it writes are unchanged, which the existing init tests
confirm.

`src/commands/adoption.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { packageManagerOf } from "../package-manager";
import { prefixAt, type Scaffold } from "./scaffold";

// The scripts that check rather than build or serve, in the order a reader would run them.
const checking = ["lint", "format:check", "typecheck", "test", "check", "verify"];

const runner = { bun: "bun run", pnpm: "pnpm", yarn: "yarn", npm: "npm run" } as const;

export const checkProposal = ({ repository }: { repository: string }): string[] => {
  const manager = packageManagerOf({ repository });

  if (!manager) return [];

  const scripts: Record<string, string> =
    JSON.parse(readFileSync(join(repository, "package.json"), "utf8")).scripts ?? {};

  return checking.filter((name) => name in scripts).map((name) => `${runner[manager]} ${name}`);
};

const template = (name: string): string =>
  readFileSync(fileURLToPath(new URL(`../templates/adoption/${name}`, import.meta.url)), "utf8");

const proposed = (proposal: string[]): string =>
  proposal.length === 0
    ? "No `package.json` was found, so nothing is proposed: list the repository's own check commands, or none."
    : proposal.map((command) => `- \`${command}\``).join("\n");

export const adoptionContent = ({
  now,
  proposal,
}: {
  now: Date;
  proposal: string[];
}): { reference: string; files: Scaffold[] } => {
  const iteration = `${prefixAt({ now })}-adopt-ccgh`;
  const directory = `ccgh/iterations/${iteration}`;
  const fill = (text: string) =>
    text
      .replaceAll("__DAY__", now.toISOString().slice(0, 10))
      .replaceAll("__REFERENCE__", `ccgh/${iteration}`)
      .replaceAll("__PROPOSAL__", proposed(proposal));

  return {
    reference: `ccgh/${iteration}`,
    files: [
      { file: "ccgh/index.md", content: fill(template("index.md")) },
      { file: `${directory}/brainstorm.md`, content: fill(template("brainstorm.md")) },
      { file: `${directory}/spec.md`, content: fill(template("spec.md")) },
      { file: `${directory}/tasks/01-configure-the-checks.md`, content: fill(template("task.md")) },
    ],
  };
};
```

`src/templates/adoption/index.md`:

```markdown
---
title: ccgh
summary: How this repository works with ccgh — its adoption, its configuration, and the checks its commits run.
---

This domain holds what concerns ccgh itself rather than the product: the iteration that adopted
it, and any later change to `ccgh.json`, to the workflows `ccgh init` writes, or to the
lifecycle rules in `CLAUDE.md`.
```

`src/templates/adoption/brainstorm.md`:

```markdown
---
title: Adopt ccgh
date: __DAY__
participants:
  - ccgh
---

# Adopt ccgh

## What prompted this

This repository ran `ccgh init`. From now on its work moves through iterations and fixes
recorded in this content directory, and mirrored to GitHub issues by the workflows `init`
wrote. This iteration is the first of them: it brings those workflows, `ccgh.json` and the
lifecycle rules in `CLAUDE.md` onto `main`, through the same gates as every later change.

## What was considered

Committing the output of `init` straight to `main` was not possible: the hooks refuse a commit
on `main`, and the validation workflow refuses code that belongs to no iteration or fix. A fix
record would have been lighter, and was set aside so that the repository's first change goes
through the whole lifecycle once, gates included.

The checks the commit hook runs are the one setting `init` cannot choose. Which commands suit
this repository, and whether they accept file arguments, is a decision for the people who
maintain it, so it is this iteration's only task.

## Not settled here

Which domains this repository has. They are created as work arrives, one at a time, by the
assistant that classifies it, and seen in the pull request that brings each one.
```

`src/templates/adoption/spec.md`:

```markdown
---
title: Adopt ccgh
status: draft
depends_on: []
impacts: []
---

# Adopt ccgh

## Problem

The repository has run `ccgh init`, and nothing it wrote is on `main` yet: the workflows that
mirror work to GitHub issues, `ccgh.json`, and the lifecycle rules in `CLAUDE.md`. Until they
are, no iteration can be launched and no fix can open its issue.

## Goals

- The five workflows, `ccgh.json` and the `CLAUDE.md` block are on `main`.
- `check` in `ccgh.json` names the commands this repository wants run on the files a commit
  stages, or is deliberately left empty.
- The repository has been through one full cycle: validated, launched, its task merged, shipped.

## Non-goals

- Describing the repository's domains. Each is created by the work that first needs it.
- Changing the repository's own CI. The workflows `init` wrote sit beside it.

## Contract

The adoption commit on this branch carries everything `init` wrote. The one task, configuring
the checks, changes `ccgh.json` and regenerates `.github/workflows/ccgh-validate.yml` with
`ccgh init`, which in a repository that has a content directory only rewrites what it owns.

## Failure modes

- A check command that refuses file arguments fails every commit once it is listed; the task
  says how to try each one before listing it.
- A workflow asks for approval before its first run on a bot's commit; approving it is part of
  the launch.

## Risks

- Two human gates stand before the first merge. That is the lifecycle, shown once.

## Open questions

None blocking.
```

`src/templates/adoption/task.md`, fenced with tildes here because it holds a code block of its
own:

~~~markdown
---
title: Configure the checks
order: 1
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# Configure the checks

Choose the commands the commit hook runs on the files a commit stages, and the validation
workflow runs on every pull request, and write them into `check` in `ccgh.json`. ccgh does not
guess them: it proposes, and this task decides.

**Files**

- Modify: `ccgh.json` — the `check` list
- Modify: `.github/workflows/ccgh-validate.yml` — regenerated by `ccgh init`

**Interfaces**

- Consumes: the workflows and `ccgh.json` the adoption commit wrote.
- Produces: `check` in `ccgh.json`, run by the commit hook with the staged files as arguments,
  and by `ccgh-validate` without them.

Proposed, from the scripts in `package.json` and the package manager its lockfile names:

__PROPOSAL__

The commit hook appends the staged files to each command. A command that refuses file
arguments fails every commit: TypeScript refuses `tsc -p tsconfig.json src/a.ts`, while `eslint`
checks the files it is given. Keep the commands that accept files, or leave `check` empty when
the repository's own CI already runs them.

- [ ] **Try each proposed command on one staged file**, the way the hook will run it.

- [ ] **Write the chosen commands** into `check` in `ccgh.json`, or `[]`.

- [ ] **Regenerate the validation workflow**, which installs the dependencies and runs them:

```bash
ccgh init
```

- [ ] **Commit** `ccgh.json` and `.github/workflows/ccgh-validate.yml` together.
~~~

The spec template must stay free of the placeholder shape the test refuses, which is why its
headings carry prose and no angle brackets.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

- [x] **Commit**

```bash
git add src/package-manager.ts src/package-manager.test.ts src/commands/adoption.ts \
  src/commands/adoption.test.ts src/commands/init.ts src/templates/adoption
git commit -m "Write the content of an adoption: the ccgh domain and its first iteration"
```
