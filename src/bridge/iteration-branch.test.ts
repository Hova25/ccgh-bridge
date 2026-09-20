import { describe, expect, it } from "bun:test";
import { commitToIterationBranch } from "./iteration-branch";

const recorder = ({
  staged = "a/spec.md",
  branchAlive = true,
  openPullRequest = false,
  written = ["a/spec.md", "a/tasks/01-a.md"],
}: {
  staged?: string;
  branchAlive?: boolean;
  openPullRequest?: boolean;
  written?: string[];
} = {}) => {
  const commands: string[] = [];

  return {
    commands,
    joined: () => commands.join("\n"),
    run: ({ command, args }: { command: string; args: string[] }): string => {
      commands.push([command, ...args].join(" "));

      if (args[0] === "ls-remote") return branchAlive ? "abc123\trefs/heads/x" : "";
      if (command === "gh" && args[1] === "list") return openPullRequest ? '[{"number":9}]' : "[]";

      return args[0] === "diff" ? staged : "";
    },
    apply: async () => {
      commands.push("apply");
      return written;
    },
  };
};

const call = ({
  recorded,
  message = "Mirror issue numbers",
  shipping = false,
}: {
  recorded: Pick<ReturnType<typeof recorder>, "run" | "apply">;
  message?: string;
  shipping?: boolean;
}) =>
  commitToIterationBranch({
    reference: "harness/2026-09-13-1529-bootstrap",
    apply: recorded.apply,
    message,
    shipping,
    run: recorded.run,
  });

const position = ({ log, needle }: { log: string; needle: string }): number => {
  const at = log.indexOf(needle);
  if (at === -1) throw new Error(`${needle} was never run`);
  return at;
};

describe("commitToIterationBranch", () => {
  it("stands on the iteration branch before anything is written", async () => {
    const recorded = recorder();

    expect(await call({ recorded })).toEqual({
      branch: "harness/2026-09-13-1529-bootstrap",
      committed: true,
    });

    const log = recorded.joined();
    const order = [
      "git fetch origin harness/2026-09-13-1529-bootstrap",
      "git checkout --detach FETCH_HEAD",
      "apply",
      "git add a/spec.md a/tasks/01-a.md",
      "git commit",
      "git push origin HEAD:refs/heads/harness/2026-09-13-1529-bootstrap",
    ].map((step) => position({ log, needle: step }));

    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("never rebases", async () => {
    const recorded = recorder();

    await call({ recorded });

    expect(recorded.joined()).not.toMatch(/git rebase/);
  });

  it("commits nothing when apply changes nothing", async () => {
    const recorded = recorder({ staged: "" });

    expect(await call({ recorded })).toEqual({
      branch: "harness/2026-09-13-1529-bootstrap",
      committed: false,
    });
    expect(recorded.joined()).not.toMatch(/git commit/);
    expect(recorded.joined()).not.toMatch(/git push/);
  });

  it("commits nothing when apply returns no file", async () => {
    const recorded = recorder({ written: [] });

    expect(await call({ recorded })).toEqual({
      branch: "harness/2026-09-13-1529-bootstrap",
      committed: false,
    });
    expect(recorded.joined()).not.toMatch(/git add/);
  });

  it("stands on main and opens a pull request when the iteration branch is gone", async () => {
    const recorded = recorder({ branchAlive: false });

    expect(await call({ recorded, message: "Ship harness/2026-09-13-1529-bootstrap" })).toEqual({
      branch: "bot/ship/harness/2026-09-13-1529-bootstrap",
      committed: true,
    });

    const log = recorded.joined();

    expect(position({ log, needle: "git fetch origin main" })).toBeLessThan(
      position({ log, needle: "apply" }),
    );
    expect(log).toMatch(
      /git push --force origin HEAD:refs\/heads\/bot\/ship\/harness\/2026-09-13-1529-bootstrap/,
    );
    expect(log).toMatch(
      /gh pr create --base main --head bot\/ship\/harness\/2026-09-13-1529-bootstrap --label harness/,
    );
  });

  it("does not open a second pull request for the same ship branch", async () => {
    const recorded = recorder({ branchAlive: false, openPullRequest: true });

    await call({ recorded, message: "Ship harness/2026-09-13-1529-bootstrap" });

    expect(recorded.joined()).not.toMatch(/gh pr create/);
  });

  it("labels the shipping pull request completed", async () => {
    const recorded = recorder({ branchAlive: false });

    await call({ recorded, message: "Ship harness/2026-09-13-1529-bootstrap", shipping: true });

    expect(recorded.joined()).toMatch(/--label harness --label completed/);
  });

  it("fails loudly and stops when the push is refused", async () => {
    const recorded = recorder();
    const refusing = (input: { command: string; args: string[] }): string => {
      if (input.args[0] === "push") {
        throw new Error("! [rejected] HEAD -> harness/2026-09-13-1529-bootstrap (fetch first)");
      }

      return recorded.run(input);
    };

    await expect(call({ recorded: { run: refusing, apply: recorded.apply } })).rejects.toThrow(
      /push to harness\/2026-09-13-1529-bootstrap was refused; another run moved it — the next run recomputes\n.*\[rejected\]/,
    );

    expect(recorded.joined()).not.toMatch(/--force/);
    expect(recorded.joined().match(/git push/g)?.length ?? 0).toBe(0);
  });
});
