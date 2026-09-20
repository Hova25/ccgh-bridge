import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { commitToIterationBranch, shellIn } from "./iteration-branch";

const TASK =
  "apps/development-documentation/src/content/harness/iterations/2026-09-13-x/tasks/01-a.md";

const git =
  (cwd: string) =>
  (...args: string[]) =>
    shellIn(cwd)({ command: "git", args });

const identity = (cwd: string) => {
  git(cwd)("config", "user.email", "bot@test");
  git(cwd)("config", "user.name", "bot");
};

const write = ({ cwd, content }: { cwd: string; content: string }) => {
  mkdirSync(dirname(join(cwd, TASK)), { recursive: true });
  writeFileSync(join(cwd, TASK), content);
};

describe("commitToIterationBranch against a moved main", () => {
  let root: string;

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("lands the mirror on the branch's copy without touching main", async () => {
    root = mkdtempSync(join(tmpdir(), "bridge-"));
    const origin = join(root, "origin");
    const author = join(root, "author");
    const runner = join(root, "runner");

    git(root)("init", "-q", "--bare", origin);
    git(root)("clone", "-q", origin, author);
    identity(author);

    // main and an iteration branch share the task file; the branch already carries a mirror.
    write({ cwd: author, content: "state: open\n" });
    git(author)("add", ".");
    git(author)("commit", "-qm", "base");
    git(author)("branch", "-M", "main");
    git(author)("switch", "-qc", "harness/2026-09-13-x");
    write({ cwd: author, content: "state: open\npull_request: 148\n" });
    git(author)("commit", "-qam", "complete wrote on the branch");
    git(author)("push", "-q", "origin", "main", "harness/2026-09-13-x");

    // main moves ahead: an unrelated commit and an older mirror on the same lines.
    git(author)("switch", "-q", "main");
    writeFileSync(join(author, "spec.md"), "unrelated\n");
    git(author)("add", "spec.md");
    git(author)("commit", "-qm", "validate another iteration");
    write({ cwd: author, content: "state: closed\n" });
    git(author)("commit", "-qam", "stale mirror on main");
    git(author)("push", "-q", "origin", "main");

    // the runner checks out main, as CI does.
    git(root)("clone", "-q", origin, runner);
    identity(runner);

    const result = await commitToIterationBranch({
      reference: "harness/2026-09-13-x",
      message: "Mirror 1 task(s) for harness/2026-09-13-x",
      run: shellIn(runner),
      apply: async () => {
        // what the bridge computes from the copy it now stands on
        const current = readFileSync(join(runner, TASK), "utf8");
        expect(current).toBe("state: open\npull_request: 148\n");
        write({ cwd: runner, content: "state: closed\npull_request: 148\n" });
        return [TASK];
      },
    });

    expect(result).toEqual({ branch: "harness/2026-09-13-x", committed: true });

    git(author)("fetch", "-q", "origin");
    expect(git(author)("show", `origin/harness/2026-09-13-x:${TASK}`)).toBe(
      "state: closed\npull_request: 148",
    );
    expect(git(author)("show", `origin/main:${TASK}`)).toBe("state: closed");
    expect(git(author)("rev-list", "--count", "origin/main..origin/harness/2026-09-13-x")).toBe(
      "2",
    );
  });

  it("creates the ship branch from a detached head when the iteration branch is gone", async () => {
    root = mkdtempSync(join(tmpdir(), "bridge-"));
    const origin = join(root, "origin");
    const author = join(root, "author");
    const runner = join(root, "runner");

    git(root)("init", "-q", "--bare", origin);
    git(root)("clone", "-q", origin, author);
    identity(author);
    write({ cwd: author, content: "state: open\n" });
    git(author)("add", ".");
    git(author)("commit", "-qm", "base");
    git(author)("branch", "-M", "main");
    git(author)("push", "-q", "origin", "main");

    git(root)("clone", "-q", origin, runner);
    identity(runner);

    // gh is not available against a bare directory; git goes to the real repository.
    const run = (input: { command: string; args: string[] }): string =>
      input.command === "gh" ? (input.args[1] === "list" ? "[]" : "") : shellIn(runner)(input);

    const result = await commitToIterationBranch({
      reference: "harness/2026-09-13-x",
      message: "Ship harness/2026-09-13-x",
      shipping: true,
      run,
      apply: async () => {
        write({ cwd: runner, content: "state: closed\n" });
        return [TASK];
      },
    });

    expect(result).toEqual({ branch: "bot/ship/harness/2026-09-13-x", committed: true });

    git(author)("fetch", "-q", "origin");
    expect(git(author)("show", `origin/bot/ship/harness/2026-09-13-x:${TASK}`)).toBe(
      "state: closed",
    );
    expect(
      git(author)("rev-list", "--count", "origin/main..origin/bot/ship/harness/2026-09-13-x"),
    ).toBe("1");
  });

  it("does not mistake an existing ship branch for the iteration branch", async () => {
    root = mkdtempSync(join(tmpdir(), "bridge-"));
    const origin = join(root, "origin");
    const author = join(root, "author");
    const runner = join(root, "runner");

    git(root)("init", "-q", "--bare", origin);
    git(root)("clone", "-q", origin, author);
    identity(author);
    write({ cwd: author, content: "state: open\n" });
    git(author)("add", ".");
    git(author)("commit", "-qm", "base");
    git(author)("branch", "-M", "main");
    // a previous run already shipped once: the ship branch exists, the iteration branch does not
    git(author)("branch", "bot/ship/harness/2026-09-13-x");
    git(author)("push", "-q", "origin", "main", "bot/ship/harness/2026-09-13-x");

    git(root)("clone", "-q", origin, runner);
    identity(runner);

    const commands: string[] = [];
    const run = (input: { command: string; args: string[] }): string => {
      commands.push([input.command, ...input.args].join(" "));
      return input.command === "gh"
        ? input.args[1] === "list"
          ? "[]"
          : ""
        : shellIn(runner)(input);
    };

    const result = await commitToIterationBranch({
      reference: "harness/2026-09-13-x",
      message: "Ship harness/2026-09-13-x",
      shipping: true,
      run,
      apply: async () => {
        write({ cwd: runner, content: "state: closed\n" });
        return [TASK];
      },
    });

    expect(result).toEqual({ branch: "bot/ship/harness/2026-09-13-x", committed: true });
    expect(commands.join("\n")).not.toMatch(/git fetch origin harness\/2026-09-13-x$/m);
  });
});
