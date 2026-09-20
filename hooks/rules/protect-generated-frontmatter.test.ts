import { describe, expect, it } from "bun:test";
import { fake } from "../fake-context";
import { decide } from "./protect-generated-frontmatter";

const content = "docs/ccgh-bridge";
const spec = `${content}/harness/iterations/2026-09-13-1529-bootstrap/spec.md`;
const task = `${content}/harness/iterations/2026-09-13-1529-bootstrap/tasks/01-a.md`;
const decision = `${content}/github-bridge/decisions/004-what-the-first-green-run-revealed.md`;

const write = ({ file, text, exists = true }: { file: string; text: string; exists?: boolean }) =>
  decide({
    input: { tool_input: { file_path: file, content: text } },
    context: fake({ fileExists: () => exists, content: () => content }),
  });

const frontMatter = (fields: string) => `---\n${fields}\n---\n\n# Title\n`;

describe("protect-generated-frontmatter", () => {
  it("ignores a file outside the content tree", () => {
    expect(write({ file: "README.md", text: frontMatter("status: shipped") })).toBeNull();
  });

  it("allows a new specification to be born draft", () => {
    expect(write({ file: spec, text: frontMatter("status: draft"), exists: false })).toBeNull();
  });

  it("refuses to promote a specification by hand", () => {
    expect(write({ file: spec, text: frontMatter("status: ready") })).toMatch(/promotion script/);
    expect(write({ file: spec, text: frontMatter("status: draft") })).toMatch(/promotion script/);
  });

  it("lets a decision record carry the status its schema requires", () => {
    expect(
      write({ file: decision, text: frontMatter("status: accepted"), exists: false }),
    ).toBeNull();
    expect(write({ file: decision, text: frontMatter("status: superseded") })).toBeNull();
  });

  it("still refuses the bridge's fields everywhere", () => {
    expect(write({ file: task, text: frontMatter("issue: 42") })).toMatch(/GitHub bridge/);
    expect(write({ file: decision, text: frontMatter("pr: 12") })).toMatch(/GitHub bridge/);
  });

  it("accepts the null scaffolding of a fresh task", () => {
    expect(
      write({
        file: task,
        text: frontMatter("issue: null\ngithub:\n  state: null\n  pr: null"),
        exists: false,
      }),
    ).toBeNull();
  });
});
