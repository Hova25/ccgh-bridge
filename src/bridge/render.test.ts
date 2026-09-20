import { describe, expect, it } from "bun:test";
import type { ParsedEntry } from "../model/validate";
import { fileFromMarker, renderIssue } from "./render";

const body = [
  "# Declare the content schemas in a framework-free module",
  "",
  "The whole contract rests on one module that both Astro and the standalone validator can",
  "import.",
  "",
  "**Files**",
  "",
  "- Create: `src/content-model/schemas.ts`",
  "- Test: `src/content-model/schemas.test.ts`",
  "",
  "**Interfaces**",
  "",
  "- Consumes: nothing.",
  "- Produces: `domainSchema`, `taskSchema`.",
  "",
  "---",
  "",
  "- [ ] **Step 1: Scaffold the package**",
  "",
].join("\n");

const task = (): ParsedEntry => ({
  location: {
    kind: "task",
    domain: "harness",
    iteration: "2026-09-13-1529-bootstrap",
    reference: "harness/2026-09-13-1529-bootstrap",
    file: "harness/iterations/2026-09-13-1529-bootstrap/tasks/01-content-schemas.md",
  },
  data: { title: "Declare the content schemas in a framework-free module", order: 1 },
  body,
});

const context = { total: 14, url: "https://example.test/task" };

describe("renderIssue", () => {
  it("takes the title from the front matter, not the heading", () => {
    expect(renderIssue({ task: task(), ...context }).title).toBe(
      "Declare the content schemas in a framework-free module",
    );
  });

  it("derives the milestone and the label from the path", () => {
    const rendered = renderIssue({ task: task(), ...context });

    expect(rendered.milestone).toBe("harness/2026-09-13-1529-bootstrap");
    expect(rendered.labels).toEqual(["harness"]);
  });

  it("opens with the first paragraph and omits the heading", () => {
    const rendered = renderIssue({ task: task(), ...context });

    expect(rendered.body.startsWith("The whole contract rests on one module")).toBe(true);
    expect(rendered.body).not.toMatch(/^#\s/m);
  });

  it("carries the Files and Interfaces sections, and not the steps", () => {
    const rendered = renderIssue({ task: task(), ...context });

    expect(rendered.body).toMatch(/\*\*Files\*\*/);
    expect(rendered.body).toMatch(/src\/content-model\/schemas\.ts/);
    expect(rendered.body).toMatch(/Produces: `domainSchema`, `taskSchema`\./);
    expect(rendered.body).toMatch(/Consumes: nothing\./);
    expect(rendered.body).not.toMatch(/Scaffold the package/);
  });

  it("keeps a code block that belongs to a section", () => {
    const withTypes = task();
    withTypes.body = [
      "# Title",
      "",
      "Summary.",
      "",
      "**Files**",
      "",
      "- a",
      "",
      "**Interfaces**",
      "",
      "- Produces:",
      "",
      "```ts",
      "type RemoteIssue = { number: number };",
      "```",
      "",
      "---",
      "",
    ].join("\n");

    expect(renderIssue({ task: withTypes, ...context }).body).toMatch(/type RemoteIssue/);
  });

  it("ends with the reference line and the marker", () => {
    const rendered = renderIssue({ task: task(), ...context });

    expect(rendered.body).toMatch(/`harness\/2026-09-13-1529-bootstrap` · task 1 of 14/);
    expect(rendered.body).toMatch(/\[full detail\]\(https:\/\/example\.test\/task\)/);
    expect(rendered.body.trimEnd().endsWith("-->")).toBe(true);
  });

  it("renders the same body twice for the same input", () => {
    expect(renderIssue({ task: task(), ...context }).body).toBe(
      renderIssue({ task: task(), ...context }).body,
    );
  });

  it("does not let a fenced sample stand in for the real section", () => {
    const withSample = task();
    withSample.body = [
      "# Title",
      "",
      "Summary.",
      "",
      "**Files**",
      "",
      "- a",
      "",
      "```md",
      "**Interfaces**",
      "",
      "- Produces: the decoy",
      "```",
      "",
      "**Interfaces**",
      "",
      "- Produces: the real one",
      "",
      "---",
      "",
    ].join("\n");

    const rendered = renderIssue({ task: withSample, ...context }).body;

    expect(rendered).toMatch(/the real one/);
    expect(rendered.indexOf("the real one")).toBeGreaterThan(rendered.indexOf("the decoy"));
  });
});

describe("fileFromMarker", () => {
  it("takes the last marker, not an example quoted in the body", () => {
    const body = [
      "A task whose own text shows a marker:",
      "",
      "    <!-- generated-from: harness/fixes/2026-09-14-a.md -->",
      "",
      "---",
      "<!-- generated-from: harness/iterations/2026-09-14-x/tasks/07-a.md -->",
    ].join("\n");

    expect(fileFromMarker(body)).toBe("harness/iterations/2026-09-14-x/tasks/07-a.md");
  });

  it("recovers the file an issue was generated from", () => {
    expect(fileFromMarker(renderIssue({ task: task(), ...context }).body)).toBe(
      "harness/iterations/2026-09-13-1529-bootstrap/tasks/01-content-schemas.md",
    );
  });

  it("returns null for a body written by a human", () => {
    expect(fileFromMarker("Just a normal issue someone opened.")).toBeNull();
  });

  it("links back through whatever URL it was handed, naming no content root of its own", () => {
    const rendered = renderIssue({
      task: task(),
      total: 3,
      url: "https://github.com/o/r/blob/main/elsewhere/engine/iterations/i/tasks/01-a.md",
    });

    // The task's own prose may say anything; what matters is that the renderer adds no path
    // of its own beside the URL it was handed.
    expect(rendered.body).toContain("/blob/main/elsewhere/engine/");
    expect(rendered.body).not.toMatch(/blob\/main\/(?!elsewhere\/)/);
  });
});
