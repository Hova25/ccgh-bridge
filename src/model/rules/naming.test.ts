import { describe, expect, it } from "bun:test";
import type { ParsedEntry } from "../validate";
import { checkNaming } from "./naming";

const entry = ({
  kind,
  file,
}: {
  kind: ParsedEntry["location"]["kind"];
  file: string;
}): ParsedEntry => {
  const [domain] = file.split("/") as [string];
  const iteration = file.includes("/iterations/") ? (file.split("/")[2] as string) : null;

  return {
    location: {
      kind,
      domain,
      iteration,
      reference: iteration ? `${domain}/${iteration}` : null,
      file,
    },
    data: {},
    body: "",
  };
};

describe("checkNaming", () => {
  it("accepts conforming names", () => {
    const entries = [
      entry({ kind: "iteration", file: "harness/iterations/2026-09-13-1529-bootstrap/spec.md" }),
      entry({
        kind: "task",
        file: "harness/iterations/2026-09-13-1529-bootstrap/tasks/01-content-schemas.md",
      }),
      entry({ kind: "decision", file: "harness/decisions/001-commit-the-configuration.md" }),
      entry({ kind: "guide", file: "harness/guide/workflow.md" }),
    ];

    expect(checkNaming(entries)).toEqual([]);
  });

  it("reports an iteration directory without a date prefix", () => {
    const failures = checkNaming([
      entry({ kind: "iteration", file: "harness/iterations/bootstrap/spec.md" }),
    ]);

    expect(failures[0]?.message).toMatch(/yyyy-mm-dd/);
  });

  it("refuses an iteration named to the day, not the minute", () => {
    const failures = checkNaming([
      entry({ kind: "iteration", file: "harness/iterations/2026-09-13-example/spec.md" }),
    ]);

    expect(failures).toHaveLength(1);
    expect(failures[0]?.message).toMatch(/yyyy-mm-dd-HHMM-slug/);
  });

  it("accepts two fixes in the same minute with different slugs", () => {
    const entries = [
      entry({ kind: "fix", file: "github-bridge/fixes/2026-09-13-2248-close-a-fix-issue.md" }),
      entry({
        kind: "fix",
        file: "github-bridge/fixes/2026-09-13-2248-let-the-last-marker-win.md",
      }),
    ];

    expect(checkNaming(entries)).toEqual([]);
  });

  it("refuses a fix named to the day", () => {
    const failures = checkNaming([
      entry({ kind: "fix", file: "github-bridge/fixes/2026-09-13-close-a-fix-issue.md" }),
    ]);

    expect(failures).toHaveLength(1);
    expect(failures[0]?.message).toMatch(/yyyy-mm-dd-HHMM-slug/);
  });

  it("reports a task file without a two-digit order prefix", () => {
    const failures = checkNaming([
      entry({
        kind: "task",
        file: "harness/iterations/2026-09-13-1529-bootstrap/tasks/schemas.md",
      }),
    ]);

    expect(failures[0]?.message).toMatch(/two-digit/);
  });

  it("reports a decision record without a three-digit prefix", () => {
    const failures = checkNaming([
      entry({ kind: "decision", file: "harness/decisions/1-commit.md" }),
    ]);

    expect(failures[0]?.message).toMatch(/three-digit/);
  });

  it("reports a fix whose file name carries no date", () => {
    const failures = checkNaming([
      entry({ kind: "fix", file: "harness/fixes/mirror-the-milestone.md" }),
    ]);

    expect(failures[0]?.message).toMatch(/yyyy-mm-dd-HHMM-slug/);
  });

  it("accepts a dated fix", () => {
    const failures = checkNaming([
      entry({ kind: "fix", file: "harness/fixes/2026-09-14-1200-mirror-the-milestone.md" }),
    ]);

    expect(failures).toEqual([]);
  });

  it("reports an upper-case guide file", () => {
    const failures = checkNaming([entry({ kind: "guide", file: "harness/guide/Workflow.md" })]);

    expect(failures[0]?.message).toMatch(/lower-case/);
  });
});
