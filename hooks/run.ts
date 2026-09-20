#!/usr/bin/env bun
import type { Context, Decide, HookInput } from "./context";
import { decide as checkStagedFiles } from "./rules/check-staged-files";
import { decide as enforceIterationIsolation } from "./rules/enforce-iteration-isolation";
import { decide as enforceLanguage } from "./rules/enforce-language";
import { decide as protectGeneratedFrontmatter } from "./rules/protect-generated-frontmatter";
import { decide as protectMainBranch } from "./rules/protect-main-branch";
import { decide as refuseBashWritesToContent } from "./rules/refuse-bash-writes-to-content";
import { decide as requireAHome } from "./rules/require-a-home";
import { decide as requireDecisionNotice } from "./rules/require-decision-notice";
import { shell } from "./shell";

const rules: Record<string, Decide> = {
  "check-staged-files": checkStagedFiles,
  "enforce-iteration-isolation": enforceIterationIsolation,
  "enforce-language": enforceLanguage,
  "protect-generated-frontmatter": protectGeneratedFrontmatter,
  "protect-main-branch": protectMainBranch,
  "refuse-bash-writes-to-content": refuseBashWritesToContent,
  "require-a-home": requireAHome,
  "require-decision-notice": requireDecisionNotice,
};

// This one raises the question rather than answering it: the work is legitimate, the decision
// is the human's. Every other rule refuses outright.
const asks = new Set(["require-decision-notice"]);

const readInput = async (): Promise<HookInput> => {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
};

const refuse = (reason: string): never => {
  process.stderr.write(`${reason}\n`);
  process.exit(2);
};

const [name] = process.argv.slice(2);
const decide = name ? rules[name] : undefined;

// A hook that fails open is worse than no hook, because it is believed.
if (!decide) refuse(`hook: no rule named ${name ?? "<nothing>"}`);

let verdict: string | null = null;

try {
  verdict = (decide as Decide)({ input: await readInput(), context: shell as Context });
} catch (error) {
  refuse(`hook failed: ${(error as Error).message}`);
}

if (verdict && asks.has(name as string)) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: verdict,
      },
    }),
  );
  process.exit(0);
}

if (verdict) refuse(verdict);

process.exit(0);
