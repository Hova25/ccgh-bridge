import { describe, expect, it } from "bun:test";
import { homeOf } from "./require-a-home";

const content = "apps/development-documentation/src/content";

describe("homeOf", () => {
  it("gives a pull request into an iteration branch the iteration as its home", () => {
    expect(
      homeOf({
        base: "harness/2026-09-14-1200-recording-quick-fixes",
        changed: ["src/a.ts"],
        content,
      }),
    ).toEqual({
      kind: "iteration-branch",
      detail: "harness/2026-09-14-1200-recording-quick-fixes",
    });
  });

  it("finds the iteration a change into main belongs to", () => {
    expect(
      homeOf({
        base: "main",
        changed: ["src/a.ts", `${content}/harness/iterations/2026-09-14-1200-x/spec.md`],
        content,
      }),
    ).toEqual({ kind: "iteration", detail: "harness/2026-09-14-1200-x" });
  });

  it("finds the fix a change into main belongs to", () => {
    expect(
      homeOf({
        base: "main",
        changed: ["src/a.ts", `${content}/harness/fixes/2026-09-14-1200-x.md`],
        content,
      }),
    ).toEqual({ kind: "fix", detail: "harness/fixes/2026-09-14-1200-x.md" });
  });

  it("accepts a change that only touches content", () => {
    expect(
      homeOf({ base: "main", changed: [`${content}/harness/guide/conventions.md`], content }),
    ).toEqual({
      kind: "content-only",
      detail: "",
    });
  });

  it("accepts a change that touches nothing", () => {
    expect(homeOf({ base: "main", changed: [], content })).toEqual({
      kind: "content-only",
      detail: "",
    });
  });

  it("refuses code into main that belongs to nothing", () => {
    expect(homeOf({ base: "main", changed: ["src/a.ts"], content })).toBeNull();
  });

  it("refuses code into main alongside a fix in the wrong place", () => {
    expect(
      homeOf({
        base: "main",
        changed: ["src/a.ts", `${content}/harness/decisions/004-x.md`],
        content,
      }),
    ).toBeNull();
  });
});

describe("the content path it recognises", () => {
  it("follows the repository's own content root rather than the origin's", () => {
    expect(
      homeOf({
        base: "main",
        changed: ["src/a.ts", "docs/engine/fixes/2026-01-01-0900-probe.md"],
        content: "docs",
      }),
    ).toEqual({ kind: "fix", detail: "engine/fixes/2026-01-01-0900-probe.md" });
  });

  it("honours a content directory that is neither docs nor the origin's", () => {
    expect(
      homeOf({
        base: "main",
        changed: ["site/src/content/engine/iterations/2026-01-01-0900-probe/spec.md"],
        content: "site/src/content",
      }),
    ).toEqual({ kind: "content-only", detail: "" });
  });

  it("does not let a dot in the content directory match anything", () => {
    expect(
      homeOf({
        base: "main",
        changed: ["dxcs/engine/fixes/2026-01-01-0900-probe.md"],
        content: "d.cs",
      }),
    ).toBeNull();
  });
});
