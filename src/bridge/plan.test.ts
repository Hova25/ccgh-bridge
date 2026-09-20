import { describe, expect, it } from "bun:test";
import type { ParsedEntry } from "../model/validate";
import type { RemoteState } from "./github";
import { missingIssueNumbers, planActions } from "./plan";
import { renderIssue } from "./render";

const reference = "harness/2026-09-13-1529-bootstrap";

const iteration = ({
  status,
  launched = [],
}: {
  status: string;
  launched?: string[];
}): ParsedEntry => ({
  location: {
    kind: "iteration",
    domain: "harness",
    iteration: "2026-09-13-1529-bootstrap",
    reference,
    file: "harness/iterations/2026-09-13-1529-bootstrap/spec.md",
  },
  data: {
    title: "Bootstrap",
    status,
    depends_on: [],
    impacts: [],
    launched_tasks: launched.map((name) => `tasks/${name}`),
  },
  body: "",
});

const task = ({
  order,
  name,
  issue = null,
}: {
  order: number;
  name: string;
  issue?: number | null;
}): ParsedEntry => ({
  location: {
    kind: "task",
    domain: "harness",
    iteration: "2026-09-13-1529-bootstrap",
    reference,
    file: `harness/iterations/2026-09-13-1529-bootstrap/tasks/${name}`,
  },
  data: { title: `Task ${order}`, order, issue },
  body: `# Task ${order}\n\nSummary.\n\n**Files**\n\n- a\n\n**Interfaces**\n\n- Produces: b\n`,
});

const url = (file: string) => `https://example.test/${file}`;
const empty: RemoteState = { issues: [], milestones: [] };

const issueFor = ({
  entry,
  total,
  number,
}: {
  entry: ParsedEntry;
  total: number;
  number: number;
}) => {
  const rendered = renderIssue({ task: entry, total, url: url(entry.location.file) });

  return { number, title: rendered.title, body: rendered.body, state: "open" as const };
};

