import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { plan, run } from "./docs";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ccgh-docs-"));
  await mkdir(join(root, ".git"));
  await mkdir(join(root, "docs", "ccgh-bridge", "engine"), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("what ccgh docs tells Astro", () => {
  it("points the loader at the repository being read, not at the plugin", () => {
    expect(plan({ argv: [], cwd: root }).content).toBe(join(root, "docs", "ccgh-bridge"));
  });

  it("writes its cache and its output into that repository, never beside the site", () => {
    const { cacheDir, outDir } = plan({ argv: [], cwd: root });

    expect(cacheDir).toBe(join(root, ".ccgh", "cache"));
    expect(outDir).toBe(join(root, ".ccgh", "site"));
  });

  it("serves rather than builds unless asked", () => {
    expect(plan({ argv: [], cwd: root }).mode).toBe("dev");
    expect(plan({ argv: ["--build"], cwd: root }).mode).toBe("build");
  });

  it("follows the content directory a repository configures", async () => {
    await writeFile(join(root, "ccgh.json"), '{ "content": "elsewhere" }', "utf8");

    expect(plan({ argv: [], cwd: root }).content).toBe(join(root, "elsewhere"));
  });

  it("takes the port it was given, and Astro's own default otherwise", () => {
    expect(plan({ argv: [], cwd: root }).port).toBeUndefined();
    expect(plan({ argv: ["--port", "4322"], cwd: root }).port).toBe("4322");
  });

  it("refuses when there is no content to render", async () => {
    await rm(join(root, "docs"), { recursive: true });

    expect(await run({ argv: [], cwd: root })).toBe(1);
  });

  it("builds where node_modules is, because Astro runs what it writes there", () => {
    const { buildDir, outDir } = plan({ argv: ["--build"], cwd: root });

    expect(buildDir.startsWith(root)).toBe(false);
    expect(outDir.startsWith(root)).toBe(true);
  });

  it("gives each repository its own build directory, so two never collide", async () => {
    const other = await mkdtemp(join(tmpdir(), "ccgh-other-"));
    await mkdir(join(other, ".git"));

    expect(plan({ argv: ["--build"], cwd: root }).buildDir).not.toBe(
      plan({ argv: ["--build"], cwd: other }).buildDir,
    );

    await rm(other, { recursive: true, force: true });
  });
});
