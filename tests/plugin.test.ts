import { describe, expect, it } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

const manifest = async (): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(join(root, ".claude-plugin/plugin.json"), "utf8"));

const skills = async (): Promise<string[]> => (await readdir(join(root, "skills"))).sort();

describe("the manifest", () => {
  it("names the plugin after the command, because the name prefixes every skill", async () => {
    expect((await manifest()).name).toBe("ccgh");
  });

  it("carries a description and a version", async () => {
    const parsed = await manifest();

    expect(typeof parsed.description).toBe("string");
    expect(parsed.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("every skill", () => {
  it("is a directory holding a SKILL.md", async () => {
    for (const name of await skills()) {
      const body = await readFile(join(root, "skills", name, "SKILL.md"), "utf8");

      expect(body.startsWith("---\n"), name).toBe(true);
    }
  });

  it("declares a name matching its directory, and a description", async () => {
    for (const name of await skills()) {
      const body = await readFile(join(root, "skills", name, "SKILL.md"), "utf8");

      expect(body, name).toContain(`name: ${name}`);
      expect(body.match(/^description: \S.*$/m), name).not.toBeNull();
    }
  });

  it("names no command and no path from the repository this came from", async () => {
    for (const name of await skills()) {
      const body = await readFile(join(root, "skills", name, "SKILL.md"), "utf8");

      expect(body, name).not.toContain("pnpm --filter");
      expect(body, name).not.toContain("src/content");
    }
  });
});
