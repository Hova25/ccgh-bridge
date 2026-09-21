---
title: Init adopts a repository
order: 4
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# Init adopts a repository

Make `ccgh init`, on a repository with no content directory, leave an iteration ready for
`/ccgh:validate-iteration` instead of loose files on `main`. It checks the clone is clean and
on `main`, creates the branch `ccgh/<prefix>-adopt-ccgh` and its worktree beside the clone,
writes into the worktree what `init` writes today plus the content of task 3, commits it, and
names the next command. Any failure after the worktree exists removes the worktree and the
branch. This is the task that gives `init` git side effects, so it carries every refusal and
the rollback, and is tested against real repositories.

**Files**

- Modify: `src/commands/init.ts` — `run` dispatches between installing and adopting
- Modify: `src/commands/init.test.ts` — existing cases keep a content directory; adoption cases
- Modify: `README.md` — what `ccgh init` does on a repository that has not adopted ccgh

**Interfaces**

- Consumes: `adoptionContent` and `checkProposal` from `src/commands/adoption.ts` (task 3);
  the `language` key task 1 makes `init` write; `contentRoot`, `contentDirectory` and
  `repositoryRoot` from `src/project.ts`.
- Produces: `ccgh init` in adoption mode, with exit 0 and on stdout the worktree path, the
  reference, and `/ccgh:validate-iteration <reference>` on its own line; exit 1 with the cause
  on stderr otherwise. Task 5's `CLAUDE.md` block and README describe it.

- [ ] **Write the failing test**

In `src/commands/init.test.ts`, the existing `beforeEach` also creates the default content
directory, so every existing case keeps today's behaviour:

```ts
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ccgh-init-"));
  await mkdir(join(root, ".git"));
  await mkdir(join(root, "docs", "ccgh-bridge"), { recursive: true });
});
```

and "names the content directory the repository configured" creates `handbook` before running.
Then a new block, against real repositories, at the end of the file:

```ts
describe("ccgh init on a repository that has not adopted ccgh", () => {
  let base = "";
  let clone = "";

  const git = (args: string[], cwd = clone) =>
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "ccgh-adopt-"));
    clone = join(base, "clone");
    await mkdir(clone);
    git(["init", "-q", "-b", "main"]);
    git(["config", "user.name", "t"]);
    git(["config", "user.email", "t@t"]);
    await writeFile(join(clone, "README.md"), "# r\n", "utf8");
    git(["add", "README.md"]);
    git(["commit", "-q", "-m", "first"]);
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  const worktrees = () => (existsSync(join(base, "worktrees")) ? readdirSync(join(base, "worktrees")) : []);

  it("commits the adoption on its own branch and worktree, leaving the clone clean on main", async () => {
    expect(await run({ argv: [], cwd: clone })).toBe(0);

    const [worktree] = worktrees();

    expect(worktree).toMatch(/^ccgh-\d{4}-\d{2}-\d{2}-\d{4}-adopt-ccgh$/);
    expect(git(["status", "--porcelain"])).toBe("");
    expect(git(["rev-parse", "--abbrev-ref", "HEAD"])).toBe("main");

    const inside = join(base, "worktrees", worktree as string);
    const committed = git(["show", "--name-only", "--format=%s", "HEAD"], inside).split("\n");

    expect(committed[0]).toBe("Adopt ccgh");
    expect(committed).toContain(".github/workflows/ccgh-validate.yml");
    expect(committed).toContain("ccgh.json");
    expect(committed).toContain("CLAUDE.md");
    expect(committed).toContain("docs/ccgh-bridge/ccgh/index.md");
    expect(git(["rev-parse", "--abbrev-ref", "HEAD"], inside)).toBe(`ccgh/${(worktree as string).slice(5)}`);
  });

  it("refuses a clone with changes in progress, and writes nothing", async () => {
    await writeFile(join(clone, "wip.txt"), "x", "utf8");

    expect(await run({ argv: [], cwd: clone })).toBe(1);
    expect(worktrees()).toEqual([]);
  });

  it("refuses a clone that is not on main", async () => {
    git(["switch", "-q", "-c", "elsewhere"]);

    expect(await run({ argv: [], cwd: clone })).toBe(1);
    expect(worktrees()).toEqual([]);
  });

  it("refuses a repository with no commit", async () => {
    const empty = join(base, "empty");

    await mkdir(empty);
    git(["init", "-q", "-b", "main"], empty);

    expect(await run({ argv: [], cwd: empty })).toBe(1);
  });

  it("removes the worktree and the branch when the commit fails", async () => {
    // A hook that refuses every commit, which the worktree shares with the clone.
    await writeFile(join(clone, ".git", "hooks", "pre-commit"), "#!/bin/sh\nexit 1\n", {
      mode: 0o755,
    });

    expect(await run({ argv: [], cwd: clone })).toBe(1);
    expect(worktrees()).toEqual([]);
    expect(git(["branch", "--list", "ccgh/*"])).toBe("");
    expect(git(["worktree", "list"]).split("\n")).toHaveLength(1);
  });
});
```

