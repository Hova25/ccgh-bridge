import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";
import { markShipped, writeIssueNumbers, writeMirror } from "./mirror";

const taskFile = "harness/iterations/2026-09-13-1529-bootstrap/tasks/01-a.md";
const specFile = "harness/iterations/2026-09-13-1529-bootstrap/spec.md";

const taskContent = `---
title: Declare the schemas
order: 1
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

The body must survive untouched.
`;

const specContent = `---
title: Bootstrap
status: active
depends_on: []
impacts: []
validated_by: hovannes
launched_by: hovannes
---

Body.
`;

const tree = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "mirror-"));

  for (const [path, body] of [
    [taskFile, taskContent],
    [specFile, specContent],
  ] as const) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), body, "utf8");
  }

  return root;
};

const frontMatter = async ({
  root,
  path,
}: {
  root: string;
  path: string;
}): Promise<Record<string, unknown>> => matter(await readFile(join(root, path), "utf8")).data;

describe("writeIssueNumbers", () => {
  it("writes the number and returns the changed file", async () => {
    const root = await tree();

    const changed = await writeIssueNumbers({ root, created: [{ file: taskFile, number: 42 }] });

    expect(changed).toEqual([taskFile]);
    expect((await frontMatter({ root, path: taskFile })).issue).toBe(42);
  });

  it("leaves the body untouched", async () => {
    const root = await tree();
    await writeIssueNumbers({ root, created: [{ file: taskFile, number: 42 }] });

    expect(await readFile(join(root, taskFile), "utf8")).toMatch(
      /The body must survive untouched\./,
    );
  });
});

describe("writeMirror", () => {
  it("writes the state and stamps synced_at", async () => {
    const root = await tree();

    await writeMirror({
      root,
      file: taskFile,
      state: { state: "closed", pr: 51, merged_at: "2026-09-14T10:22:00Z" },
    });

    const github = (await frontMatter({ root, path: taskFile })).github as Record<string, unknown>;

    expect(github.state).toBe("closed");
    expect(github.pr).toBe(51);
    expect(typeof github.synced_at).toBe("string");
  });

  it("never touches issue or status", async () => {
    const root = await tree();
    await writeIssueNumbers({ root, created: [{ file: taskFile, number: 42 }] });
    await writeMirror({
      root,
      file: taskFile,
      state: { state: "open", pr: null, merged_at: null },
    });

    expect((await frontMatter({ root, path: taskFile })).issue).toBe(42);
  });
});

describe("markShipped", () => {
  it("moves an active iteration to shipped", async () => {
    const root = await tree();

    await markShipped({ root, specFile });

    expect((await frontMatter({ root, path: specFile })).status).toBe("shipped");
  });

  it("refuses to ship anything that is not active", async () => {
    const root = await tree();
    await markShipped({ root, specFile });

    const refusal = await markShipped({ root, specFile }).catch((error: Error) => error.message);

    expect(refusal).toMatch(/only an active iteration can ship/);
  });
});

describe("gray-matter caching", () => {
  it("does not leak a mutation between two files with identical content", async () => {
    const first = await tree();
    const second = await tree();

    await markShipped({ root: first, specFile });

    expect((await frontMatter({ root: second, path: specFile })).status).toBe("active");
  });

  it("writes below whatever root it was given, naming none of its own", async () => {
    const elsewhere = join(await mkdtemp(join(tmpdir(), "mirror-elsewhere-")), "elsewhere");

    await mkdir(join(elsewhere, "engine", "iterations", "2026-01-01-0900-a", "tasks"), {
      recursive: true,
    });
    await writeFile(
      join(elsewhere, "engine/iterations/2026-01-01-0900-a/tasks/01-a.md"),
      "---\ntitle: A\norder: 1\nissue: null\n---\n\n# A\n",
      "utf8",
    );

    await writeIssueNumbers({
      root: elsewhere,
      created: [{ file: "engine/iterations/2026-01-01-0900-a/tasks/01-a.md", number: 12 }],
    });

    const written = await readFile(
      join(elsewhere, "engine/iterations/2026-01-01-0900-a/tasks/01-a.md"),
      "utf8",
    );

    expect(written).toContain("issue: 12");
  });
});
