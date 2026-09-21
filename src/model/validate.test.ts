import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadContent } from "./load";
import { validate } from "./validate";

const tree = async (files: Record<string, string>): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "content-"));

  for (const [path, body] of Object.entries(files)) {
    const full = join(root, path);
    await mkdir(join(full, ".."), { recursive: true });
    await writeFile(full, body, "utf8");
  }

  return root;
};

const validSpec = `---
title: Bootstrap
status: draft
---

Body.
`;

describe("validate", () => {
  it("returns no failure for a well-formed tree", async () => {
    const root = await tree({
      "harness/index.md": "---\ntitle: Harness\nsummary: The system itself\n---\n",
      "harness/iterations/2026-09-13-1529-bootstrap/spec.md": validSpec,
    });

    expect(validate(await loadContent(root))).toEqual([]);
  });

  it("reads a tree checked out with Windows line endings the way it reads any other", async () => {
    const crlf = (text: string): string => text.replaceAll("\n", "\r\n");
    const root = await tree({
      "harness/index.md": crlf("---\ntitle: Harness\nsummary: The system itself\n---\n"),
      "harness/iterations/2026-09-13-1529-bootstrap/spec.md": crlf(validSpec),
      "harness/iterations/2026-09-13-1529-bootstrap/tasks/01-a.md": crlf(
        [
          "---",
          "title: A",
          "order: 1",
          "---",
          "",
          "# A",
          "",
          "What it does.",
          "",
          "**Files**",
          "",
          "- Create: a.ts",
          "",
          "**Interfaces**",
          "",
          "- Produces: a",
          "",
        ].join("\n"),
      ),
    });

    expect(validate(await loadContent(root))).toEqual([]);
  });

  it("reports every schema failure rather than the first", async () => {
    const root = await tree({
      "harness/index.md": "---\ntitle: Harness\n---\n",
      "harness/iterations/2026-09-13-1529-bootstrap/spec.md": "---\nstatus: draft\n---\n",
    });

    const failures = validate(await loadContent(root));

    expect(failures).toHaveLength(2);
    expect(failures.map((failure) => failure.file).sort()).toEqual([
      "harness/index.md",
      "harness/iterations/2026-09-13-1529-bootstrap/spec.md",
    ]);
  });

  it("reports a file whose front matter cannot be parsed, naming that file", async () => {
    const root = await tree({
      "harness/index.md": "---\ntitle: Harness\nsummary: a thing: and another\n---\n",
    });

    const failures = validate(await loadContent(root));

    expect(failures).toHaveLength(1);
    expect(failures[0]?.file).toBe("harness/index.md");
    expect(failures[0]?.message).toMatch(/front matter/);
  });

  it("still validates the rest of the tree when one file is unreadable", async () => {
    const root = await tree({
      "harness/index.md": "---\ntitle: Harness\nsummary: a thing: and another\n---\n",
      "harness/iterations/2026-09-13-1529-bootstrap/spec.md": "---\nstatus: draft\n---\n",
    });

    const failures = validate(await loadContent(root));

    expect(failures.length).toBeGreaterThan(1);
    expect(failures.map((failure) => failure.file)).toContain(
      "harness/iterations/2026-09-13-1529-bootstrap/spec.md",
    );
  });

  it("reports a file whose location matches no known shape", async () => {
    const root = await tree({ "harness/notes.md": "---\ntitle: Notes\n---\n" });

    const failures = validate(await loadContent(root));

    expect(failures).toHaveLength(1);
    expect(failures[0]?.message).toMatch(/does not match any known content shape/);
  });
});
