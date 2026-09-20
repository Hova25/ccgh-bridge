import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contentRoot, repositoryRoot } from "./project";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ccgh-"));
  await mkdir(join(root, ".git"));
  await mkdir(join(root, "packages", "deep"), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("the repository root", () => {
  it("is the directory holding .git", () => {
    expect(repositoryRoot({ from: root })).toBe(root);
  });

  it("is found from any directory below it", () => {
    expect(repositoryRoot({ from: join(root, "packages", "deep") })).toBe(root);
  });

  it("accepts a worktree, where .git is a file rather than a directory", async () => {
    const worktree = await mkdtemp(join(tmpdir(), "ccgh-worktree-"));
    await writeFile(join(worktree, ".git"), `gitdir: ${join(root, ".git")}\n`, "utf8");

    expect(repositoryRoot({ from: worktree })).toBe(worktree);

    await rm(worktree, { recursive: true, force: true });
  });

  it("says where it looked when there is no repository", () => {
    expect(() => repositoryRoot({ from: tmpdir() })).toThrow(/no repository above/);
  });
});

describe("the content root", () => {
  it("is docs, by convention", () => {
    expect(contentRoot({ from: root })).toBe(join(root, "docs"));
  });

  it("is whatever ccgh.json says, relative to the repository", async () => {
    await writeFile(join(root, "ccgh.json"), '{ "content": "apps/site/src/content" }', "utf8");

    expect(contentRoot({ from: root })).toBe(join(root, "apps/site/src/content"));
  });

  it("falls back to docs when ccgh.json carries no content key", async () => {
    await writeFile(join(root, "ccgh.json"), '{ "other": true }', "utf8");

    expect(contentRoot({ from: root })).toBe(join(root, "docs"));
  });

  it("refuses a malformed ccgh.json rather than silently using docs", async () => {
    await writeFile(join(root, "ccgh.json"), "{ not json", "utf8");

    expect(() => contentRoot({ from: root })).toThrow(/ccgh\.json is not valid JSON/);
  });
});
