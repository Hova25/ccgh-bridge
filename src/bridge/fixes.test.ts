import { describe, expect, it } from "bun:test";
import type { ParsedEntry } from "../model/validate";
import {
  abandonedFixIssues,
  bodyClosing,
  branchForFix,
  fixesMissingTheirPullRequest,
  issuesArriving,
  planFixIssues,
} from "./fixes";

const fix = ({ file, issue }: { file: string; issue: number | null }): ParsedEntry => ({
  location: { kind: "fix", domain: "harness", iteration: null, reference: null, file },
  data: { title: "Mirror the milestone", date: new Date("2026-09-14"), issue, github: {} },
  body: "# Mirror the milestone\n\nA pull request carried no milestone.\n\nMore detail.",
});

const generated = ({ file, state = "open" }: { file: string; state?: "open" | "closed" }) => ({
  number: 12,
  title: "Mirror the milestone",
  body: `text\n<!-- generated-from: ${file} -->`,
  state,
});

const empty = { issues: [], milestones: [] };

describe("planFixIssues", () => {
  it("plans an issue for a fix that has none", () => {
    const planned = planFixIssues({
      entries: [fix({ file: "harness/fixes/2026-09-14-1200-a.md", issue: null })],
      remote: empty,
      arriving: new Set(["harness/fixes/2026-09-14-1200-a.md"]),
      pullRequest: 7,
    });

    expect(planned).toHaveLength(1);
    expect(planned[0]?.domain).toBe("harness");
    expect(planned[0]?.title).toBe("Mirror the milestone");
  });

  it("carries the first paragraph and the marker into the body", () => {
    const [planned] = planFixIssues({
      entries: [fix({ file: "harness/fixes/2026-09-14-1200-a.md", issue: null })],
      remote: empty,
      arriving: new Set(["harness/fixes/2026-09-14-1200-a.md"]),
      pullRequest: 7,
    });

    expect(planned?.body).toMatch(/A pull request carried no milestone\./);
    expect(planned?.body).toMatch(/under review in #7/);
    expect(planned?.body).not.toMatch(/blob\/main/);
    expect(planned?.body).not.toMatch(/More detail/);
    expect(planned?.body).toMatch(/<!-- generated-from: harness\/fixes\/2026-09-14-1200-a\.md -->/);
  });

  it("plans nothing for a fix the pull request does not carry", () => {
    expect(
      planFixIssues({
        entries: [fix({ file: "harness/fixes/2026-09-13-1200-backfilled.md", issue: null })],
        remote: empty,
        arriving: new Set(["harness/fixes/2026-09-14-1200-a.md"]),
        pullRequest: 7,
      }),
    ).toEqual([]);
  });

  it("plans nothing for a fix that already carries its number", () => {
    expect(
      planFixIssues({
        entries: [fix({ file: "harness/fixes/2026-09-14-1200-a.md", issue: 12 })],
        remote: empty,
        arriving: new Set(["harness/fixes/2026-09-14-1200-a.md"]),
        pullRequest: 7,
      }),
    ).toEqual([]);
  });

  it("plans nothing for an issue that already exists for that file", () => {
    expect(
      planFixIssues({
        entries: [fix({ file: "harness/fixes/2026-09-14-1200-a.md", issue: null })],
        remote: {
          issues: [generated({ file: "harness/fixes/2026-09-14-1200-a.md" })],
          milestones: [],
        },
        arriving: new Set(["harness/fixes/2026-09-14-1200-a.md"]),
        pullRequest: 7,
      }),
    ).toEqual([]);
  });

  it("ignores everything that is not a fix", () => {
    const task: ParsedEntry = {
      location: {
        kind: "task",
        domain: "harness",
        iteration: "2026-09-14-1200-x",
        reference: "harness/2026-09-14-1200-x",
        file: "harness/iterations/2026-09-14-1200-x/tasks/01-a.md",
      },
      data: { title: "A task", order: 1, issue: null, github: {} },
      body: "# A task\n\nDoes something.",
    };

    expect(
      planFixIssues({
        entries: [task],
        remote: empty,
        arriving: new Set(["harness/iterations/2026-09-14-1200-x/tasks/01-a.md"]),
        pullRequest: 7,
      }),
    ).toEqual([]);
  });

  it("says the pull request is still unknown when it has none", () => {
    const [planned] = planFixIssues({
      entries: [fix({ file: "harness/fixes/2026-09-14-1200-a.md", issue: null })],
      remote: empty,
      arriving: new Set(["harness/fixes/2026-09-14-1200-a.md"]),
      pullRequest: 0,
    });

    expect(planned?.body).toMatch(/waiting for the pull request/);
  });
});

describe("abandonedFixIssues", () => {
  it("reports an open issue whose fix file is absent", () => {
    expect(
      abandonedFixIssues({
        entries: [],
        remote: {
          issues: [generated({ file: "harness/fixes/2026-09-14-1200-a.md" })],
          milestones: [],
        },
      }),
    ).toEqual([{ issue: 12, file: "harness/fixes/2026-09-14-1200-a.md" }]);
  });

  it("reports nothing when the fix landed", () => {
    expect(
      abandonedFixIssues({
        entries: [fix({ file: "harness/fixes/2026-09-14-1200-a.md", issue: 12 })],
        remote: {
          issues: [generated({ file: "harness/fixes/2026-09-14-1200-a.md" })],
          milestones: [],
        },
      }),
    ).toEqual([]);
  });

  it("reports nothing for a closed issue", () => {
    expect(
      abandonedFixIssues({
        entries: [],
        remote: {
          issues: [generated({ file: "harness/fixes/2026-09-14-1200-a.md", state: "closed" })],
          milestones: [],
        },
      }),
    ).toEqual([]);
  });

  it("ignores an issue generated from a task", () => {
    expect(
      abandonedFixIssues({
        entries: [],
        remote: {
          issues: [generated({ file: "harness/iterations/2026-09-14-1200-x/tasks/01-a.md" })],
          milestones: [],
        },
      }),
    ).toEqual([]);
  });
});

describe("bodyClosing", () => {
  it("appends the closing keyword a fix pull request cannot have written itself", () => {
    expect(bodyClosing({ body: "What was wrong.", issues: [111] })).toBe(
      "What was wrong.\n\nCloses #111\n",
    );
  });

  it("returns null when every issue is already closed by the body", () => {
    expect(bodyClosing({ body: "Text\n\nCloses #111\n", issues: [111] })).toBeNull();
  });

  it("adds only what is missing, without a blank line before an existing block", () => {
    expect(bodyClosing({ body: "Text\n\nCloses #111\n", issues: [111, 112] })).toBe(
      "Text\n\nCloses #111\nCloses #112\n",
    );
  });
});

describe("issuesArriving", () => {
  it("reports the issue of every fix the pull request carries, created this run or not", () => {
    expect(
      issuesArriving({
        entries: [
          fix({ file: "harness/fixes/2026-09-14-1200-a.md", issue: 114 }),
          fix({ file: "harness/fixes/2026-09-13-1200-old.md", issue: 12 }),
        ],
        arriving: new Set(["harness/fixes/2026-09-14-1200-a.md"]),
      }),
    ).toEqual([114]);
  });

  it("reports nothing for a fix whose issue is not created yet", () => {
    expect(
      issuesArriving({
        entries: [fix({ file: "harness/fixes/2026-09-14-1200-a.md", issue: null })],
        arriving: new Set(["harness/fixes/2026-09-14-1200-a.md"]),
      }),
    ).toEqual([]);
  });
});

describe("branchForFix", () => {
  it("derives the branch a fix was written on from its record", () => {
    expect(branchForFix("harness/fixes/2026-09-14-1200-run-the-hooks-on-bash-writes.md")).toBe(
      "fix/harness/run-the-hooks-on-bash-writes",
    );
  });
});

describe("fixesMissingTheirPullRequest", () => {
  it("reports every fix with no pull request, whenever it was written", () => {
    const withPr = {
      ...fix({ file: "harness/fixes/2026-09-14-1200-a.md", issue: 1 }),
      data: { title: "A", date: new Date(), issue: 1, pr: 9 },
    };
    const without = {
      ...fix({ file: "harness/fixes/2026-09-13-1200-b.md", issue: 2 }),
      data: { title: "B", date: new Date(), issue: 2, pr: null },
    };

    expect(fixesMissingTheirPullRequest({ entries: [withPr, without] })).toEqual([
      { file: "harness/fixes/2026-09-13-1200-b.md", branch: "fix/harness/b" },
    ]);
  });
});
