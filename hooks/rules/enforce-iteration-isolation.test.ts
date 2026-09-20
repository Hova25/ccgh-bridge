import { describe, expect, it } from "bun:test";
import { fake } from "../fake-context";
import { decide } from "./enforce-iteration-isolation";

const commit = { tool_input: { command: "git commit -m 'x'" } };

const base = "docs/ccgh-bridge";

const staged = (...files: string[]) => fake({ stagedFiles: () => files, content: () => base });

describe("enforce-iteration-isolation", () => {
  it("allows a commit touching no content at all", () => {
    expect(decide({ input: commit, context: staged("src/app.ts", "README.md") })).toBeNull();
  });

  it("allows a commit inside a single iteration", () => {
    expect(
      decide({
        input: commit,
        context: staged(
          `${base}/harness/iterations/2026-09-13-1529-bootstrap/spec.md`,
          `${base}/harness/iterations/2026-09-13-1529-bootstrap/tasks/01-a.md`,
          "src/app.ts",
        ),
      }),
    ).toBeNull();
  });

  it("refuses a commit spanning two iterations and names both", () => {
    const refusal = decide({
      input: commit,
      context: staged(
        `${base}/harness/iterations/2026-09-13-1529-bootstrap/spec.md`,
        `${base}/auth/iterations/2026-10-01-sso/spec.md`,
      ),
    });

    expect(refusal).toMatch(/harness\/2026-09-13-1529-bootstrap/);
    expect(refusal).toMatch(/auth\/2026-10-01-sso/);
  });

  it("allows domain-level files alongside one iteration", () => {
    expect(
      decide({
        input: commit,
        context: staged(
          `${base}/harness/decisions/001-a.md`,
          `${base}/harness/iterations/2026-09-13-1529-bootstrap/spec.md`,
        ),
      }),
    ).toBeNull();
  });

  it("follows the content root a repository configures, not one written into the rule", () => {
    const elsewhere = (...files: string[]) =>
      fake({ stagedFiles: () => files, content: () => "elsewhere" });

    expect(
      decide({
        input: commit,
        context: elsewhere(
          "elsewhere/engine/iterations/2026-01-01-0900-a/spec.md",
          "elsewhere/plugin/iterations/2026-01-01-0900-b/spec.md",
        ),
      }),
    ).toMatch(/more than one iteration/);
  });
});
