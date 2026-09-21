import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { configuration } from "../src/configuration";
import { contentDirectory, repositoryRoot } from "../src/project";
import type { Context } from "./context";

export const project = (): string => process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

const attempt = ({
  command,
  args,
  cwd,
}: {
  command: string;
  args: string[];
  cwd: string;
}): string => {
  try {
    execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

    return "";
  } catch (error) {
    const failure = error as {
      stdout?: string | null;
      stderr?: string | null;
      status?: number | null;
      code?: string;
    };
    const output = `${failure.stdout ?? ""}${failure.stderr ?? ""}`.trim();

    // An empty report reads as a pass. A check that could not start, or failed without a word,
    // must still say so, or a typo in ccgh.json silently turns every check off.
    if (output) return output;

    const ran = [command, ...args].join(" ");

    return failure.status == null
      ? `${ran}: could not run (${failure.code ?? "unknown error"})`
      : `${ran}: exited with ${failure.status} and printed nothing`;
  }
};

// The world as seen from the directory the command runs in, which is not always the session's.
export const shell = ({ directory }: { directory: string }): Context => {
  const git = (...args: string[]): string =>
    execFileSync("git", args, { cwd: directory, encoding: "utf8" }).trim();

  return {
    currentBranch: () => git("rev-parse", "--abbrev-ref", "HEAD"),
    stagedFiles: () =>
      git("diff", "--cached", "--name-only", "--diff-filter=d").split("\n").filter(Boolean),
    check: ({ files }) =>
      (configuration({ from: directory }).check ?? [])
        .map((command) => {
          const [name, ...args] = command.split(" ");

          return attempt({ command: name as string, args: [...args, ...files], cwd: directory });
        })
        .join("\n")
        .trim(),
    content: () => contentDirectory({ from: directory }),
    repository: () => repositoryRoot({ from: directory }),
    fileExists: (file) => existsSync(file),
    configuration: () => configuration({ from: directory }),
  };
};
