import { describe, expect, it } from "bun:test";
import { locate } from "../model/paths";
import { slugOf } from "./leaf";

describe("slugOf", () => {
  it("is the file name of a decision, without its extension", () => {
    const location = locate("engine/decisions/001-commit-the-configuration.md");

    expect(slugOf(location as never)).toBe("001-commit-the-configuration");
  });

  it("is the file name of a task, so two iterations may both hold an 01", () => {
    const location = locate("engine/iterations/2026-01-01-0900-a/tasks/01-first.md");

    expect(slugOf(location as never)).toBe("01-first");
  });

  it("is the file name of a fix, which carries its own date", () => {
    const location = locate("engine/fixes/2026-01-01-0900-a-defect.md");

    expect(slugOf(location as never)).toBe("2026-01-01-0900-a-defect");
  });
});
