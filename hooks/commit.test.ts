import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import { commitCommand, commitDirectory } from "./commit";

const session = resolve("/work/clone");

describe("commitCommand", () => {
  it("sees a commit behind options that take a separate value", () => {
    expect(commitCommand.test("git -C ../worktrees/x commit -m y")).toBe(true);
    expect(commitCommand.test("git -c user.name=me commit -m y")).toBe(true);
    expect(commitCommand.test('git -C "a dir" --no-pager commit')).toBe(true);
  });

  it("ignores what is not a commit", () => {
    expect(commitCommand.test("git -C ../worktrees/x status")).toBe(false);
    expect(commitCommand.test("git log --grep commit")).toBe(false);
  });
});

describe("commitDirectory", () => {
  it("stays in the session's directory without a cd", () => {
    expect(commitDirectory({ command: "git commit -m x", cwd: session })).toBe(session);
  });

  it("follows a cd before the commit", () => {
    expect(
      commitDirectory({
        command: "cd ../worktrees/fix-a && git add . && git commit",
        cwd: session,
      }),
    ).toBe(resolve("/work/worktrees/fix-a"));
  });

  it("composes successive cds and a quoted path", () => {
    expect(
      commitDirectory({ command: 'cd .. && cd "worktrees/b" ; git commit', cwd: session }),
    ).toBe(resolve("/work/worktrees/b"));
  });

  it("follows git -C on the commit itself", () => {
    expect(commitDirectory({ command: "git -C ../worktrees/c commit -m x", cwd: session })).toBe(
      resolve("/work/worktrees/c"),
    );
  });

  it("ignores a cd that comes after the commit", () => {
    expect(commitDirectory({ command: "git commit -m x && cd /elsewhere", cwd: session })).toBe(
      session,
    );
  });

  it("returns the session's directory when nothing commits", () => {
    expect(commitDirectory({ command: "cd /elsewhere && ls", cwd: session })).toBe(session);
  });
});
