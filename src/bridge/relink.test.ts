import { describe, expect, it } from "bun:test";
import { namesRewritten, planRelink, readTable } from "./relink";

const table = [
  { from: "2026-09-13-example", to: "2026-09-13-1529-example" },
  { from: "2026-09-13-example-fix", to: "2026-09-13-2248-example-fix" },
];
const prefix = "https://github.com/o/r/blob/main/apps/development-documentation/src/content/";

describe("planRelink", () => {
  it("rewrites a body the bridge wrote", () => {
    const bodies = [
      {
        number: 4,
        kind: "issue" as const,
        body: `Full detail: ${prefix}harness/iterations/2026-09-13-example/tasks/01-a.md`,
      },
    ];

    expect(planRelink({ bodies, table })).toEqual([
      {
        number: 4,
        kind: "issue",
        body: `Full detail: ${prefix}harness/iterations/2026-09-13-1529-example/tasks/01-a.md`,
      },
    ]);
  });

  it("rewrites the marker and the link together, longest name first", () => {
    const bodies = [
      {
        number: 12,
        kind: "issue" as const,
        body: [
          `${prefix}harness/fixes/2026-09-13-example-fix.md`,
          "<!-- generated-from: harness/fixes/2026-09-13-example-fix.md -->",
        ].join("\n"),
      },
    ];

    expect(planRelink({ bodies, table })[0]?.body).toBe(
      [
        `${prefix}harness/fixes/2026-09-13-2248-example-fix.md`,
        "<!-- generated-from: harness/fixes/2026-09-13-2248-example-fix.md -->",
      ].join("\n"),
    );
  });

  it("recognises a fix issue by its marker alone, since it carries no link", () => {
    const bodies = [
      {
        number: 12,
        kind: "issue" as const,
        body: [
          "A fix in `harness`, recorded at `harness/fixes/2026-09-13-example-fix.md`, under review in #3.",
          "<!-- generated-from: harness/fixes/2026-09-13-example-fix.md -->",
        ].join("\n"),
      },
    ];

    expect(planRelink({ bodies, table })[0]?.body).toContain(
      "recorded at `harness/fixes/2026-09-13-2248-example-fix.md`",
    );
  });

  it("leaves a body that only quotes the marker mid-way alone", () => {
    const bodies = [
      {
        number: 101,
        kind: "pull" as const,
        body: "the bridge read `<!-- generated-from: harness/fixes/2026-09-13-example-fix.md -->` as a source\n\nand so on.",
      },
    ];

    expect(planRelink({ bodies, table })).toEqual([]);
  });

  it("leaves a body it did not write alone, even if it names an old path", () => {
    const bodies = [
      { number: 9, kind: "issue" as const, body: "someone wrote harness/2026-09-13-example here" },
    ];

    expect(planRelink({ bodies, table })).toEqual([]);
  });

  it("skips a body that would not change", () => {
    const bodies = [
      {
        number: 5,
        kind: "pull" as const,
        body: `${prefix}harness/iterations/2026-09-13-1529-example/spec.md`,
      },
    ];

    expect(planRelink({ bodies, table })).toEqual([]);
  });
});

describe("readTable", () => {
  it("reads the rows of the committed table and nothing else", () => {
    const markdown = [
      "# Rename table",
      "",
      "Prose that mentions `2026-09-13-example` in passing.",
      "",
      "| From | To |",
      "| --- | --- |",
      "| `2026-09-13-example` | `2026-09-13-1529-example` |",
      "| `2026-09-13-example-fix` | `2026-09-13-2248-example-fix` |",
    ].join("\n");

    expect(readTable(markdown)).toEqual(table);
  });
});

describe("namesRewritten", () => {
  it("counts the old names a body carried", () => {
    expect(
      namesRewritten({ before: "a 2026-09-13-example and 2026-09-13-example-fix", table }),
    ).toBe(2);
  });
});
