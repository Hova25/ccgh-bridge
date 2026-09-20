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