describe("planActions", () => {
  it("lets a task claim the issue it carries the number of, whatever path the marker names", () => {
    const launched = iteration({ status: "active", launched: ["01-a.md"] });
    const moved = task({ order: 1, name: "01-a.md", issue: 7 });
    const before = "<!-- generated-from: harness/iterations/2026-09-13-bootstrap/tasks/01-a.md -->";

    expect(
      planActions({
        entries: [launched, moved],
        remote: {
          issues: [{ number: 7, title: "Task 1", body: before, state: "open" }],
          milestones: [reference],
        },
        url,
      }),
    ).toEqual([
      {
        kind: "update-body",
        number: 7,
        body: renderIssue({ task: moved, total: 1, url: url(moved.location.file) }).body,
      },
    ]);
  });

  it("ignores a second issue whose marker names a task that already owns one", () => {
    const launched = iteration({ status: "active", launched: ["01-a.md"] });
    const owner = task({ order: 1, name: "01-a.md", issue: 7 });
    const current = issueFor({ entry: owner, total: 1, number: 7 });
    const duplicate = {
      ...issueFor({ entry: owner, total: 1, number: 9 }),
      state: "closed" as const,
    };

    expect(
      planActions({
        entries: [launched, owner],
        remote: { issues: [current, duplicate], milestones: [reference] },
        url,
      }),
    ).toEqual([]);
  });

  it("does nothing for an iteration that is not active", () => {
    expect(
      planActions({
        entries: [iteration({ status: "ready" }), task({ order: 1, name: "01-a.md" })],
        remote: empty,
        url,
      }),
    ).toEqual([]);
  });

  it("creates the milestone and one issue per task, in order", () => {
    const actions = planActions({
      entries: [
        iteration({ status: "active", launched: ["01-a.md", "02-b.md"] }),
        task({ order: 2, name: "02-b.md" }),
        task({ order: 1, name: "01-a.md" }),
      ],
      remote: empty,
      url,
    });

    expect(actions[0]).toEqual({ kind: "create-milestone", title: reference });
    expect(actions.slice(1).map((action) => action.kind)).toEqual(["create-issue", "create-issue"]);
    expect((actions[1] as { file: string }).file).toMatch(/01-a\.md$/);
  });

  it("does not recreate a milestone that already exists", () => {
    const actions = planActions({
      entries: [
        iteration({ status: "active", launched: ["01-a.md"] }),
        task({ order: 1, name: "01-a.md" }),
      ],
      remote: { issues: [], milestones: [reference] },
      url,
    });

    expect(actions.some((action) => action.kind === "create-milestone")).toBe(false);
  });

  it("creates nothing for a task that already carries its issue number", () => {
    const existing = task({ order: 1, name: "01-a.md", issue: 42 });

    const actions = planActions({
      entries: [iteration({ status: "active", launched: ["01-a.md"] }), existing],
      remote: {
        issues: [issueFor({ entry: existing, total: 1, number: 42 })],
        milestones: [reference],
      },
      url,
    });

    expect(actions).toEqual([]);
  });

  it("updates a body that drifted from its task file", () => {
    const existing = task({ order: 1, name: "01-a.md", issue: 42 });
    const stale = {
      ...issueFor({ entry: existing, total: 1, number: 42 }),
      body: `stale\n<!-- generated-from: ${existing.location.file} -->`,
    };

    const actions = planActions({
      entries: [iteration({ status: "active", launched: ["01-a.md"] }), existing],
      remote: { issues: [stale], milestones: [reference] },
      url,
    });

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ kind: "update-body", number: 42 });
  });

  it("reports a task added after launch instead of creating its issue", () => {
    const existing = task({ order: 1, name: "01-a.md", issue: 42 });

    const actions = planActions({
      entries: [
        iteration({ status: "active", launched: ["01-a.md"] }),
        existing,
        task({ order: 2, name: "02-new.md" }),
      ],
      remote: {
        issues: [issueFor({ entry: existing, total: 2, number: 42 })],
        milestones: [reference],
      },
      url,
    });

    expect(actions).toEqual([
      {
        kind: "report-divergence",
        iteration: reference,
        commentOn: 42,
        added: ["harness/iterations/2026-09-13-1529-bootstrap/tasks/02-new.md"],
        removed: [],
      },
    ]);
  });

  it("reports a task removed after launch instead of closing its issue", () => {
    const actions = planActions({
      entries: [iteration({ status: "active", launched: ["01-a.md"] })],
      remote: {
        issues: [
          {
            number: 42,
            title: "Task 1",
            body: "<!-- generated-from: harness/iterations/2026-09-13-1529-bootstrap/tasks/01-a.md -->",
            state: "open",
          },
        ],
        milestones: [reference],
      },
      url,
    });

    expect(actions[0]).toMatchObject({
      kind: "report-divergence",
      removed: [{ number: 42, state: "open" }],
    });
  });

  it("resumes a launch interrupted after some issues were created", () => {
    const created = task({ order: 1, name: "01-a.md", issue: 42 });

    const actions = planActions({
      entries: [
        iteration({ status: "active", launched: ["01-a.md", "02-b.md", "03-c.md"] }),
        created,
        task({ order: 2, name: "02-b.md" }),
        task({ order: 3, name: "03-c.md" }),
      ],
      remote: {
        issues: [issueFor({ entry: created, total: 3, number: 42 })],
        milestones: [reference],
      },
      url,
    });

    expect(actions.map((action) => action.kind)).toEqual(["create-issue", "create-issue"]);
    expect((actions[0] as { file: string }).file).toMatch(/02-b\.md$/);
  });

  it("never emits an action that closes or deletes anything", () => {
    const actions = planActions({
      entries: [
        iteration({ status: "active", launched: ["01-a.md"] }),
        task({ order: 1, name: "01-a.md" }),
      ],
      remote: empty,
      url,
    });

    expect(actions.every((action) => !/close|delete/.test(action.kind))).toBe(true);
  });
});

describe("missingIssueNumbers", () => {
  it("recovers a number the file never received", () => {
    const existing = task({ order: 1, name: "01-a.md" });

    const missing = missingIssueNumbers({
      entries: [existing],
      remote: { milestones: [], issues: [issueFor({ entry: existing, total: 1, number: 42 })] },
    });

    expect(missing).toEqual([
      { file: "harness/iterations/2026-09-13-1529-bootstrap/tasks/01-a.md", number: 42 },
    ]);
  });

  it("finds nothing when the file already carries the number", () => {
    const existing = task({ order: 1, name: "01-a.md", issue: 42 });

    const missing = missingIssueNumbers({
      entries: [existing],
      remote: { milestones: [], issues: [issueFor({ entry: existing, total: 1, number: 42 })] },
    });

    expect(missing).toEqual([]);
  });

  it("never replaces a number the file already carries with another issue's", () => {
    const owner = task({ order: 1, name: "01-a.md", issue: 42 });

    const missing = missingIssueNumbers({
      entries: [owner],
      remote: { milestones: [], issues: [issueFor({ entry: owner, total: 1, number: 219 })] },
    });

    expect(missing).toEqual([]);
  });

  it("ignores an issue nobody generated", () => {
    const missing = missingIssueNumbers({
      entries: [task({ order: 1, name: "01-a.md", issue: 42 })],
      remote: {
        milestones: [],
        issues: [{ number: 99, title: "opened by hand", body: "no marker", state: "open" }],
      },
    });

    expect(missing).toEqual([]);
  });
});
