import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { relative } from "node:path";
import { contentRoot, repositoryRoot } from "../src/project";
import type { Context } from "./context";

const git = (...args: string[]): string => execFileSync("git", args, { encoding: "utf8" }).trim();

const project = (): string => process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

const attempt = ({ command, args }: { command: string; args: string[] }): string => {
  try {
    execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

    return "";
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };

    return `${failure.stdout ?? ""}${failure.stderr ?? ""}`;
  }
};

export const shell: Context = {
  currentBranch: () => git("rev-parse", "--abbrev-ref", "HEAD"),
  stagedFiles: () =>
    git("diff", "--cached", "--name-only", "--diff-filter=d").split("\n").filter(Boolean),
  check: ({ files }) =>
    attempt({
      command: "bun",
      args: ["run", "--cwd", repositoryRoot({ from: project() }), "lint", ...files],
    }).trim(),
  content: () => relative(repositoryRoot({ from: project() }), contentRoot({ from: project() })),
  fileExists: (file) => existsSync(file),
};
