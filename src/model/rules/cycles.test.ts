import { describe, expect, it } from "bun:test";
import type { ParsedEntry } from "../validate";
import { checkCycles } from "./cycles";

const iteration = ({
  reference,
  dependsOn,
}: {
  reference: string;
  dependsOn: string[];
}): ParsedEntry => {
  const [domain, slug] = reference.split("/") as [string, string];

  return {
    location: {
      kind: "iteration",
      domain,
      iteration: slug,
      reference,
      file: `${domain}/iterations/${slug}/spec.md`,
    },
    data: { title: "T", status: "draft", depends_on: dependsOn, impacts: [] },
    body: "",
  };
};

describe("checkCycles", () => {
  it("accepts a chain", () => {
    const entries = [
      iteration({ reference: "a/2026-01-01-one", dependsOn: [] }),
      iteration({ reference: "b/2026-01-02-two", dependsOn: ["a/2026-01-01-one"] }),
      iteration({ reference: "c/2026-01-03-three", dependsOn: ["b/2026-01-02-two"] }),
    ];

    expect(checkCycles(entries)).toEqual([]);
  });

  it("accepts a diamond", () => {
    const entries = [
      iteration({ reference: "a/2026-01-01-one", dependsOn: [] }),
      iteration({ reference: "b/2026-01-02-two", dependsOn: ["a/2026-01-01-one"] }),
      iteration({ reference: "c/2026-01-03-three", dependsOn: ["a/2026-01-01-one"] }),
      iteration({
        reference: "d/2026-01-04-four",
        dependsOn: ["b/2026-01-02-two", "c/2026-01-03-three"],
      }),
    ];

    expect(checkCycles(entries)).toEqual([]);
  });

  it("reports a cycle once per member and names the path", () => {
    const entries = [
      iteration({ reference: "a/2026-01-01-one", dependsOn: ["c/2026-01-03-three"] }),
      iteration({ reference: "b/2026-01-02-two", dependsOn: ["a/2026-01-01-one"] }),
      iteration({ reference: "c/2026-01-03-three", dependsOn: ["b/2026-01-02-two"] }),
    ];

    const failures = checkCycles(entries);

    expect(failures).toHaveLength(3);
    expect(failures[0]?.message).toMatch(/dependency cycle/);
  });
});
