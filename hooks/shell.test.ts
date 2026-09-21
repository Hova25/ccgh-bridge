import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { shell } from "./shell";

let directory = "";

const configure = (check: string[]) =>
  writeFile(join(directory, "ccgh.json"), JSON.stringify({ check }), "utf8");

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "ccgh-shell-"));
  await mkdir(join(directory, ".git"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("the shell's check", () => {
  it("reports nothing when every command passes", async () => {
    await configure(["bun --version"]);

    expect(shell({ directory }).check({ files: [] })).toBe("");
  });

  it("reports a command that cannot start, rather than taking silence for a pass", async () => {
    await configure(["no-such-check-command-anywhere"]);

    expect(shell({ directory }).check({ files: ["a.ts"] })).toMatch(
      /no-such-check-command-anywhere a\.ts: could not run/,
    );
  });

  it("reports a command that fails without printing anything", async () => {
    await configure(["bun -e process.exit(3)"]);

    expect(shell({ directory }).check({ files: [] })).toMatch(/exited with 3/);
  });
});
