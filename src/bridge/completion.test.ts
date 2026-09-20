import { describe, expect, it } from "bun:test";
import type { ParsedEntry } from "../model/validate";
import { closingIssues, completionComment, completionsFor } from "./completion";

const task = ({ order, issue }: { order: number; issue: number }): ParsedEntry => ({
  location: {
    kind: "task",
    domain: "documentation-site",
    iteration: "2026-09-13-1954-reading-the-tree",
    reference: "documentation-site/2026-09-13-1954-reading-the-tree",
    file: `documentation-site/iterations/2026-09-13-1954-reading-the-tree/tasks/0${order}-a.md`,
  },
  data: { title: `Task ${order}`, order, issue, github: { state: "open" } },
  body: "",
});

describe("closingIssues", () => {
  it("finds every closing keyword GitHub accepts", () => {
    expect(closingIssues({ body: "Closes #36\nFixes #37\nresolved #38" })).toEqual([36, 37, 38]);
  });

  it("ignores a mention that closes nothing", () => {
    expect(closingIssues({ body: "related to #99, see #100" })).toEqual([]);
  });

  it("returns nothing for an empty body", () => {
    expect(closingIssues({ body: "" })).toEqual([]);
  });

  it("does not repeat an issue named twice", () => {
    expect(closingIssues({ body: "Closes #36 and closes #36 again" })).toEqual([36]);
  });
});

describe("completionsFor", () => {
  it("matches a closing keyword to the task that carries that issue", () => {
    const completions = completionsFor({
      entries: [task({ order: 1, issue: 36 }), task({ order: 2, issue: 37 })],
      pr: 50,
      mergedAt: "2026-09-13T21:00:00Z",
      body: "Closes #36",
    });

    expect(completions).toEqual([
      {
        file: "documentation-site/iterations/2026-09-13-1954-reading-the-tree/tasks/01-a.md",
        issue: 36,
        pr: 50,
        mergedAt: "2026-09-13T21:00:00Z",
      },
    ]);
  });

  it("ignores an issue no task claims", () => {
    expect(
      completionsFor({
        entries: [task({ order: 1, issue: 36 })],
        pr: 50,
        mergedAt: "2026-09-13T21:00:00Z",
        body: "Closes #999",
      }),
    ).toEqual([]);
  });

  it("handles a pull request that completes several tasks", () => {
    const completions = completionsFor({
      entries: [task({ order: 1, issue: 36 }), task({ order: 2, issue: 37 })],
      pr: 50,
      mergedAt: "2026-09-13T21:00:00Z",
      body: "Closes #36\nCloses #37",
    });

    expect(completions.map((completion) => completion.issue)).toEqual([36, 37]);
  });
});

describe("completionComment", () => {
  it("names the pull request, where it landed and why the issue is still open", () => {
    const comment = completionComment({
      completion: {
        file: "harness/iterations/2026-09-14-x/tasks/01-a.md",
        issue: 82,
        pr: 92,
        mergedAt: "2026-09-14T00:00:00Z",
      },
      base: "harness/2026-09-14-x",
    });

    expect(comment).toMatch(/Implemented by #92/);
    expect(comment).toMatch(/harness\/2026-09-14-x/);
    expect(comment).toMatch(/2026-09-14T00:00:00Z/);
    expect(comment).toMatch(/stays open until/);
  });
});
