import { describe, expect, it, vi } from "bun:test";
import { applyActions, formatDivergence } from "./apply";
import type { GitHubClient } from "./github";
import type { Action } from "./plan";

const fakeClient = (): GitHubClient & { calls: string[] } => {
  const calls: string[] = [];
  let next = 100;

  return {
    calls,
    readState: vi.fn(async () => ({ issues: [], milestones: [] })),
    createMilestone: vi.fn(async (title: string) => {
      calls.push(`milestone:${title}`);
      return 1;
    }),
    createIssue: vi.fn(async ({ title }: { title: string }) => {
      calls.push(`issue:${title}`);
      return next++;
    }),
    updateBody: vi.fn(async ({ number }: { number: number }) => {
      calls.push(`update:${number}`);
    }),
    listBodies: vi.fn(async () => []),
    comment: vi.fn(async ({ number }: { number: number }) => {
      calls.push(`comment:${number}`);
    }),
    ensureLabel: vi.fn(async (name: string) => {
      calls.push(`label:${name}`);
    }),
    addLabel: vi.fn(async ({ number, label }: { number: number; label: string }) => {
      calls.push(`addLabel:${number}:${label}`);
    }),
    pullRequestForBranch: vi.fn(async () => null),
  };
};

const createIssue = ({ file, title }: { file: string; title: string }): Action => ({
  kind: "create-issue",
  file,
  issue: { title, body: "b", milestone: "harness/2026-09-13-1529-bootstrap", labels: ["harness"] },
});

describe("applyActions", () => {
  it("returns the issue number each created file received", async () => {
    const client = fakeClient();

    const result = await applyActions({
      actions: [
        createIssue({ file: "tasks/01-a.md", title: "One" }),
        createIssue({ file: "tasks/02-b.md", title: "Two" }),
      ],
      client,
    });

    expect(result.created).toEqual([
      { file: "tasks/01-a.md", number: 100 },
      { file: "tasks/02-b.md", number: 101 },
    ]);
  });

  it("creates the label and the milestone before any issue", async () => {
    const client = fakeClient();

    await applyActions({
      actions: [
        { kind: "create-milestone", title: "harness/2026-09-13-1529-bootstrap" },
        createIssue({ file: "tasks/01-a.md", title: "One" }),
      ],
      client,
    });

    expect(client.calls).toEqual([
      "milestone:harness/2026-09-13-1529-bootstrap",
      "label:harness",
      "issue:One",
    ]);
  });

  it("creates a label only once for a run", async () => {
    const client = fakeClient();

    await applyActions({
      actions: [
        createIssue({ file: "tasks/01-a.md", title: "One" }),
        createIssue({ file: "tasks/02-b.md", title: "Two" }),
      ],
      client,
    });

    expect(client.calls.filter((call) => call.startsWith("label:"))).toEqual(["label:harness"]);
  });

  it("records updated bodies", async () => {
    const client = fakeClient();

    const result = await applyActions({
      actions: [{ kind: "update-body", number: 42, body: "x" }],
      client,
    });

    expect(result.updated).toEqual([42]);
  });

  it("comments a divergence and creates nothing", async () => {
    const client = fakeClient();

    const result = await applyActions({
      actions: [
        {
          kind: "report-divergence",
          iteration: "harness/2026-09-13-1529-bootstrap",
          commentOn: 42,
          added: ["tasks/03-new.md"],
          removed: [],
        },
      ],
      client,
    });

    expect(client.calls).toEqual(["comment:42"]);
    expect(result.created).toEqual([]);
    expect(result.reported).toEqual(["harness/2026-09-13-1529-bootstrap"]);
  });
});

describe("formatDivergence", () => {
  it("names what was added and what was removed", () => {
    const text = formatDivergence({
      kind: "report-divergence",
      iteration: "harness/2026-09-13-1529-bootstrap",
      commentOn: 42,
      added: ["harness/iterations/2026-09-13-1529-bootstrap/tasks/03-handle-rate-limits.md"],
      removed: [
        {
          file: "harness/iterations/2026-09-13-1529-bootstrap/tasks/07-legacy-import.md",
          number: 48,
          state: "open",
        },
      ],
    });

    expect(text).toMatch(/\[bot\] The task set changed since launch\./);
    expect(text).toMatch(/Added:\s+03-handle-rate-limits\.md\s+\(no issue\)/);
    expect(text).toMatch(/Removed:\s+07-legacy-import\.md\s+\(issue #48 still open\)/);
    expect(text).toMatch(/\/launch-iteration/);
  });

  it("omits a line that would say nothing", () => {
    const text = formatDivergence({
      kind: "report-divergence",
      iteration: "harness/2026-09-13-1529-bootstrap",
      commentOn: 42,
      added: ["tasks/03-new.md"],
      removed: [],
    });

    expect(text).not.toMatch(/Removed:/);
  });
});
