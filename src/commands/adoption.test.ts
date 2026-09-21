import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { loadContent } from "../model/load";
import { validate } from "../model/validate";
import { adoptionContent, checkProposal } from "./adoption";

const now = new Date("2026-09-21T18:56:00Z");

let repository = "";

beforeEach(async () => {
  repository = await mkdtemp(join(tmpdir(), "ccgh-adoption-"));
});

afterEach(async () => {
  await rm(repository, { recursive: true, force: true });
});

describe("checkProposal", () => {
  it("proposes the scripts that check, run by the repository's package manager", async () => {
    const scripts = { dev: "vite", lint: "eslint src", typecheck: "tsc -p .", test: "vitest run" };

    await writeFile(join(repository, "package.json"), JSON.stringify({ scripts }), "utf8");
    await writeFile(join(repository, "pnpm-lock.yaml"), "", "utf8");

    expect(checkProposal({ repository })).toEqual(["pnpm lint", "pnpm typecheck", "pnpm test"]);
  });

  it("runs a script through npm run when npm is the manager", async () => {
    await writeFile(
      join(repository, "package.json"),
      '{ "scripts": { "lint": "eslint" } }',
      "utf8",
    );

    expect(checkProposal({ repository })).toEqual(["npm run lint"]);
  });

  it("proposes nothing without package.json", () => {
    expect(checkProposal({ repository })).toEqual([]);
  });
});

describe("adoptionContent", () => {
  const plan = adoptionContent({ now, proposal: ["pnpm lint"] });

  it("names the iteration it writes", () => {
    expect(plan.reference).toBe("ccgh/2026-09-21-1856-adopt-ccgh");
  });

  it("writes the domain, the iteration and its one task", () => {
    expect(plan.files.map((file) => file.file)).toEqual([
      "ccgh/index.md",
      "ccgh/iterations/2026-09-21-1856-adopt-ccgh/brainstorm.md",
      "ccgh/iterations/2026-09-21-1856-adopt-ccgh/spec.md",
      "ccgh/iterations/2026-09-21-1856-adopt-ccgh/tasks/01-configure-the-checks.md",
    ]);
  });

  it("leaves no placeholder and no template token behind", () => {
    for (const { file, content } of plan.files) {
      expect(content, file).not.toMatch(/<[A-Z][^>]*>/);
      expect(content, file).not.toContain("__");
    }
  });

  it("carries the proposal into the task, and says so when there is none", () => {
    const task = (files: { file: string; content: string }[]) =>
      files.find((file) => file.file.endsWith("configure-the-checks.md"))?.content ?? "";

    expect(task(plan.files)).toContain("`pnpm lint`");
    expect(task(adoptionContent({ now, proposal: [] }).files)).toMatch(/nothing is proposed/);
  });

  it("is content the validator accepts", async () => {
    const root = join(repository, "docs", "ccgh-bridge");

    for (const { file, content } of plan.files) {
      await mkdir(dirname(join(root, file)), { recursive: true });
      await writeFile(join(root, file), content, "utf8");
    }

    expect(validate(await loadContent(root))).toEqual([]);
  });
});
