import { basename } from "node:path";
import type { Failure, ParsedEntry } from "../validate";

const tasksByIteration = (entries: ParsedEntry[]): Map<string, ParsedEntry[]> => {
  const grouped = new Map<string, ParsedEntry[]>();

  for (const entry of entries) {
    if (entry.location.kind !== "task") continue;

    const reference = entry.location.reference as string;
    grouped.set(reference, [...(grouped.get(reference) ?? []), entry]);
  }

  return grouped;
};

const mirrorState = (task: ParsedEntry): string | null => {
  const github = task.data.github as { state?: string | null } | undefined;
  return github?.state ?? null;
};

const checkIterations = (entries: ParsedEntry[]): Failure[] => {
  const grouped = tasksByIteration(entries);
  const failures: Failure[] = [];

  for (const entry of entries) {
    if (entry.location.kind !== "iteration") continue;

    const file = entry.location.file;
    const status = entry.data.status as string;
    const tasks = grouped.get(entry.location.reference as string) ?? [];

    if (status !== "draft" && !entry.data.validated_by) {
      failures.push({ file, message: `status is ${status} but validated_by is empty` });
    }

    if ((status === "active" || status === "shipped") && !entry.data.launched_by) {
      failures.push({ file, message: `status is ${status} but launched_by is empty` });
    }

    for (const task of tasks) {
      const issue = task.data.issue;

      if ((status === "draft" || status === "ready") && issue) {
        failures.push({
          file: task.location.file,
          message: `carries issue ${issue} before being launched`,
        });
      }

      if (status === "shipped" && !issue) {
        failures.push({
          file: task.location.file,
          message: "shipped without ever having an issue",
        });
      }

      if (status === "shipped" && mirrorState(task) !== "closed") {
        failures.push({ file: task.location.file, message: "still open in a shipped iteration" });
      }
    }
  }

  return failures;
};

const checkSupersession = (entries: ParsedEntry[]): Failure[] => {
  const decisions = entries.filter((entry) => entry.location.kind === "decision");
  const byDomainAndNumber = new Map<string, ParsedEntry>();

  for (const decision of decisions) {
    const number = basename(decision.location.file).slice(0, 3);
    byDomainAndNumber.set(`${decision.location.domain}/${number}`, decision);
  }

  const failures: Failure[] = [];

  for (const decision of decisions) {
    const supersedes = decision.data.supersedes;
    if (!supersedes) continue;

    const target = byDomainAndNumber.get(`${decision.location.domain}/${supersedes as string}`);

    if (!target) {
      failures.push({
        file: decision.location.file,
        message: `supersedes: ${supersedes} does not exist`,
      });
    } else if (target.data.status !== "superseded") {
      failures.push({
        file: target.location.file,
        message: "not marked superseded although another record supersedes it",
      });
    }
  }

  return failures;
};

export const checkStatus = (entries: ParsedEntry[]): Failure[] => {
  return [...checkIterations(entries), ...checkSupersession(entries)];
};
