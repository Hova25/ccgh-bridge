import { describe, expect, it } from "bun:test";
import type { ParsedEntry } from "../model/validate";
import { recentIssues } from "./recent";

const task = ({ issue, state }: { issue: number | null; state?: string }): ParsedEntry => ({
  location: {
    kind: "task",
    domain: "harness",
    iteration: "2026-09-14-x",
    reference: "harness/2026-09-14-x",
    file: `harness/iterations/2026-09-14-x/tasks/0${issue ?? 0}-a.md`,
  },
  data: { title: `Task ${issue}`, order: 1, issue, github: { state: state ?? null } },
  body: "",
});

const fix = ({ issue }: { issue: number }): ParsedEntry => ({
  location: {
    kind: "fix",
    domain: "github-bridge",
    iteration: null,
    reference: null,
    file: `github-bridge/fixes/2026-09-14-a${issue}.md`,
  },
  data: { title: `Fix ${issue}`, date: new Date("2026-09-14"), issue, pr: null },
  body: "",
});

describe("recentIssues", () => {
  it("orders by issue number, newest first", () => {
    const recent = recentIssues({
      entries: [task({ issue: 3 }), fix({ issue: 9 }), task({ issue: 5 })],
    });

    expect(recent.map((item) => item.issue)).toEqual([9, 5, 3]);
  });

  it("keeps only what carries an issue", () => {
    expect(recentIssues({ entries: [task({ issue: null }), task({ issue: 4 })] })).toHaveLength(1);
  });

  it("keeps only the ten most recent by default", () => {
    const many = Array.from({ length: 14 }, (_, index) => task({ issue: index + 1 }));

    expect(recentIssues({ entries: many }).map((item) => item.issue)).toEqual([
      14, 13, 12, 11, 10, 9, 8, 7, 6, 5,
    ]);
  });

  it("honours a smaller limit", () => {
    expect(
      recentIssues({ entries: [task({ issue: 1 }), task({ issue: 2 })], limit: 1 }),
    ).toHaveLength(1);
  });

  it("reads a task's state from its mirror", () => {
    const [open] = recentIssues({ entries: [task({ issue: 1 })] });
    const [closed] = recentIssues({ entries: [task({ issue: 2, state: "closed" })] });

    expect(open?.state).toBe("open");
    expect(closed?.state).toBe("closed");
  });

  it("treats a fix as closed, because its record only reaches main at the merge", () => {
    expect(recentIssues({ entries: [fix({ issue: 7 })] })[0]?.state).toBe("closed");
  });

  it("links the page of each one on this site", () => {
    expect(recentIssues({ entries: [fix({ issue: 7 })] })[0]?.url).toBe(
      "/github-bridge/fixes/2026-09-14-a7",
    );
  });
});
