import { readFileSync } from "node:fs";
import { applyActions } from "../bridge/apply";
import { completionComment, completionsFor } from "../bridge/completion";
import {
  abandonedFixIssues,
  bodyClosing,
  fixesMissingTheirPullRequest,
  issuesArriving,
  planFixIssues,
} from "../bridge/fixes";
import { createGitHubClient, type GitHubClient } from "../bridge/github";
import { commitToIterationBranch, shell } from "../bridge/iteration-branch";
import {
  markShipped,
  writeCompletion,
  writeIssueNumbers,
  writeMirror,
  writePullRequest,
} from "../bridge/mirror";
import { missingIssueNumbers, planActions } from "../bridge/plan";
import { namesRewritten, planRelink, readTable } from "../bridge/relink";
import { planSync, staleTasks } from "../bridge/sync";
import { configuration } from "../configuration";
import { loadContent } from "../model/load";
import { validate } from "../model/validate";
import { contentDirectory, contentRoot } from "../project";

export const issueUrl = ({
  repository,
  content,
  file,
}: {
  repository: string;
  content: string;
  file: string;
}): string => `https://github.com/${repository}/blob/main/${content}/${file}`;

const referenceOf = (file: string): string => `${file.split("/")[0]}/${file.split("/")[2]}`;

export const groupByIteration = (files: string[]): Map<string, string[]> => {
  const groups = new Map<string, string[]>();

  for (const file of files) {
    const reference = referenceOf(file);

    groups.set(reference, [...(groups.get(reference) ?? []), file]);
  }

  return groups;
};

const loadValid = async (root: string) => {
  const loaded = await loadContent(root);
  const failures = validate(loaded);

  if (failures.length > 0) {
    for (const failure of failures) process.stderr.write(`${failure.file}: ${failure.message}\n`);

    // A tree that fails validation is a tree whose issue bodies would be wrong.
    throw new Error("the content is invalid; nothing was mirrored");
  }

  return loaded;
};

type World = {
  root: string;
  content: string;
  client: GitHubClient;
  repository: string;
  dryRun: boolean;
};

const runPush = async ({ root, content, client, repository, dryRun }: World) => {
  const loaded = await loadValid(root);
  const remote = await client.readState("");
  const actions = planActions({
    entries: loaded.entries,
    remote,
    url: (file) => issueUrl({ repository, content, file }),
  });

  if (dryRun) {
    for (const action of actions) process.stdout.write(`${action.kind}\n`);

    return { created: 0, updated: 0, reported: 0, planned: actions.length };
  }

  const result = await applyActions({ actions, client });
  const recovered = missingIssueNumbers({ entries: loaded.entries, remote });
  const byFile = new Map([...recovered, ...result.created].map((item) => [item.file, item]));
  const numbered = [...byFile.values()];

  for (const reference of groupByIteration(numbered.map((item) => item.file)).keys()) {
    await commitToIterationBranch({
      reference,
      message: `Mirror issue numbers for ${reference}`,
      apply: async () => {
        const changed = await writeIssueNumbers({
          root,
          created: numbered.filter((item) => referenceOf(item.file) === reference),
        });

        return changed.map((file) => `${content}/${file}`);
      },
    });
  }

  return {
    created: result.created.length,
    updated: result.updated.length,
    reported: result.reported.length,
    planned: actions.length,
  };
};

const runSync = async ({ root, content, client, dryRun }: World) => {
  const remote = await client.readState("");
  const preview = planSync({ entries: (await loadValid(root)).entries, remote });

  if (dryRun) {
    for (const write of preview.writes) process.stdout.write(`mirror ${write.file}\n`);
    for (const file of preview.ship) process.stdout.write(`ship ${file}\n`);

    return { mirrored: 0, shipped: 0 };
  }

  const references = groupByIteration([
    ...preview.writes.map((write) => write.file),
    ...preview.ship,
  ]);

  let mirrored = 0;
  let shipped = 0;

  for (const reference of references.keys()) {
    const shipping = preview.ship.some((file) => referenceOf(file) === reference);
    const expected = preview.writes.filter((write) => referenceOf(write.file) === reference).length;

    await commitToIterationBranch({
      reference,
      shipping,
      message: shipping ? `Ship ${reference}` : `Mirror ${expected} task(s) for ${reference}`,
      apply: async () => {
        const live = planSync({ entries: (await loadValid(root)).entries, remote });
        const writes = live.writes.filter((write) => referenceOf(write.file) === reference);
        const ship = live.ship.filter((file) => referenceOf(file) === reference);

        for (const write of writes)
          await writeMirror({ root, file: write.file, state: write.state });
        for (const specFile of ship) await markShipped({ root, specFile });

        mirrored += writes.length;
        shipped += ship.length;

        return [...writes.map((write) => write.file), ...ship].map((file) => `${content}/${file}`);
      },
    });
  }

  return { mirrored, shipped };
};

