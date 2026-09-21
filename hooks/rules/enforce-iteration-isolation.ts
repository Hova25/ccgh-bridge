import { commitCommand } from "../commit";
import type { Decide } from "../context";

const escaped = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const decide: Decide = ({ input, context }) => {
  const command = input?.tool_input?.command ?? "";

  if (!commitCommand.test(command)) return null;

  const iterationPath = new RegExp(
    `^${escaped(context.content())}/([a-z0-9-]+)/iterations/(\\d{4}-\\d{2}-\\d{2}-[a-z0-9-]+)/`,
  );
  const references = new Set<string>();

  for (const file of context.stagedFiles()) {
    const match = iterationPath.exec(file);
    if (match) references.add(`${match[1]}/${match[2]}`);
  }

  if (references.size < 2) return null;

  return [
    "Refusing to commit files from more than one iteration:",
    ...[...references].sort().map((reference) => `  ${reference}`),
    "One worktree works on one iteration. Unstage the others and commit them separately.",
  ].join("\n");
};
