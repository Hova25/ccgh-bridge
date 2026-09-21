import { commitCommand } from "../commit";
import type { Decide } from "../context";

const checkable = /\.(?:[cm]?[jt]sx?|astro|vue|svelte)$/;

export const decide: Decide = ({ input, context }) => {
  const command = input?.tool_input?.command ?? "";

  if (!commitCommand.test(command)) return null;

  const commands = context.configuration().check ?? [];

  // An unconfigured repository gets no checks rather than somebody else's.
  if (commands.length === 0) return null;

  const staged = context.stagedFiles().filter((file) => checkable.test(file));

  if (staged.length === 0) return null;

  const failures = context.check({ files: staged });

  if (failures.length === 0) return null;

  return [
    "Refusing to commit files that fail the checks:",
    "",
    failures,
    "",
    `Ran: ${commands.join(", ")}. Fix what they report, or change them in ccgh.json.`,
  ].join("\n");
};
