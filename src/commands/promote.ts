import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import { type LoadedContent, loadContent } from "../model/load";
import { validate } from "../model/validate";
import { contentRoot } from "../project";

export type Target = "ready" | "active";

export type PromotionPlan = {
  reference: string;
  file: string;
  from: string;
  to: Target;
  relaunch: boolean;
  taskTitles: string[];
  taskFiles: string[];
  blockers: string[];
};

const legalTransitions: Record<Target, string[]> = {
  ready: ["draft"],
  active: ["ready", "active"],
};

export const planPromotion = ({
  loaded,
  reference,
  to,
}: {
  loaded: LoadedContent;
  reference: string;
  to: Target;
}): PromotionPlan => {
  const iterations = loaded.entries.filter((entry) => entry.location.kind === "iteration");
  const target = iterations.find((entry) => entry.location.reference === reference);

  if (!target) {
    return {
      reference,
      file: "",
      from: "",
      to,
      relaunch: false,
      taskTitles: [],
      taskFiles: [],
      blockers: [`${reference} does not exist`],
    };
  }

  const from = target.data.status as string;
  const blockers: string[] = [];

  if (!legalTransitions[to].includes(from)) {
    blockers.push(
      `cannot move from ${from} to ${to}; only ${legalTransitions[to].join(" or ")} can`,
    );
  }

  const tasks = loaded.entries
    .filter((entry) => entry.location.kind === "task" && entry.location.reference === reference)
    .sort((a, b) => (a.data.order as number) - (b.data.order as number));

  if (tasks.length === 0) blockers.push("the iteration declares no task");

  for (const task of tasks) {
    if (!task.data.title) blockers.push(`${task.location.file} has no title`);
  }

  if (to === "active") {
    for (const dependency of (target.data.depends_on as string[]) ?? []) {
      const found = iterations.find((entry) => entry.location.reference === dependency);
      const status = found?.data.status ?? "missing";

      if (status !== "shipped") blockers.push(`${dependency} is ${status}, not shipped`);
    }
  }

  return {
    reference,
    file: target.location.file,
    from,
    to,
    relaunch: from === "active" && to === "active",
    taskTitles: tasks.map((task) => task.data.title as string),
    taskFiles: tasks.map((task) => task.location.file.split("/").slice(3).join("/")),
    blockers,
  };
};

export const applyPromotion = async ({
  root,
  plan,
  actor,
}: {
  root: string;
  plan: PromotionPlan;
  actor: string;
}): Promise<void> => {
  const path = join(root, plan.file);
  const parsed = matter(await readFile(path, "utf8"));
  const data = { ...parsed.data };
  const now = new Date().toISOString();

  data.status = plan.to;

  if (plan.to === "ready") {
    data.validated_by = actor;
    data.validated_at = now;
  } else {
    data.launched_by = actor;
    data.launched_at = now;
    data.launched_tasks = plan.taskFiles;
  }

  await writeFile(path, matter.stringify(parsed.content, data), "utf8");
};

const describe = (plan: PromotionPlan): string => {
  const lines = [
    plan.relaunch
      ? `${plan.reference}: already active, re-approving its task set`
      : `${plan.reference}: ${plan.from} -> ${plan.to}`,
    `${plan.taskTitles.length} task(s):`,
    ...plan.taskTitles.map((title, index) => `  ${index + 1}. ${title}`),
  ];

  if (plan.to === "active") {
    lines.push(
      "",
      plan.relaunch
        ? "Re-approving rewrites launched_tasks. The Action opens an issue for each task that has none."
        : "Launching commits status: active. The GitHub Action opens one issue per task.",
    );
  }

  return lines.join("\n");
};

export const run = async ({ argv, cwd }: { argv: string[]; cwd: string }): Promise<number> => {
  const [reference, ...flags] = argv;
  const asked = flags.includes("--to") ? flags[flags.indexOf("--to") + 1] : "ready";
  const dryRun = flags.includes("--dry-run");

  if (asked !== "ready" && asked !== "active") {
    process.stderr.write(`${asked} is not a status this command may write\n`);

    return 1;
  }

  const to: Target = asked;
  const root = contentRoot({ from: cwd });
  const loaded = await loadContent(root);
  const failures = validate(loaded);

  if (failures.length > 0) {
    for (const failure of failures) process.stderr.write(`${failure.file}: ${failure.message}\n`);
    process.stderr.write("Content is invalid. Fix it before promoting anything.\n");

    return 1;
  }

  const plan = planPromotion({ loaded, reference: reference as string, to });

  process.stdout.write(`${describe(plan)}\n`);

  if (plan.blockers.length > 0) {
    for (const blocker of plan.blockers) process.stderr.write(`blocked: ${blocker}\n`);

    return 1;
  }

  if (dryRun) {
    process.stdout.write("\nDry run: nothing was written.\n");

    return 0;
  }

  const actor = process.env.USER ?? "unknown";

  await applyPromotion({ root, plan, actor });
  process.stdout.write(`\nWritten. Commit ${plan.file} on a branch and open a pull request.\n`);

  return 0;
};
