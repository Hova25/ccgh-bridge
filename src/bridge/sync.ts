import type { ParsedEntry } from "../model/validate";
import type { RemoteState } from "./github";
import type { MirrorState } from "./mirror";

export type SyncPlan = {
  writes: Array<{ file: string; state: MirrorState }>;
  ship: string[];
};

const mirrorOf = (task: ParsedEntry): Partial<MirrorState> =>
  (task.data.github ?? {}) as Partial<MirrorState>;

export const planSync = ({
  entries,
  remote,
}: {
  entries: ParsedEntry[];
  remote: RemoteState;
}): SyncPlan => {
  const byNumber = new Map(remote.issues.map((issue) => [issue.number, issue]));
  const plan: SyncPlan = { writes: [], ship: [] };

  for (const entry of entries) {
    if (entry.location.kind !== "iteration") continue;

    const tasks = entries.filter(
      (candidate) =>
        candidate.location.kind === "task" &&
        candidate.location.reference === entry.location.reference,
    );

    let known = 0;
    let closed = 0;

    for (const task of tasks) {
      const issue = byNumber.get(task.data.issue as number);
      if (!issue) continue;

      known += 1;
      if (issue.state === "closed") closed += 1;

      const current = mirrorOf(task);

      if (current.state !== issue.state) {
        plan.writes.push({
          file: task.location.file,
          state: {
            state: issue.state,
            pr: current.pr ?? null,
            merged_at: current.merged_at ?? null,
          },
        });
      }
    }

    if (entry.data.status === "active" && known > 0 && known === tasks.length && closed === known) {
      plan.ship.push(entry.location.file);
    }
  }

  return plan;
};

export const staleTasks = ({
  entries,
  now,
  maxAgeHours,
}: {
  entries: ParsedEntry[];
  now: Date;
  maxAgeHours: number;
}): Array<{ file: string; syncedAt: string | null }> => {
  const cutoff = now.getTime() - maxAgeHours * 3_600_000;
  const stale: Array<{ file: string; syncedAt: string | null }> = [];

  for (const entry of entries) {
    if (entry.location.kind !== "task" || !entry.data.issue) continue;

    const mirror = (entry.data.github ?? {}) as {
      state?: string | null;
      synced_at?: string | null;
    };

    if (mirror.state === "closed") continue;

    const syncedAt = mirror.synced_at ?? null;

    if (!syncedAt || new Date(syncedAt).getTime() < cutoff) {
      stale.push({ file: entry.location.file, syncedAt });
    }
  }

  return stale;
};
