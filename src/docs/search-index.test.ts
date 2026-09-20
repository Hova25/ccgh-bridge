import { describe, expect, it } from "bun:test";
import { locate } from "../model/paths";
import type { ParsedEntry } from "../model/validate";
import { matches, type SearchRecord, searchIndexOf } from "./search-index";

const at = (file: string) => {
  const location = locate(file);

  if (!location) throw new Error(`no known shape for ${file}`);

  return location;
};

const entry = ({ file, title }: { file: string; title: string }): ParsedEntry => ({
  location: at(file),
  data: { title },
  body: "",
});

const records: SearchRecord[] = searchIndexOf({
  entries: [
    entry({ file: "harness/index.md", title: "Harness" }),
    entry({
      file: "harness/iterations/2026-09-13-1529-bootstrap/tasks/01-content-schemas.md",
      title: "Declare the content schemas",
    }),
    entry({ file: "harness/guide/workflow.md", title: "How work flows" }),
  ],
});

describe("searchIndexOf", () => {
  it("indexes a fix under its domain", () => {
    const records = searchIndexOf({
      entries: [
        {
          location: {
            kind: "fix",
            domain: "harness",
            iteration: null,
            reference: null,
            file: "harness/fixes/2026-09-14-mirror-the-milestone.md",
          },
          data: { title: "Mirror the milestone" },
          body: "",
        },
      ],
    });

    expect(records).toEqual([
      {
        title: "Mirror the milestone",
        path: "harness / fixes / 2026-09-14-mirror-the-milestone",
        url: "/harness/fixes/2026-09-14-mirror-the-milestone",
      },
    ]);
  });

  it("carries a title, a readable path and a url", () => {
    expect(records).toContainEqual({
      title: "Declare the content schemas",
      path: "harness / 2026-09-13-1529-bootstrap / 01-content-schemas",
      url: "/harness/2026-09-13-1529-bootstrap/01-content-schemas",
    });
  });
});

describe("matches", () => {
  it("finds on the title, case insensitively", () => {
    expect(matches({ records, query: "SCHEMAS" }).map((record) => record.title)).toEqual([
      "Declare the content schemas",
    ]);
  });

  it("finds on the path", () => {
    expect(matches({ records, query: "workflow" }).map((record) => record.title)).toEqual([
      "How work flows",
    ]);
  });

  it("ranks a title match above a path match", () => {
    expect(matches({ records, query: "harness" })[0]?.title).toBe("Harness");
  });

  it("returns nothing for an empty query", () => {
    expect(matches({ records, query: "  " })).toEqual([]);
  });
});
