import type { ParsedEntry } from "../model/validate";
import type { RemoteIssue, RemoteState } from "./github";
import { fileFromMarker, type RenderedIssue, renderIssue } from "./render";

export type Action =
  | { kind: "create-milestone"; title: string }
  | { kind: "create-issue"; file: string; issue: RenderedIssue }
  | { kind: "update-body"; number: number; body: string }
  | {
      kind: "report-divergence";
      iteration: string;
      commentOn: number;
      added: string[];
      removed: Array<{ file: string; number: number; state: "open" | "closed" }>;
    };

const tasksOf = ({
  entries,
  reference,
}: {
  entries: ParsedEntry[];
  reference: string;
}): ParsedEntry[] =>
  entries
    .filter((entry) => entry.location.kind === "task" && entry.location.reference === reference)
    .sort((a, b) => (a.data.order as number) - (b.data.order as number));

export const planActions = ({
  entries,
  remote,
  url,
}: {
  entries: ParsedEntry[];
  remote: RemoteState;
  url: (file: string) => string;
}): Action[] => {
  const actions: Action[] = [];

  for (const entry of entries) {
    if (entry.location.kind !== "iteration") continue;
    if (entry.data.status !== "active" && entry.data.status !== "shipped") continue;

    const reference = entry.location.reference as string;
    const tasks = tasksOf({ entries, reference });
    const knownFiles = new Set(tasks.map((task) => task.location.file));
    const prefix = `${entry.location.domain}/iterations/${entry.location.iteration}/`;
    const approved = new Set(
      ((entry.data.launched_tasks as string[]) ?? []).map((file) => `${prefix}${file}`),
    );

    const claimed = new Map<string, RemoteIssue>();
    const removed: Array<{ file: string; number: number; state: "open" | "closed" }> = [];

    // A task that carries its issue number owns that issue, whatever path the issue's
    // marker still names: a renamed file must not look like a new one.
    const byNumber = new Map(remote.issues.map((issue) => [issue.number, issue]));

    for (const task of tasks) {
      const owned = typeof task.data.issue === "number" ? byNumber.get(task.data.issue) : undefined;

      if (owned) claimed.set(task.location.file, owned);
    }

    const claimedNumbers = new Set([...claimed.values()].map((issue) => issue.number));

    for (const issue of remote.issues) {
      if (claimedNumbers.has(issue.number)) continue;

      const file = fileFromMarker(issue.body);
      if (!file?.includes(`/${entry.location.iteration}/`)) continue;

      if (!knownFiles.has(file)) removed.push({ file, number: issue.number, state: issue.state });
      else if (!claimed.has(file)) claimed.set(file, issue);
    }

    const added = tasks
      .filter((task) => !approved.has(task.location.file))
      .map((task) => task.location.file);

    if (added.length > 0 || removed.length > 0) {
      const numbers = [...claimed.values(), ...removed].map((issue) => issue.number);

      if (numbers.length > 0) {
        actions.push({
          kind: "report-divergence",
          iteration: reference,
          commentOn: Math.min(...numbers),
          added,
          removed,
        });
        continue;
      }
    }

    if (!remote.milestones.includes(reference)) {
      actions.push({ kind: "create-milestone", title: reference });
    }

    for (const task of tasks) {
      if (!approved.has(task.location.file)) continue;

      const rendered = renderIssue({
        task,
        total: tasks.length,
        url: url(task.location.file),
      });
      const existing = claimed.get(task.location.file);

      if (!existing) {
        actions.push({ kind: "create-issue", file: task.location.file, issue: rendered });
      } else if (existing.body !== rendered.body) {
        actions.push({ kind: "update-body", number: existing.number, body: rendered.body });
      }
    }
  }

  return actions;
};

export const missingIssueNumbers = ({
  entries,
  remote,
}: {
  entries: ParsedEntry[];
  remote: RemoteState;
}): Array<{ file: string; number: number }> => {
  const byFile = new Map(
    entries
      .filter((entry) => entry.location.kind === "task")
      .map((entry) => [entry.location.file, entry]),
  );
  const missing: Array<{ file: string; number: number }> = [];

  for (const issue of remote.issues) {
    const file = fileFromMarker(issue.body);
    if (!file) continue;

    const task = byFile.get(file);
    if (task && task.data.issue === null) missing.push({ file, number: issue.number });
  }

  return missing;
};
