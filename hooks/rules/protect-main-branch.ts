import type { Decide } from "../context";

const commitCommand = /(^|[;&|]\s*)git\s+(?:-[^\s]+\s+)*commit\b/;

export const decide: Decide = ({ input, context }) => {
  const command = input?.tool_input?.command ?? "";

  if (!commitCommand.test(command)) return null;
  if (context.currentBranch() !== "main") return null;

  return [
    "Refusing to commit while main is checked out.",
    "Work in a worktree named after the iteration, or at least on its branch:",
    "  git worktree add ../worktrees/<domain>-<iteration> -b <domain>/<iteration> main",
    "  git switch -c <domain>/<iteration>",
  ].join("\n");
};
