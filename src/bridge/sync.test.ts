import { describe, expect, it } from "bun:test";
import type { ParsedEntry } from "../model/validate";
import type { RemoteState } from "./github";

import { planSync, staleTasks } from "./sync";

const reference = "harness/2026-09-13-1529-bootstrap";
const specFile = "harness/iterations/2026-09-13-1529-bootstrap/spec.md";

const iteration = (status: string): ParsedEntry => ({
  location: {
    kind: "iteration",
    domain: "harness",
    iteration: "2026-09-13-1529-bootstrap",
    reference,
    file: specFile,
  },
  data: { title: "Bootstrap", status },
  body: "",
});

const task = ({
  order,
  issue,
  state,
  syncedAt = null,
}: {
  order: number;
  issue: number | null;
  state: string | null;
  syncedAt?: string | null;
}): ParsedEntry => ({
  location: {
    kind: "task",
    domain: "harness",
    iteration: "2026-09-13-1529-bootstrap",
    reference,
    file: `harness/iterations/2026-09-13-1529-bootstrap/tasks/0${order}-a.md`,
  },
  data: {
    title: `Task ${order}`,
    order,
    issue,
    github: { state, pr: null, merged_at: null, synced_at: syncedAt },
  },
  body: "",
});

const remote = (issues: Array<[number, "open" | "closed"]>): RemoteState => ({
  milestones: [reference],
  issues: issues.map(([number, state]) => ({ number, title: "t", body: "b", state })),
});

describe("planSync", () => {
  it("writes a state that differs from the mirror", () => {
    const plan = planSync({
      entries: [iteration("active"), task({ order: 1, issue: 42, state: "open" })],
      remote: remote([[42, "closed"]]),
    });

    expect(plan.writes).toEqual([
      {
        file: "harness/iterations/2026-09-13-1529-bootstrap/tasks/01-a.md",
        state: { state: "closed", pr: null, merged_at: null },
      },
    ]);
  });

  it("writes nothing when the mirror already agrees", () => {
    const plan = planSync({
      entries: [iteration("active"), task({ order: 1, issue: 42, state: "closed" })],
      remote: remote([[42, "closed"]]),
    });

    expect(plan.writes).toEqual([]);
  });

  it("ships an active iteration once every issue is closed", () => {
    const plan = planSync({
      entries: [
        iteration("active"),
        task({ order: 1, issue: 42, state: "closed" }),
        task({ order: 2, issue: 43, state: "closed" }),
      ],
      remote: remote([
        [42, "closed"],
        [43, "closed"],
      ]),
    });

    expect(plan.ship).toEqual([specFile]);
  });

  it("does not ship while one issue is open", () => {
    const plan = planSync({
      entries: [
        iteration("active"),
        task({ order: 1, issue: 42, state: "closed" }),
        task({ order: 2, issue: 43, state: "open" }),
      ],
      remote: remote([
        [42, "closed"],
        [43, "open"],
      ]),
    });

    expect(plan.ship).toEqual([]);
  });

  it("does not ship an iteration that is not active", () => {
    const plan = planSync({
      entries: [iteration("ready"), task({ order: 1, issue: 42, state: "closed" })],
      remote: remote([[42, "closed"]]),
    });

    expect(plan.ship).toEqual([]);
  });

  it("does not ship while one task is unknown to GitHub", () => {
    const plan = planSync({
      entries: [
        iteration("active"),
        task({ order: 1, issue: 42, state: "closed" }),
        task({ order: 2, issue: 999, state: "open" }),
      ],
      remote: remote([[42, "closed"]]),
    });

    expect(plan.ship).toEqual([]);
  });

  it("refuses to ship an iteration that has no tasks at all", () => {
    // "every task is closed" is true of an empty list. The guard is `known > 0`, and this
    // test is what names it, so that a later simplification cannot quietly remove it.
    const plan = planSync({ entries: [iteration("active")], remote: remote([]) });

    expect(plan.ship).toEqual([]);
  });
});

const now = new Date("2026-09-14T12:00:00Z");

describe("staleTasks", () => {
  it("ignores a task synced recently", () => {
    const entries = [
      task({ order: 1, issue: 42, state: "open", syncedAt: "2026-09-14T11:00:00Z" }),
    ];

    expect(staleTasks({ entries, now, maxAgeHours: 6 })).toEqual([]);
  });

  it("reports a task synced too long ago", () => {
    const entries = [
      task({ order: 1, issue: 42, state: "open", syncedAt: "2026-09-13T00:00:00Z" }),
    ];

    expect(staleTasks({ entries, now, maxAgeHours: 6 })).toHaveLength(1);
  });

  it("reports a task that carries an issue but was never synced", () => {
    const entries = [task({ order: 1, issue: 42, state: "open" })];

    expect(staleTasks({ entries, now, maxAgeHours: 6 })).toHaveLength(1);
  });

  it("ignores a task with no issue at all", () => {
    const entries = [task({ order: 1, issue: null, state: null })];

    expect(staleTasks({ entries, now, maxAgeHours: 6 })).toEqual([]);
  });

  it("ignores a closed task however long ago it was synced", () => {
    const entries = [
      task({ order: 1, issue: 42, state: "closed", syncedAt: "2026-09-01T00:00:00Z" }),
    ];

    expect(staleTasks({ entries, now, maxAgeHours: 6 })).toEqual([]);
  });
});
