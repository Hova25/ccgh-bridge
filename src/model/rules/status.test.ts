import { describe, expect, it } from "bun:test";
import type { ParsedEntry } from "../validate";
import { checkStatus } from "./status";

const iteration = ({
  status,
  extra = {},
}: {
  status: string;
  extra?: Record<string, unknown>;
}): ParsedEntry => {
  return {
    location: {
      kind: "iteration",
      domain: "harness",
      iteration: "2026-09-13-1529-bootstrap",
      reference: "harness/2026-09-13-1529-bootstrap",
      file: "harness/iterations/2026-09-13-1529-bootstrap/spec.md",
    },
    data: {
      title: "Bootstrap",
      status,
      validated_by: null,
      validated_at: null,
      launched_by: null,
      launched_at: null,
      ...extra,
    },
    body: "",
  };
};

const task = ({ name, data }: { name: string; data: Record<string, unknown> }): ParsedEntry => {
  return {
    location: {
      kind: "task",
      domain: "harness",
      iteration: "2026-09-13-1529-bootstrap",
      reference: "harness/2026-09-13-1529-bootstrap",
      file: `harness/iterations/2026-09-13-1529-bootstrap/tasks/${name}`,
    },
    data: { title: "T", order: 1, issue: null, github: { state: null }, ...data },
    body: "",
  };
};

const validated = { validated_by: "hovannes", validated_at: new Date("2026-09-13") };
const launched = { launched_by: "hovannes", launched_at: new Date("2026-09-14") };

describe("checkStatus", () => {
  it("accepts a draft whose tasks carry no issue", () => {
    expect(
      checkStatus([iteration({ status: "draft" }), task({ name: "01-a.md", data: {} })]),
    ).toEqual([]);
  });

  it("reports a draft whose task already carries an issue", () => {
    const failures = checkStatus([
      iteration({ status: "draft" }),
      task({ name: "01-a.md", data: { issue: 42 } }),
    ]);

    expect(failures[0]?.message).toMatch(/before being launched/);
  });

  it("reports a promoted iteration with no record of who promoted it", () => {
    const failures = checkStatus([iteration({ status: "ready" })]);

    expect(failures[0]?.message).toMatch(/validated_by/);
  });

  it("accepts an active iteration whose issues are not created yet", () => {
    const failures = checkStatus([
      iteration({ status: "active", extra: { ...validated, ...launched } }),
      task({ name: "01-a.md", data: {} }),
    ]);

    expect(failures).toEqual([]);
  });

  it("reports a shipped iteration whose task never had an issue", () => {
    const failures = checkStatus([
      iteration({ status: "shipped", extra: { ...validated, ...launched } }),
      task({ name: "01-a.md", data: {} }),
    ]);

    expect(failures[0]?.message).toMatch(/without ever having an issue/);
  });

  it("reports a shipped iteration whose task is still open", () => {
    const failures = checkStatus([
      iteration({ status: "shipped", extra: { ...validated, ...launched } }),
      task({ name: "01-a.md", data: { issue: 42, github: { state: "open" } } }),
    ]);

    expect(failures[0]?.message).toMatch(/still open/);
  });

  it("reports a decision superseding a record that is not marked superseded", () => {
    const entries: ParsedEntry[] = [
      {
        location: {
          kind: "decision",
          domain: "harness",
          iteration: null,
          reference: null,
          file: "harness/decisions/005-new.md",
        },
        data: { title: "New", status: "accepted", supersedes: "002" },
        body: "",
      },
      {
        location: {
          kind: "decision",
          domain: "harness",
          iteration: null,
          reference: null,
          file: "harness/decisions/002-old.md",
        },
        data: { title: "Old", status: "accepted", supersedes: null },
        body: "",
      },
    ];

    expect(checkStatus(entries)[0]?.message).toMatch(/not marked superseded/);
  });
});
