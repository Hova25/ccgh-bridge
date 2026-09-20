import type { Decide } from "../context";

const commitCommand = /(^|[;&|]\s*)git\s+(?:-[^\s]+\s+)*commit\b/;
const checkable = /\.(ts|mts|mjs|astro)$/;

export const decide: Decide = ({ input, context }) => {
  const command = input?.tool_input?.command ?? "";

  if (!commitCommand.test(command)) return null;

  const staged = context.stagedFiles().filter((file) => checkable.test(file));

  if (staged.length === 0) return null;

  const failures = context.check({ files: staged });

  if (failures.length === 0) return null;

  return [
    "Refusing to commit files that fail the checks:",
    "",
    failures,
    "",
    "Most of it is fixed by the project's own fix command. What remains is a real violation.",
  ].join("\n");
};