const runFixes = async ({
  world,
  branch,
  arriving,
  pullRequest,
  run = shell,
}: {
  world: World;
  branch: string;
  arriving: string[];
  pullRequest: number;
  run?: (input: { command: string; args: string[] }) => string;
}) => {
  const { root, content, client, dryRun } = world;
  const loaded = await loadValid(root);
  const remote = await client.readState("");
  const arrivingFiles = new Set(
    arriving
      .filter((file) => file.startsWith(`${content}/`))
      .map((file) => file.slice(`${content}/`.length)),
  );

  const planned = planFixIssues({
    entries: loaded.entries,
    remote,
    arriving: arrivingFiles,
    pullRequest,
  });

  if (dryRun) {
    for (const fix of planned) process.stdout.write(`create issue for ${fix.file}\n`);

    return { created: 0 };
  }

  const created: Array<{ file: string; number: number; pr: number }> = [];

  for (const fix of planned) {
    await client.ensureLabel(fix.domain);

    const number = await client.createIssue({
      title: fix.title,
      body: fix.body,
      milestone: null,
      labels: [fix.domain],
    });

    created.push({ file: fix.file, number, pr: pullRequest });
  }

  const linked: Array<{ file: string; pr: number }> = [];

  for (const missing of fixesMissingTheirPullRequest({ entries: loaded.entries })) {
    if (created.some((item) => item.file === missing.file)) continue;

    const number = await client.pullRequestForBranch({ branch: missing.branch });

    if (number !== null) linked.push({ file: missing.file, pr: number });
  }

  if (created.length + linked.length > 0) {
    await commitToIterationBranch({
      reference: branch,
      message: `Mirror ${created.length + linked.length} fix record(s)`,
      apply: async () => {
        const touched = created.length > 0 ? await writeIssueNumbers({ root, created }) : [];

        for (const item of linked) {
          await writePullRequest({ root, file: item.file, pr: item.pr });
          touched.push(item.file);
        }

        return touched.map((file) => `${content}/${file}`);
      },
    });
  }

  const issues = [
    ...new Set([
      ...created.map((item) => item.number),
      ...issuesArriving({ entries: loaded.entries, arriving: arrivingFiles }),
    ]),
  ];

  if (pullRequest > 0 && issues.length > 0) {
    const body = run({
      command: "gh",
      args: ["pr", "view", String(pullRequest), "--json", "body", "--jq", ".body"],
    });
    const closing = bodyClosing({ body, issues });

    if (closing !== null) {
      run({ command: "gh", args: ["pr", "edit", String(pullRequest), "--body", closing] });
    }
  }

  return { created: created.length };
};

const runComplete = async ({ world, env }: { world: World; env: Record<string, string> }) => {
  const { root, content, client, dryRun } = world;
  const pr = Number(env.BRIDGE_PR ?? "0");
  const mergedAt = env.BRIDGE_MERGED_AT ?? new Date().toISOString();
  const body = env.BRIDGE_PR_BODY ?? "";
  const iteration = env.BRIDGE_BASE ?? "";

  const loaded = await loadValid(root);
  const completions = completionsFor({ entries: loaded.entries, pr, mergedAt, body });

  if (dryRun) {
    for (const completion of completions) process.stdout.write(`complete #${completion.issue}\n`);

    return { completed: 0 };
  }

  if (completions.length > 0) await client.ensureLabel("completed");

  for (const completion of completions) {
    await client.addLabel({ number: completion.issue, label: "completed" });
    await client.comment({
      number: completion.issue,
      body: completionComment({ completion, base: iteration }),
    });
  }

  if (iteration) {
    const domain = iteration.split("/")[0] as string;

    await client.ensureLabel(domain);
    await client.addLabel({ number: pr, label: domain });
  }

  for (const reference of groupByIteration(
    completions.map((completion) => completion.file),
  ).keys()) {
    await commitToIterationBranch({
      reference,
      message: `Mirror completed task(s) for ${reference}`,
      apply: async () => {
        const live = completionsFor({
          entries: (await loadValid(root)).entries,
          pr,
          mergedAt,
          body,
        }).filter((completion) => referenceOf(completion.file) === reference);

        for (const completion of live) await writeCompletion({ root, completion });

        return live.map((completion) => `${content}/${completion.file}`);
      },
    });
  }

  return { completed: completions.length };
};

export type Settings = {
  token: string;
  repository: string;
  root: string;
  content: string;
};

