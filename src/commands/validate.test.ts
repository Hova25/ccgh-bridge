import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "./validate";

const content = join("docs", "ccgh-bridge");

let root = "";

const write = async ({ file, body }: { file: string; body: string }): Promise<void> => {
  await mkdir(join(root, content, file, ".."), { recursive: true });
  await writeFile(join(root, content, file), body, "utf8");
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ccgh-validate-"));
  await mkdir(join(root, ".git"));
  await mkdir(join(root, content), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("ccgh validate", () => {
  it("accepts a well-formed tree", async () => {
    await write({
      file: "engine/index.md",
      body: "---\ntitle: Engine\nsummary: The engine.\n---\n\nProse.\n",
    });

    expect(await run({ argv: [], cwd: root })).toBe(0);
  });

  it("refuses a domain missing its summary", async () => {
    await write({ file: "engine/index.md", body: "---\ntitle: Engine\n---\n\nProse.\n" });

    expect(await run({ argv: [], cwd: root })).toBe(1);
  });

  it("reads the root ccgh.json names rather than the convention", async () => {
    await writeFile(join(root, "ccgh.json"), '{ "content": "elsewhere" }', "utf8");
    await mkdir(join(root, "elsewhere", "engine"), { recursive: true });
    await writeFile(
      join(root, "elsewhere", "engine", "index.md"),
      "---\ntitle: Engine\n---\n\nProse.\n",
      "utf8",
    );

    expect(await run({ argv: [], cwd: root })).toBe(1);
  });

  it("says so when the content directory does not exist", async () => {
    await rm(join(root, content), { recursive: true });

    expect(await run({ argv: [], cwd: root })).toBe(1);
  });
});
