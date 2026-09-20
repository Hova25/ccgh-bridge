import { homeOf } from "../../src/commands/require-a-home";
import type { Decide } from "../context";

const commitCommand = /(^|[;&|]\s*)git\s+(?:-[^\s]+\s+)*commit\b/;
const taskBranch = /^task\/\d{2}-[a-z0-9-]+$/;
const fixBranch = /^fix\/[a-z0-9-]+\/[a-z0-9-]+$/;

export const decide: Decide = ({ input, context }) => {
  const command = input?.tool_input?.command ?? "";

  if (!commitCommand.test(command)) return null;

  const staged = context.stagedFiles();

  if (staged.length === 0) return null;

  const branch = context.currentBranch();
  const content = context.content();

  // One definition of "has a home", shared with `ccgh require-a-home`. It covers the commit
  // that only touches content, the iteration branch, and the fix record staged with its code.
  if (homeOf({ base: branch, changed: staged, content })) return null;

  // A task branch is a home the command cannot see: it targets an iteration branch rather
  // than main, so no changed file says which iteration it belongs to.
  if (taskBranch.test(branch)) return null;

  if (!fixBranch.test(branch)) {
    return [
      `Refusing to commit code from ${branch}: it belongs to no iteration, a task or a fix.`,
      "Code lives on <domain>/<yyyy-mm-dd>-<slug>, on task/<nn>-<slug> targeting it,",
      "or on fix/<domain>/<slug> carrying the record of what it repairs.",
    ].join("\n");
  }

  return [
    "Refusing to commit a fix that records nothing.",
    `Add ${content}/<domain>/fixes/<yyyy-mm-dd-HHMM>-<slug>.md`,
    "saying what was wrong and what changed, and stage it with the code.",
  ].join("\n");
};
