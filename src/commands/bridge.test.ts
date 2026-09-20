import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { issueUrl, run, settingsFor } from "./bridge";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ccgh-bridge-"));
  await mkdir(join(root, ".git"));
  await mkdir(join(root, "docs", "ccgh-bridge", "engine"), { recursive: true });
  await writeFile(
    join(root, "docs", "ccgh-bridge", "engine", "index.md"),
    "---\ntitle: Engine\nsummary: The engine.\n---\n\nProse.\n",
    "utf8",
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("ccgh bridge", () => {
  it("refuses before it reads anything when there is no token", async () => {
    expect(await run({ argv: ["push"], cwd: root, env: {} })).toBe(1);
  });

  it("names the verb it did not recognise", async () => {
    expect(await run({ argv: ["shove"], cwd: root, env: { GITHUB_TOKEN: "x" } })).toBe(1);
  });

  it("links an issue back through the repository's own content root", () => {
    expect(issueUrl({ repository: "o/r", content: "elsewhere", file: "engine/a.md" })).toBe(
      "https://github.com/o/r/blob/main/elsewhere/engine/a.md",
    );
  });

  it("refuses when it cannot tell which repository it is mirroring", async () => {
    expect(await run({ argv: ["push"], cwd: root, env: { GITHUB_TOKEN: "x" } })).toBe(1);
  });

  it("takes the repository from the environment a runner sets", () => {
    const settings = settingsFor({
      cwd: root,
      env: { GITHUB_TOKEN: "x", GITHUB_REPOSITORY: "o/r" },
    });

    expect(settings.repository).toBe("o/r");
    expect(settings.content).toBe("docs/ccgh-bridge");
  });

  it("takes it from ccgh.json when no runner set it", async () => {
    await writeFile(join(root, "ccgh.json"), '{ "repository": "o/r" }', "utf8");

    expect(settingsFor({ cwd: root, env: { GITHUB_TOKEN: "x" } }).repository).toBe("o/r");
  });

  it("follows the content directory a repository configures", async () => {
    await writeFile(join(root, "ccgh.json"), '{ "content": "elsewhere" }', "utf8");

    expect(
      settingsFor({ cwd: root, env: { GITHUB_TOKEN: "x", GITHUB_REPOSITORY: "o/r" } }).content,
    ).toBe("elsewhere");
  });

  it("refuses to mirror a tree that does not validate", async () => {
    await writeFile(
      join(root, "docs", "ccgh-bridge", "engine", "index.md"),
      "---\ntitle: Engine\n---\n\nNo summary.\n",
      "utf8",
    );

    expect(
      await run({
        argv: ["push", "--dry-run"],
        cwd: root,
        env: { GITHUB_TOKEN: "x", GITHUB_REPOSITORY: "o/r" },
      }),
    ).toBe(1);
  });
});
