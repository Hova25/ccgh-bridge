import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { packageManagerOf } from "../package-manager";
import { prefixAt, type Scaffold } from "./scaffold";

// The scripts that check rather than build or serve, in the order a reader would run them.
const checking = ["lint", "format:check", "typecheck", "test", "check", "verify"];

const runner = { bun: "bun run", pnpm: "pnpm", yarn: "yarn", npm: "npm run" } as const;

export const checkProposal = ({ repository }: { repository: string }): string[] => {
  const manager = packageManagerOf({ repository });

  if (!manager) return [];

  const scripts: Record<string, string> =
    JSON.parse(readFileSync(join(repository, "package.json"), "utf8")).scripts ?? {};

  return checking.filter((name) => name in scripts).map((name) => `${runner[manager]} ${name}`);
};

const template = (name: string): string =>
  readFileSync(fileURLToPath(new URL(`../templates/adoption/${name}`, import.meta.url)), "utf8");

const proposed = (proposal: string[]): string =>
  proposal.length === 0
    ? "No `package.json` was found, so nothing is proposed: list the repository's own check commands, or none."
    : proposal.map((command) => `- \`${command}\``).join("\n");

export const adoptionContent = ({
  now,
  proposal,
}: {
  now: Date;
  proposal: string[];
}): { reference: string; files: Scaffold[] } => {
  const iteration = `${prefixAt({ now })}-adopt-ccgh`;
  const directory = `ccgh/iterations/${iteration}`;
  const fill = (text: string) =>
    text
      .replaceAll("__DAY__", now.toISOString().slice(0, 10))
      .replaceAll("__PROPOSAL__", proposed(proposal));

  return {
    reference: `ccgh/${iteration}`,
    files: [
      { file: "ccgh/index.md", content: fill(template("index.md")) },
      { file: `${directory}/brainstorm.md`, content: fill(template("brainstorm.md")) },
      { file: `${directory}/spec.md`, content: fill(template("spec.md")) },
      { file: `${directory}/tasks/01-configure-the-checks.md`, content: fill(template("task.md")) },
    ],
  };
};
