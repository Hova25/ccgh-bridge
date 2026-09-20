import { basename } from "node:path";
import type { GitHubClient } from "./github";
import type { Action } from "./plan";

export type ApplyResult = {
  created: Array<{ file: string; number: number }>;
  updated: number[];
  reported: string[];
};

export const formatDivergence = (
  action: Extract<Action, { kind: "report-divergence" }>,
): string => {
  const lines = ["[bot] The task set changed since launch.", ""];

  for (const file of action.added) {
    lines.push(`Added:   ${basename(file)}  (no issue)`);
  }

  for (const entry of action.removed) {
    lines.push(`Removed: ${basename(entry.file)}  (issue #${entry.number} still ${entry.state})`);
  }

  lines.push("", "Run /launch-iteration to review and approve.");

  return lines.join("\n");
};

export const applyActions = async ({
  actions,
  client,
}: {
  actions: Action[];
  client: GitHubClient;
}): Promise<ApplyResult> => {
  const result: ApplyResult = { created: [], updated: [], reported: [] };
  const labelled = new Set<string>();

  for (const action of actions) {
    if (action.kind === "create-milestone") {
      await client.createMilestone(action.title);
      continue;
    }

    if (action.kind === "create-issue") {
      for (const label of action.issue.labels) {
        if (!labelled.has(label)) {
          labelled.add(label);
          await client.ensureLabel(label);
        }
      }

      const number = await client.createIssue(action.issue);
      result.created.push({ file: action.file, number });
      continue;
    }

    if (action.kind === "update-body") {
      await client.updateBody({ number: action.number, body: action.body });
      result.updated.push(action.number);
      continue;
    }

    await client.comment({ number: action.commentOn, body: formatDivergence(action) });
    result.reported.push(action.iteration);
  }

  return result;
};
