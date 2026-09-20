import { describe, expect, it } from "bun:test";
import {
  decisionSchema,
  fixSchema,
  iterationReference,
  iterationSchema,
  taskSchema,
} from "./schemas";

describe("iterationSchema", () => {
  it("accepts a minimal draft and fills every optional field", () => {
    const parsed = iterationSchema.parse({ title: "Bootstrap", status: "draft" });

    expect(parsed.depends_on).toEqual([]);
    expect(parsed.impacts).toEqual([]);
    expect(parsed.validated_by).toBeNull();
    expect(parsed.launched_at).toBeNull();
  });

  it("rejects a status outside the lifecycle", () => {
    expect(() => iterationSchema.parse({ title: "Bootstrap", status: "approved" })).toThrow();
  });

  it("rejects a dependency that names a domain instead of an iteration", () => {
    expect(() =>
      iterationSchema.parse({ title: "Checkout", status: "draft", depends_on: ["auth"] }),
    ).toThrow();
  });

  it("accepts a dependency in domain/iteration form", () => {
    const parsed = iterationSchema.parse({
      title: "Checkout",
      status: "draft",
      depends_on: ["auth/2026-09-13-1200-password-login"],
      impacts: ["billing"],
    });

    expect(parsed.depends_on).toEqual(["auth/2026-09-13-1200-password-login"]);
  });
});

describe("taskSchema", () => {
  it("defaults the github mirror to empty values", () => {
    const parsed = taskSchema.parse({ title: "Hash passwords", order: 1 });

    expect(parsed.issue).toBeNull();
    expect(parsed.github.state).toBeNull();
    expect(parsed.github.synced_at).toBeNull();
  });

  it("rejects a github state the bridge would never write", () => {
    expect(() =>
      taskSchema.parse({ title: "Hash passwords", order: 1, github: { state: "merged" } }),
    ).toThrow();
  });
});

describe("decisionSchema", () => {
  it("carries the record it supersedes", () => {
    const parsed = decisionSchema.parse({
      title: "Replace the mirror",
      date: "2026-10-01",
      status: "accepted",
      supersedes: "002",
    });

    expect(parsed.supersedes).toBe("002");
  });
});

describe("fixSchema", () => {
  it("fills a fix's generated fields with nulls", () => {
    const parsed = fixSchema.parse({ title: "Mirror the milestone", date: "2026-09-14" });

    expect(parsed.issue).toBeNull();
    expect(parsed.pr).toBeNull();
  });

  it("refuses a fix without a date", () => {
    expect(() => fixSchema.parse({ title: "Mirror the milestone" })).toThrow();
  });
});

describe("iterationReference", () => {
  it("parses a reference named to the minute and refuses one named to the day", () => {
    expect(iterationReference.safeParse("harness/2026-09-13-1529-bootstrap").success).toBe(true);
    expect(iterationReference.safeParse("harness/2026-09-13-example").success).toBe(false);
  });
});
