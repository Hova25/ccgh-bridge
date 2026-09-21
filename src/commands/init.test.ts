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

  it("makes the sync fire on a merge as well as on the issue it closed", async () => {
    await run({ argv: [], cwd: root });

    const sync = await readFile(join(root, workflows, "ccgh-sync.yml"), "utf8");

    expect(sync).toMatch(/push:\s*\n\s*branches: \[main\]/);
  });

  it("leaves ccgh.json alone when it has nothing to change there", async () => {
    const formatted =
      '{ "check": ["bun run lint"], "language": { "refuse": [] }, "action": "Hova25/ccgh-bridge@v1" }\n';
    await writeFile(join(root, "ccgh.json"), formatted, "utf8");

    await run({ argv: [], cwd: root });

    // Rewriting a file it did not change reformats it, and a repository whose formatter
    // disagrees then fails its own lint for no reason.
    expect(await readFile(join(root, "ccgh.json"), "utf8")).toBe(formatted);
  });

  it("writes an empty refused language when ccgh.json names none", async () => {
    await run({ argv: [], cwd: root });

    expect(JSON.parse(await readFile(join(root, "ccgh.json"), "utf8")).language).toEqual({
      refuse: [],
    });
  });

  it("keeps the refused language a repository chose", async () => {
    await writeFile(
      join(root, "ccgh.json"),
      '{ "language": { "refuse": ["dies", "ist"] } }',
      "utf8",
    );

    await run({ argv: [], cwd: root });

    expect(JSON.parse(await readFile(join(root, "ccgh.json"), "utf8")).language).toEqual({
      refuse: ["dies", "ist"],
    });
  });
});

describe("ccgh init and CLAUDE.md", () => {
  const instructions = () => readFile(join(root, "CLAUDE.md"), "utf8");

  it("creates it when there is none, holding only its own block", async () => {
    await run({ argv: [], cwd: root });

    const written = await instructions();

    expect(written.startsWith("<!-- ccgh:begin")).toBe(true);
    expect(written.trimEnd().endsWith("<!-- ccgh:end -->")).toBe(true);
    expect(written).toContain("/ccgh:open-fix <domain>/<slug>");
  });

  it("names the content directory the repository configured", async () => {
    await writeFile(join(root, "ccgh.json"), '{ "content": "handbook" }', "utf8");

    await run({ argv: [], cwd: root });

    expect(await instructions()).toContain("`handbook/`");
  });

  it("appends its block to one it did not write, leaving what was there untouched", async () => {
    const own = "# Mine\n\nMy own rules.\n";
    await writeFile(join(root, "CLAUDE.md"), own, "utf8");

    await run({ argv: [], cwd: root });

    expect((await instructions()).startsWith(`${own}\n<!-- ccgh:begin`)).toBe(true);
  });

  it("replaces only its block when re-run, keeping what surrounds it", async () => {
    await writeFile(join(root, "CLAUDE.md"), "# Mine\n", "utf8");
    await run({ argv: [], cwd: root });

    const stale = (await instructions()).replace("The ccgh lifecycle", "Stale heading");
    await writeFile(join(root, "CLAUDE.md"), `${stale}\n## After\n`, "utf8");

    expect(await run({ argv: [], cwd: root })).toBe(0);

    const written = await instructions();

    expect(written.startsWith("# Mine\n")).toBe(true);
    expect(written.endsWith("\n## After\n")).toBe(true);
    expect(written).not.toContain("Stale heading");
    expect(written.match(/<!-- ccgh:begin/g)).toHaveLength(1);
  });

  it("refuses one whose block lost its end marker, rather than guessing where it stops", async () => {
    const broken = "# Mine\n\n<!-- ccgh:begin -->\nhalf a block\n";
    await writeFile(join(root, "CLAUDE.md"), broken, "utf8");

    expect(await run({ argv: [], cwd: root })).toBe(1);
    expect(await instructions()).toBe(broken);
  });
});

describe("ccgh init and the repository's checks", () => {
  const validate = async ({ files }: { files: Record<string, string> }) => {
    await writeFile(join(root, "ccgh.json"), '{ "check": ["npm run lint"] }\n', "utf8");

    for (const [name, content] of Object.entries(files)) {
      await writeFile(join(root, name), content, "utf8");
    }

    await run({ argv: [], cwd: root });

    return readFile(join(root, workflows, "ccgh-validate.yml"), "utf8");
  };

  it("installs with bun when the repository has a bun lockfile", async () => {
    const written = await validate({ files: { "package.json": "{}", "bun.lock": "" } });

    expect(written).toContain("uses: oven-sh/setup-bun@v2");
    expect(written).toContain("run: bun install --frozen-lockfile");
    expect(written.trimEnd().endsWith("- run: npm run lint")).toBe(true);
  });

  it("installs with pnpm, letting package.json name its version", async () => {
    const written = await validate({
      files: { "package.json": '{ "packageManager": "pnpm@10.23.0" }', "pnpm-lock.yaml": "" },
    });

    expect(written).toContain("uses: pnpm/action-setup@v4");
    expect(written).not.toContain("version: latest");
    expect(written).toContain("cache: pnpm");
    expect(written).toContain("run: pnpm install --frozen-lockfile");
    expect(written).not.toContain("setup-bun");
  });

  it("asks pnpm/action-setup for a version when package.json names none", async () => {
    const written = await validate({ files: { "package.json": "{}", "pnpm-lock.yaml": "" } });

    expect(written).toContain("version: latest");
  });

  it("installs with Yarn 1 or with a corepack Yarn, by the presence of .yarnrc.yml", async () => {
    const classic = await validate({ files: { "package.json": "{}", "yarn.lock": "" } });

    expect(classic).toContain("cache: yarn");
    expect(classic).toContain("run: yarn install --frozen-lockfile");

    const berry = await validate({ files: { ".yarnrc.yml": "" } });

    expect(berry).toContain("run: corepack enable");
    expect(berry).toContain("run: yarn install --immutable");
    expect(berry).not.toContain("cache: yarn");
  });

  it("installs with npm ci when there is an npm lockfile, npm install when there is none", async () => {
    const locked = await validate({
      files: { "package.json": "{}", "package-lock.json": "{}", ".nvmrc": "22\n" },
    });

    expect(locked).toContain("run: npm ci");
    expect(locked).toContain("node-version-file: .nvmrc");

    await rm(join(root, "package-lock.json"));
    await rm(join(root, ".nvmrc"));

    const unlocked = await validate({ files: {} });

    expect(unlocked).toContain("run: npm install");
    expect(unlocked).toContain("node-version: lts/*");
  });

  it("installs nothing for a repository without package.json", async () => {
    const written = await validate({ files: {} });

    expect(written).not.toContain("setup-");
    expect(written).toContain("run: npm run lint");
  });
});
