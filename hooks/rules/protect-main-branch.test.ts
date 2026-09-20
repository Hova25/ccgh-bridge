import { describe, expect, it } from "bun:test";
import { fake } from "../fake-context";
import { decide } from "./protect-main-branch";

const onMain = fake({ currentBranch: () => "main" });
const onBranch = fake({ currentBranch: () => "harness/2026-09-13-1529-bootstrap" });

describe("protect-main-branch", () => {
  it("ignores a command that is not a commit", () => {
    expect(
      decide({ input: { tool_input: { command: "git status" } }, context: onMain }),
    ).toBeNull();
  });

  it("refuses a commit while main is checked out", () => {
    const refusal = decide({
      input: { tool_input: { command: "git commit -m 'x'" } },
      context: onMain,
    });

    expect(refusal).toMatch(/main/);
    expect(refusal).toMatch(/git switch -c/);
  });

  it("allows a commit on any other branch", () => {
    expect(
      decide({ input: { tool_input: { command: "git commit -m 'x'" } }, context: onBranch }),
    ).toBeNull();
  });

  it("sees a commit hidden inside a compound command", () => {
    expect(
      decide({
        input: { tool_input: { command: "git add -A && git commit -m 'x'" } },
        context: onMain,
      }),
    ).not.toBeNull();
  });

  it("ignores a commit mentioned inside a quoted message", () => {
    expect(
      decide({
        input: { tool_input: { command: "echo 'run git commit later'" } },
        context: onMain,
      }),
    ).toBeNull();
  });
});
