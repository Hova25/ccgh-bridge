import { describe, expect, it } from "bun:test";
import type { Context } from "../context";
import { decide } from "./require-a-home";

const commit = { tool_input: { command: "git commit -m x" } };
const content = "docs/ccgh-bridge";

const context = ({ branch, files }: { branch: string; files: string[] }): Context => ({
  currentBranch: () => branch,
  stagedFiles: () => files,
  content: () => content,
  check: () => "",
  fileExists: () => true,
});

describe("require-a-home", () => {
  it("ignores a command that is not a commit", () => {
    const decision = decide({
      input: { tool_input: { command: "git status" } },
      context: context({ branch: "scratch", files: ["src/a.ts"] }),
    });

    expect(decision).toBeNull();
  });

  it("allows code committed on an iteration branch", () => {
    const decision = decide({
      input: commit,
      context: context({ branch: "harness/2026-09-14-1200-x", files: ["src/a.ts"] }),
    });

    expect(decision).toBeNull();
  });

  it("allows code committed on a task branch", () => {
    const decision = decide({
      input: commit,
      context: context({ branch: "task/05-require-a-home", files: ["src/a.ts"] }),
    });

    expect(decision).toBeNull();
  });

  it("refuses code committed on a branch that is none of them", () => {
    const decision = decide({
      input: commit,
      context: context({ branch: "quick-repair", files: ["src/a.ts"] }),
    });

    expect(decision).toMatch(/iteration, a task or a fix/);
  });

  it("refuses a fix branch carrying no record", () => {
    const decision = decide({
      input: commit,
      context: context({ branch: "fix/harness/x", files: ["src/a.ts"] }),
    });

    expect(decision).toMatch(/fixes\//);
  });

  it("allows a fix branch whose record is staged", () => {
    const decision = decide({
      input: commit,
      context: context({
        branch: "fix/harness/x",
        files: ["src/a.ts", `${content}/harness/fixes/2026-09-14-1200-x.md`],
      }),
    });

    expect(decision).toBeNull();
  });

  it("ignores a commit that only touches content", () => {
    const decision = decide({
      input: commit,
      context: context({ branch: "anything", files: [`${content}/harness/guide/conventions.md`] }),
    });

    expect(decision).toBeNull();
  });

  it("allows a commit that stages nothing", () => {
    const decision = decide({
      input: commit,
      context: context({ branch: "anything", files: [] }),
    });

    expect(decision).toBeNull();
  });
});
