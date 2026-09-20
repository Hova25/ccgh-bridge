import { describe, expect, it } from "bun:test";
import { locate } from "./paths";

describe("locate", () => {
  it("recognises a domain index", () => {
    expect(locate("harness/index.md")).toEqual({
      kind: "domain",
      domain: "harness",
      iteration: null,
      reference: null,
      file: "harness/index.md",
    });
  });

  it("recognises a guide page", () => {
    expect(locate("harness/guide/workflow.md")?.kind).toBe("guide");
  });

  it("recognises a decision record", () => {
    expect(locate("harness/decisions/001-commit-the-configuration.md")?.kind).toBe("decision");
  });

  it("builds the reference an iteration is pointed at by", () => {
    expect(locate("harness/iterations/2026-09-13-1529-bootstrap/spec.md")).toEqual({
      kind: "iteration",
      domain: "harness",
      iteration: "2026-09-13-1529-bootstrap",
      reference: "harness/2026-09-13-1529-bootstrap",
      file: "harness/iterations/2026-09-13-1529-bootstrap/spec.md",
    });
  });

  it("recognises a brainstorm and a task inside an iteration", () => {
    expect(locate("harness/iterations/2026-09-13-1529-bootstrap/brainstorm.md")?.kind).toBe(
      "brainstorm",
    );
    expect(
      locate("harness/iterations/2026-09-13-1529-bootstrap/tasks/01-schemas.md"),
    ).toMatchObject({
      kind: "task",
      reference: "harness/2026-09-13-1529-bootstrap",
    });
  });

  it("locates a fix in a domain", () => {
    expect(locate("harness/fixes/2026-09-14-mirror-the-milestone.md")).toEqual({
      kind: "fix",
      domain: "harness",
      iteration: null,
      reference: null,
      file: "harness/fixes/2026-09-14-mirror-the-milestone.md",
    });
  });

  it("returns null for a file that matches no known shape", () => {
    expect(locate("harness/notes.md")).toBeNull();
    expect(locate("harness/iterations/2026-09-13-1529-bootstrap/notes.md")).toBeNull();
    expect(locate("harness/iterations/2026-09-13-1529-bootstrap/tasks/deep/01-a.md")).toBeNull();
  });
});
