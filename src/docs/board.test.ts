import { describe, expect, it } from "bun:test";
import type { ParsedEntry } from "../model/validate";
import { boardOf } from "./board";

const iteration = ({
  domain,
  slug,
  status,
  dependsOn = [],
}: {
  domain: string;
  slug: string;
  status: string;
  dependsOn?: string[];
}): ParsedEntry => ({
  location: {
    kind: "iteration",
    domain,
    iteration: slug,
    reference: `${domain}/${slug}`,
    file: `${domain}/iterations/${slug}/spec.md`,
  },
  data: { title: `${domain} work`, status, depends_on: dependsOn, impacts: [] },
  body: "",
});

const task = ({
  domain,
  slug,
  order,
  state,
}: {
  domain: string;
  slug: string;
  order: number;
  state: string | null;
}): ParsedEntry => ({
  location: {
    kind: "task",
    domain,
    iteration: slug,
    reference: `${domain}/${slug}`,
    file: `${domain}/iterations/${slug}/tasks/0${order}-a.md`,
  },
  data: { title: `Task ${order}`, order, issue: 1, github: { state } },
  body: "",
});

describe("boardOf", () => {
  it("puts an active iteration in flight, with its done count", () => {
    const board = boardOf({
      entries: [
        iteration({ domain: "harness", slug: "2026-09-13-a", status: "active" }),
        task({ domain: "harness", slug: "2026-09-13-a", order: 1, state: "closed" }),
        task({ domain: "harness", slug: "2026-09-13-a", order: 2, state: "open" }),
      ],
    });

    expect(board.inFlight).toHaveLength(1);
    expect(board.inFlight[0]).toMatchObject({ taskCount: 2, doneCount: 1 });
  });

  it("counts a merged task as done even while its issue is open", () => {
    const merged = task({ domain: "harness", slug: "2026-09-13-a", order: 1, state: "open" });
    (merged.data.github as Record<string, unknown>).merged_at = "2026-09-13T21:00:00Z";

    const board = boardOf({
      entries: [iteration({ domain: "harness", slug: "2026-09-13-a", status: "active" }), merged],
    });

    expect(board.inFlight[0]).toMatchObject({ taskCount: 1, doneCount: 1 });
  });

  it("calls a ready iteration launchable when it depends on nothing", () => {
    const board = boardOf({
      entries: [iteration({ domain: "auth", slug: "2026-10-01-sso", status: "ready" })],
    });

    expect(board.launchable.map((entry) => entry.reference)).toEqual(["auth/2026-10-01-sso"]);
    expect(board.blocked).toEqual([]);
  });

  it("blocks a ready iteration whose dependency is not shipped, and names it", () => {
    const board = boardOf({
      entries: [
        iteration({ domain: "auth", slug: "2026-10-01-sso", status: "ready" }),
        iteration({
          domain: "billing",
          slug: "2026-10-05-stripe",
          status: "ready",
          dependsOn: ["auth/2026-10-01-sso"],
        }),
      ],
    });

    expect(board.blocked[0]).toMatchObject({
      reference: "billing/2026-10-05-stripe",
      blockedBy: ["auth/2026-10-01-sso"],
    });
    expect(board.launchable.map((entry) => entry.reference)).toEqual(["auth/2026-10-01-sso"]);
  });

  it("unblocks once the dependency ships", () => {
    const board = boardOf({
      entries: [
        iteration({ domain: "auth", slug: "2026-10-01-sso", status: "shipped" }),
        iteration({
          domain: "billing",
          slug: "2026-10-05-stripe",
          status: "ready",
          dependsOn: ["auth/2026-10-01-sso"],
        }),
      ],
    });

    expect(board.blocked).toEqual([]);
    expect(board.launchable.map((entry) => entry.reference)).toEqual(["billing/2026-10-05-stripe"]);
  });

  it("blocks on a dependency that does not exist, rather than ignoring it", () => {
    const board = boardOf({
      entries: [
        iteration({
          domain: "billing",
          slug: "2026-10-05-stripe",
          status: "ready",
          dependsOn: ["auth/2026-10-01-missing"],
        }),
      ],
    });

    expect(board.blocked[0]?.blockedBy).toEqual(["auth/2026-10-01-missing"]);
  });

  it("leaves drafts out of every group", () => {
    const board = boardOf({
      entries: [iteration({ domain: "harness", slug: "2026-09-13-a", status: "draft" })],
    });

    expect([...board.inFlight, ...board.launchable, ...board.blocked, ...board.shipped]).toEqual(
      [],
    );
  });

  it("lists shipped iterations most recent first", () => {
    const board = boardOf({
      entries: [
        iteration({ domain: "a", slug: "2026-09-13-one", status: "shipped" }),
        iteration({ domain: "b", slug: "2026-10-01-two", status: "shipped" }),
      ],
    });

    expect(board.shipped.map((entry) => entry.reference)).toEqual([
      "b/2026-10-01-two",
      "a/2026-09-13-one",
    ]);
  });
});
