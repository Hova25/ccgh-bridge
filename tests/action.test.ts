import { describe, expect, it } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

const action = async (): Promise<string> => readFile(join(root, "action.yml"), "utf8");

describe("the composite action", () => {
  it("is composite, because a Docker action would rebuild an image on every run", async () => {
    expect(await action()).toMatch(/using:\s*["']?composite/);
  });

  it("installs where GitHub put it, not where the workflow is running", async () => {
    const body = await action();

    expect(body).toContain("github.action_path");
    expect(body).toContain("--frozen-lockfile");
  });

  it("takes a whole command, so that validating uses the same action as mirroring", async () => {
    const body = await action();

    expect(body).toMatch(/inputs:\s*\n\s*command:/);
    expect(body).not.toMatch(/bridge \$\{\{ inputs\.command/);
  });

  it("is exercised by this repository through a path, and never pinned to a tag", async () => {
    const directory = join(root, ".github/workflows");
    const bodies = await Promise.all(
      (await readdir(directory)).map((name) => readFile(join(directory, name), "utf8")),
    );

    // The path form is what makes the action testable by the pull request that changes it.
    expect(bodies.some((body) => body.includes("uses: ./"))).toBe(true);

    // The reference form is exercised too, because both addresses are the same file and only
    // the path is reached otherwise. What it must never be is a tag.
    expect(bodies.some((body) => /uses:\s*[\w-]+\/ccgh-bridge@/.test(body))).toBe(true);

    for (const body of bodies) {
      expect(body).not.toMatch(/uses:\s*[\w-]+\/ccgh-bridge@v/);
    }
  });
});
