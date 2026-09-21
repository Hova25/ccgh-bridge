import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "./init";

let root = "";

const workflows = join(".github", "workflows");

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ccgh-init-"));
  await mkdir(join(root, ".git"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("ccgh init", () => {
  it("writes the five workflows", async () => {
    expect(await run({ argv: [], cwd: root })).toBe(0);

    expect((await readdir(join(root, workflows))).sort()).toEqual([
      "ccgh-fixes.yml",
      "ccgh-push.yml",
      "ccgh-reconcile.yml",
      "ccgh-sync.yml",
      "ccgh-validate.yml",
    ]);
  });

  it("points them at the reference it was given, and remembers it", async () => {
    await run({ argv: ["--from", "Hova25/ccgh-bridge@main"], cwd: root });

    const written = await readFile(join(root, workflows, "ccgh-push.yml"), "utf8");

    expect(written).toContain("uses: Hova25/ccgh-bridge@main");
    expect(JSON.parse(await readFile(join(root, "ccgh.json"), "utf8")).action).toBe(
      "Hova25/ccgh-bridge@main",
    );
  });

  it("defaults to the published reference", async () => {
    await run({ argv: [], cwd: root });

    expect(await readFile(join(root, workflows, "ccgh-push.yml"), "utf8")).toContain(
      "uses: Hova25/ccgh-bridge@v1",
    );
  });

  it("is re-runnable, rewriting what it wrote", async () => {
    await run({ argv: [], cwd: root });

    expect(await run({ argv: [], cwd: root })).toBe(0);
  });

  it("refuses a file it did not write, names it, and writes the rest", async () => {
    await mkdir(join(root, workflows), { recursive: true });
    await writeFile(join(root, workflows, "ccgh-push.yml"), "name: mine\n", "utf8");

    expect(await run({ argv: [], cwd: root })).toBe(1);
    expect(await readFile(join(root, workflows, "ccgh-push.yml"), "utf8")).toBe("name: mine\n");
    expect(await readdir(join(root, workflows))).toContain("ccgh-sync.yml");
  });

  it("marks every file it owns, because ownership is what makes re-running safe", async () => {
    await run({ argv: [], cwd: root });

    for (const name of await readdir(join(root, workflows))) {
      const written = await readFile(join(root, workflows, name), "utf8");

      expect(written.startsWith("# written by ccgh init"), name).toBe(true);
    }
  });

  it("writes no pages workflow for a repository that has not said where it publishes", async () => {
    await run({ argv: [], cwd: root });

    expect(await readdir(join(root, workflows))).not.toContain("ccgh-pages.yml");
  });

  it("writes one when it has", async () => {
    await writeFile(join(root, "ccgh.json"), '{ "site": "https://x.github.io/repo" }', "utf8");

    await run({ argv: [], cwd: root });

    expect(await readdir(join(root, workflows))).toContain("ccgh-pages.yml");
  });

  it("removes it again when the key goes away, rather than leaving a job that can only fail", async () => {
    await writeFile(join(root, "ccgh.json"), '{ "site": "https://x.github.io/repo" }', "utf8");
    await run({ argv: [], cwd: root });

    await writeFile(join(root, "ccgh.json"), "{}", "utf8");
    await run({ argv: [], cwd: root });

    expect(await readdir(join(root, workflows))).not.toContain("ccgh-pages.yml");
  });

  it("leaves a pages workflow it did not write, even when the key is gone", async () => {
    await mkdir(join(root, workflows), { recursive: true });
    await writeFile(join(root, workflows, "ccgh-pages.yml"), "name: mine\n", "utf8");

    await run({ argv: [], cwd: root });

    expect(await readFile(join(root, workflows, "ccgh-pages.yml"), "utf8")).toBe("name: mine\n");
  });
});
