import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
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

  it("is exercised by this repository through a path rather than a tag", async () => {
    const workflow = await readFile(join(root, ".github/workflows/ccgh-action.yml"), "utf8");

    expect(workflow).toContain("uses: ./");
    expect(workflow).not.toMatch(/uses:\s*[\w-]+\/ccgh-bridge@/);
  });
});
