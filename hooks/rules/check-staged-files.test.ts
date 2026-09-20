import { describe, expect, it } from "bun:test";
import { fake } from "../fake-context";
import { decide } from "./check-staged-files";

const commit = { tool_input: { command: "git commit -m x" } };

const context = ({ files, failures = "" }: { files: string[]; failures?: string }) =>
  fake({ stagedFiles: () => files, check: () => failures });

describe("check-staged-files", () => {
  it("ignores a command that is not a commit", () => {
    const decision = decide({
      input: { tool_input: { command: "git status" } },
      context: context({ files: ["a.ts"], failures: "a.ts:1 arrow-constants" }),
    });

    expect(decision).toBeNull();
  });

  it("allows a commit whose staged files pass", () => {
    expect(decide({ input: commit, context: context({ files: ["a.ts"] }) })).toBeNull();
  });

  it("refuses a commit whose staged files fail, showing what failed", () => {
    const decision = decide({
      input: commit,
      context: context({ files: ["a.ts"], failures: "a.ts:1 arrow-constants" }),
    });

    expect(decision).toMatch(/arrow-constants/);
    expect(decision).toMatch(/the project's own fix command/);
  });

  it("ignores a commit staging nothing it can check", () => {
    const decision = decide({
      input: commit,
      context: context({ files: ["README.md", "biome.json"], failures: "should not be reached" }),
    });

    expect(decision).toBeNull();
  });

  it("ignores a commit staging nothing at all", () => {
    expect(decide({ input: commit, context: context({ files: [] }) })).toBeNull();
  });

  it("checks astro and mjs files too, not only typescript", () => {
    const decision = decide({
      input: commit,
      context: context({ files: ["a.astro", "b"], failures: "b.mjs:4 arrow-constants" }),
    });

    expect(decision).toMatch(/b\.mjs:4/);
  });
});