// Resolution, separated from execution: everything worth asserting about where the bridge is
// pointed is decided here, and deciding it does not require a network.
export const settingsFor = ({
  cwd,
  env,
}: {
  cwd: string;
  env: Record<string, string>;
}): Settings => {
  const token = env.GITHUB_TOKEN ?? env.GH_TOKEN ?? "";

  // Refused before anything is read: a bridge that starts and fails halfway has already
  // written something.
  if (!token) throw new Error("no GITHUB_TOKEN: the bridge writes to GitHub and needs one");

  const repository = env.GITHUB_REPOSITORY ?? configuration({ from: cwd }).repository ?? "";

  if (!repository) {
    throw new Error(
      'no repository: set GITHUB_REPOSITORY, or "repository" in ccgh.json as <owner>/<name>',
    );
  }

  return {
    token,
    repository,
    root: contentRoot({ from: cwd }),
    content: contentDirectory({ from: cwd }),
  };
};

export const run = async ({
  argv,
  cwd,
  env = process.env as Record<string, string>,
}: {
  argv: string[];
  cwd: string;
  env?: Record<string, string>;
}): Promise<number> => {
  const [verb, ...rest] = argv;
  const dryRun = argv.includes("--dry-run");
  const verbs = ["push", "sync", "fixes", "complete", "reconcile", "relink"];

  if (!verb || !verbs.includes(verb)) {
    process.stderr.write(`unknown verb: ${verb ?? "<nothing>"}\nknown: ${verbs.join(", ")}\n`);

    return 1;
  }

  let settings: Settings;

  try {
    settings = settingsFor({ cwd, env });
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);

    return 1;
  }

  const [owner = "", repo = ""] = settings.repository.split("/");
  const world: World = {
    root: settings.root,
    content: settings.content,
    client: createGitHubClient({ token: settings.token, owner, repo }),
    repository: settings.repository,
    dryRun,
  };

  try {
    if (verb === "push") {
      const result = await runPush(world);

      process.stdout.write(
        dryRun
          ? `${result.planned} action(s) planned\n`
          : `${result.created} created, ${result.updated} updated, ${result.reported} reported\n`,
      );
    } else if (verb === "sync") {
      const result = await runSync(world);

      process.stdout.write(`${result.mirrored} mirrored, ${result.shipped} shipped\n`);
    } else if (verb === "fixes") {
      const result = await runFixes({
        world,
        branch: env.BRIDGE_BRANCH ?? "",
        arriving: (env.BRIDGE_ARRIVING ?? "").split(/\s+/).filter(Boolean),
        pullRequest: Number(env.BRIDGE_PR ?? "0"),
      });

      process.stdout.write(`${result.created} fix issue(s) created\n`);
    } else if (verb === "complete") {
      const result = await runComplete({ world, env });

      process.stdout.write(`${result.completed} completed\n`);
    } else if (verb === "relink") {
      const tablePath = rest.find((argument) => !argument.startsWith("--"));

      if (!tablePath) {
        process.stderr.write("usage: ccgh bridge relink <rename-table.md> [--dry-run]\n");

        return 1;
      }

      const table = readTable(readFileSync(tablePath, "utf8"));
      const bodies = await world.client.listBodies();
      const byNumber = new Map(bodies.map((item) => [item.number, item.body]));
      const changes = planRelink({ bodies, table });

      for (const change of changes) {
        const count = namesRewritten({ before: byNumber.get(change.number) ?? "", table });

        process.stdout.write(`#${change.number} ${change.kind}: ${count} path(s) rewritten\n`);
      }

      if (!dryRun) for (const change of changes) await world.client.updateBody(change);

      process.stdout.write(
        `${changes.length} of ${bodies.length} bodies ${dryRun ? "would change" : "relinked"}\n`,
      );
    } else {
      const pushed = await runPush(world);
      const synced = await runSync(world);
      const loaded = await loadContent(world.root);
      const stale = staleTasks({ entries: loaded.entries, now: new Date(), maxAgeHours: 24 });

      for (const item of stale) {
        process.stderr.write(`stale: ${item.file} (synced_at ${item.syncedAt ?? "never"})\n`);
      }

      const abandoned = abandonedFixIssues({
        entries: loaded.entries,
        remote: await world.client.readState(""),
      });

      for (const item of abandoned) {
        process.stderr.write(
          `abandoned: #${item.issue} was opened for ${item.file}, which is not on main\n`,
        );
      }

      process.stdout.write(
        `${pushed.created} created, ${synced.mirrored} mirrored, ${stale.length} stale, ${abandoned.length} abandoned\n`,
      );

      // A scheduled job that always succeeds is a job nobody reads.
      if (stale.length + abandoned.length > 0) return 1;
    }
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);

    return 1;
  }

  return 0;
};
