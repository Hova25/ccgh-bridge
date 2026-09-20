import { describe, expect, it } from "bun:test";
import type { ParsedEntry } from "../validate";
import { checkStructure } from "./structure";

const task = (body: string): ParsedEntry => ({
  location: {
    kind: "task",
    domain: "harness",
    iteration: "2026-09-13-1529-bootstrap",
    reference: "harness/2026-09-13-1529-bootstrap",
    file: "harness/iterations/2026-09-13-1529-bootstrap/tasks/01-a.md",
  },
  data: { title: "T", order: 1 },
  body,
});

const wellFormed = [
  "# Declare the content schemas",
  "",
  "The whole contract rests on one module that both consumers can import.",
  "",
  "**Files**",
  "",
  "- Create: src/content-model/schemas.ts",
  "",
  "**Interfaces**",
  "",
  "- Produces: taskSchema",
  "",
  "---",
  "",
  "- [ ] **Step 1: do the thing**",
  "",
].join("\n");

const onlyInACodeSample = [
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
  "- Produces: nothing",
  "```",
  "",
].join("\n");

describe("checkStructure", () => {
  it("accepts a well-formed task", () => {
    expect(checkStructure([task(wellFormed)])).toEqual([]);
  });

  it("ignores entries that are not tasks", () => {
    const spec: ParsedEntry = {
      location: {
        kind: "iteration",
        domain: "harness",
        iteration: "2026-09-13-1529-bootstrap",
        reference: "harness/2026-09-13-1529-bootstrap",
        file: "harness/iterations/2026-09-13-1529-bootstrap/spec.md",
      },
      data: { title: "S", status: "draft" },
      body: "# Spec\n\nNo Files section here.\n",
    };

    expect(checkStructure([spec])).toEqual([]);
  });

  it("reports a task with no paragraph after the heading", () => {
    const body = "# Title\n\n**Files**\n\n- a\n\n**Interfaces**\n\n- b\n";

    expect(checkStructure([task(body)])[0]?.message).toMatch(/first paragraph/);
  });

  it("reports a missing Files section", () => {
    const body = "# Title\n\nSummary.\n\n**Interfaces**\n\n- b\n";

    expect(checkStructure([task(body)])[0]?.message).toMatch(/Files/);
  });

  it("reports a missing Interfaces section", () => {
    const body = "# Title\n\nSummary.\n\n**Files**\n\n- a\n";

    expect(checkStructure([task(body)])[0]?.message).toMatch(/Interfaces/);
  });

  it("ignores a section that only appears inside a code sample", () => {
    expect(checkStructure([task(onlyInACodeSample)])[0]?.message).toMatch(/Interfaces/);
  });

  it("reports every problem of a task at once", () => {
    expect(checkStructure([task("# Title\n")])).toHaveLength(3);
  });
});
