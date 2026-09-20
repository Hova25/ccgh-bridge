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
  it("is one of the eight, and all eight are here", async () => {
    expect(await skills()).toEqual([
      "decompose-into-tasks",
      "launch-iteration",
      "open-fix",
      "open-iteration",
      "ship-iteration",
      "validate-iteration",
      "write-brainstorm",
      "write-spec",
    ]);
  });

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

describe("the hook wiring", () => {
  const registrations = async (): Promise<Array<{ type: string; command: string }>> => {
    const parsed = JSON.parse(await readFile(join(root, "hooks/hooks.json"), "utf8"));

    return Object.values(parsed.hooks as Record<string, Array<{ hooks: never[] }>>)
      .flat()
      .flatMap((matcher) => matcher.hooks);
  };

  it("registers every rule that exists, because a rule nobody runs looks like a rule that passes", async () => {
    const written = (await readdir(join(root, "hooks/rules")))
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
      .map((name) => name.replace(/\.ts$/, ""))
      .sort();
    const registered = [
      ...new Set((await registrations()).map((hook) => hook.command.split(" ").pop() as string)),
    ].sort();

    expect(registered).toEqual(written);
  });

  it("names a command that resolves to a file", async () => {
    for (const hook of await registrations()) {
      const [, entry, rule] = hook.command.split(" ");

      expect(hook.type).toBe("command");
      expect(entry).toContain("hooks/run.ts");
      expect(await Bun.file(join(root, "hooks/rules", `${rule}.ts`)).exists(), rule).toBe(true);
    }
  });
});

describe("the marketplace entry", () => {
  const marketplace = async (): Promise<{
    name: string;
    plugins: Array<{ name: string; source: string }>;
  }> => JSON.parse(await readFile(join(root, ".claude-plugin/marketplace.json"), "utf8"));

  it("points at a plugin that exists, by the name the manifest declares", async () => {
    const entry = await marketplace();

    expect(entry.plugins).toHaveLength(1);
    expect(entry.plugins[0]?.name).toBe((await manifest()).name as string);
  });

  it("is the marketplace this repository's settings enable", async () => {
    const entry = await marketplace();
    const settings = JSON.parse(await readFile(join(root, ".claude/settings.json"), "utf8"));

    expect(Object.keys(settings.extraKnownMarketplaces)).toEqual([entry.name]);
    expect(Object.keys(settings.enabledPlugins)).toEqual([
      `${entry.plugins[0]?.name}@${entry.name}`,
    ]);
  });
});

describe("the site", () => {
  const sourceFiles = async (directory: string): Promise<string[]> => {
    const found: string[] = [];

    for (const item of await readdir(directory, { withFileTypes: true })) {
      const full = join(directory, item.name);

      if (item.isDirectory()) found.push(...(await sourceFiles(full)));
      else found.push(full);
    }

    return found;
  };

  it("carries no name from the repository this came from", async () => {
    const directories = [join(root, "site", "src"), join(root, "src", "docs")];

    for (const file of (await Promise.all(directories.map(sourceFiles))).flat()) {
      expect(await readFile(file, "utf8"), file).not.toMatch(/nauvia/i);
    }
  });

  it("has a page for every kind the validator accepts", async () => {
    const pages = (await sourceFiles(join(root, "site", "src", "pages")))
      .map((file) => file.slice(join(root, "site", "src", "pages").length + 1))
      .sort();

    expect(pages).toEqual([
      "[domain]/[iteration]/[task].astro",
      "[domain]/[iteration]/brainstorm.astro",
      "[domain]/[iteration]/index.astro",
      "[domain]/decisions/[record].astro",
      "[domain]/fixes/[fix].astro",
      "[domain]/guide/[page].astro",
      "[domain]/index.astro",
      "index.astro",
      "search-index.json.ts",
    ]);
  });
});