with `execFileSync` from `node:child_process`, and `existsSync` and `readdirSync` from
`node:fs`, imported at the top of the file.

- [ ] **Run it to verify it fails**

```bash
bun test src/commands/init.test.ts
```

The first adoption case finds no worktree, since `init` writes into the clone; the refusal
cases get exit 0.

- [ ] **Write the implementation**

In `src/commands/init.ts`, rename the present `run` to `install`, unchanged, and add:

```ts
const git = ({ cwd, args }: { cwd: string; args: string[] }): string =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const succeeds = ({ cwd, args }: { cwd: string; args: string[] }): boolean => {
  try {
    git({ cwd, args });

    return true;
  } catch {
    return false;
  }
};

// Everything checked before anything is written: a refusal leaves the repository untouched.
const adoptionRefusal = ({
  repository,
  branch,
  worktree,
}: {
  repository: string;
  branch: string;
  worktree: string;
}): string | null => {
  if (!succeeds({ cwd: repository, args: ["rev-parse", "--verify", "HEAD"] })) {
    return "the repository has no commit yet; commit something to main first";
  }

  const current = git({ cwd: repository, args: ["rev-parse", "--abbrev-ref", "HEAD"] });

  if (current !== "main") return `the clone is on ${current}; run ccgh init from main`;

  if (git({ cwd: repository, args: ["status", "--porcelain"] }) !== "") {
    return "the clone has changes in progress; commit or remove them first";
  }

  if (succeeds({ cwd: repository, args: ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`] })) {
    return `the branch ${branch} already exists`;
  }

  if (existsSync(worktree)) return `${worktree} already exists`;

  return null;
};

const adopt = async ({ argv, cwd }: { argv: string[]; cwd: string }): Promise<number> => {
  const repository = repositoryRoot({ from: cwd });
  const content = contentDirectory({ from: repository });
  const plan = adoptionContent({ now: new Date(), proposal: checkProposal({ repository }) });
  const branch = plan.reference;
  const worktree = resolve(repository, "..", "worktrees", branch.replace("/", "-"));
  const refusal = adoptionRefusal({ repository, branch, worktree });

  if (refusal) {
    process.stderr.write(`refusing to adopt: ${refusal}\n`);

    return 1;
  }

  await mkdir(dirname(worktree), { recursive: true });
  git({ cwd: repository, args: ["worktree", "add", "-q", worktree, "-b", branch, "main"] });

  try {
    if ((await install({ argv, cwd: worktree })) !== 0) {
      throw new Error("writing the workflows or CLAUDE.md was refused");
    }

    for (const { file, content: text } of plan.files) {
      const path = join(worktree, content, file);

      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, text, "utf8");
    }

    git({ cwd: worktree, args: ["add", "-A"] });
    git({ cwd: worktree, args: ["commit", "-q", "-m", "Adopt ccgh"] });
  } catch (error) {
    // Half an adoption is worse than none: the next run would refuse the names it left behind.
    succeeds({ cwd: repository, args: ["worktree", "remove", "--force", worktree] });
    succeeds({ cwd: repository, args: ["branch", "-D", branch] });
    process.stderr.write(`adoption abandoned: ${(error as Error).message}\n`);

    return 1;
  }

  process.stdout.write(
    [
      `adopted on ${branch}, in ${worktree}`,
      "",
      "Next:",
      `/ccgh:validate-iteration ${branch}`,
      "",
    ].join("\n"),
  );

  return 0;
};

export const run = async ({ argv, cwd }: { argv: string[]; cwd: string }): Promise<number> =>
  existsSync(contentRoot({ from: cwd })) ? install({ argv, cwd }) : adopt({ argv, cwd });
```

Import `execFileSync` from `node:child_process`, `dirname` and `resolve` from `node:path`,
`contentDirectory` beside the existing `contentRoot` and `repositoryRoot`, and
`adoptionContent` and `checkProposal` from `./adoption`.

In `README.md`, the paragraph after `ccgh init` gains:

```markdown
On a repository that has no content directory yet, `init` adopts it rather than writing into
the clone. It refuses unless the clone is on `main` with nothing in progress, then creates the
branch `ccgh/<yyyy-mm-dd-HHMM>-adopt-ccgh` and its worktree in `../worktrees/`, writes there the
workflows, `ccgh.json`, the `CLAUDE.md` block and a first iteration, `adopt-ccgh`, whose one
task is choosing the repository's checks, commits it, and names the next command,
`/ccgh:validate-iteration`. It pushes nothing. On a repository that has adopted ccgh, a re-run
only rewrites what it owns.
```

- [ ] **Run the tests to verify they pass**

```bash
bun run verify
```

Then, by hand, in a scratch clone of any repository with no `docs/ccgh-bridge/`:

```bash
bun <path to this worktree>/bin/ccgh init
git -C ../worktrees/ccgh-*-adopt-ccgh log --stat -1
```

- [ ] **Commit**

```bash
git add src/commands/init.ts src/commands/init.test.ts README.md
git commit -m "Adopt a repository on its own branch when init finds no content"
```
