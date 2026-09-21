import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { configuration } from "../src/configuration";
import { contentDirectory } from "../src/project";
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
    (configuration({ from: project() }).check ?? [])
      .map((command) => {
        const [name, ...args] = command.split(" ");

        return attempt({ command: name as string, args: [...args, ...files] });
      })
      .join("\n")
      .trim(),
  content: () => contentDirectory({ from: project() }),
  fileExists: (file) => existsSync(file),
  configuration: () => configuration({ from: project() }),
};
