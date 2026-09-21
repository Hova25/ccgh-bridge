import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packageManagerOf } from "./package-manager";

let repository = "";

beforeEach(async () => {
  repository = await mkdtemp(join(tmpdir(), "ccgh-pm-"));
});

afterEach(async () => {
  await rm(repository, { recursive: true, force: true });
});

const given = async (files: string[]) => {
  for (const name of files) await writeFile(join(repository, name), "{}", "utf8");

  return packageManagerOf({ repository });
};

describe("packageManagerOf", () => {
  it("is none without package.json", async () => {
    expect(await given([])).toBeNull();
  });

  it("follows the lockfile", async () => {
    expect(await given(["package.json", "pnpm-lock.yaml"])).toBe("pnpm");
  });

  it("knows each of them", async () => {
    await given(["package.json"]);

    for (const [lockfile, manager] of [
      ["bun.lock", "bun"],
      ["bun.lockb", "bun"],
      ["yarn.lock", "yarn"],
      ["package-lock.json", "npm"],
      ["npm-shrinkwrap.json", "npm"],
    ] as const) {
      await writeFile(join(repository, lockfile), "", "utf8");
      expect(packageManagerOf({ repository })).toBe(manager);
      await rm(join(repository, lockfile));
    }
  });

  it("is npm when package.json has no lockfile beside it", async () => {
    expect(await given(["package.json"])).toBe("npm");
  });
});
