import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configuration } from "./configuration";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ccgh-configuration-"));
  await mkdir(join(root, ".git"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("the configuration", () => {
  it("is empty when the repository has no ccgh.json", () => {
    expect(configuration({ from: root })).toEqual({});
  });

  it("is read from the repository root, from anywhere below it", async () => {
    await writeFile(join(root, "ccgh.json"), '{ "check": ["bun run lint"] }', "utf8");
    await mkdir(join(root, "deep", "deeper"), { recursive: true });

    expect(configuration({ from: join(root, "deep", "deeper") }).check).toEqual(["bun run lint"]);
  });

  it("refuses a malformed file rather than returning an empty configuration", async () => {
    await writeFile(join(root, "ccgh.json"), "{ not json", "utf8");

    expect(() => configuration({ from: root })).toThrow(/ccgh\.json is not valid JSON/);
  });

  it("ignores keys it does not know, so a newer file does not break an older command", async () => {
    await writeFile(join(root, "ccgh.json"), '{ "content": "x", "future": 1 }', "utf8");

    expect(configuration({ from: root }).content).toBe("x");
  });
});
