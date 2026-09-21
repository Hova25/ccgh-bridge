import { execFileSync } from "node:child_process";
import { repositoryRoot } from "../project";

type Run = (input: { command: string; args: string[] }) => string;

export const shellIn =
  (cwd: string): Run =>
  ({ command, args }) =>
    execFileSync(command, args, { encoding: "utf8", cwd }).trim();

// Resolved when it runs, not when it loads: the origin computed it from this file's own
// location, which inside a plugin points at the plugin rather than at the repository being
// worked on.
export const shell: Run = (input) => shellIn(repositoryRoot({ from: process.cwd() }))(input);

export const shipBranchFor = (reference: string): string => `bot/ship/${reference}`;

const standOn = ({ ref, run }: { ref: string; run: Run }): void => {
  run({ command: "git", args: ["fetch", "origin", ref] });
  run({ command: "git", args: ["checkout", "--detach", "FETCH_HEAD"] });
};

const commitWhatApplyChanged = async ({
  apply,
  message,
  run,
}: {
  apply: () => Promise<string[]>;
  message: string;
  run: Run;
}): Promise<boolean> => {
  const files = await apply();

  if (files.length === 0) return false;

  run({ command: "git", args: ["add", ...files] });

  if (run({ command: "git", args: ["diff", "--cached", "--name-only"] }).length === 0) return false;

  run({ command: "git", args: ["commit", "-m", `[bot] ${message}`, "--", ...files] });

  return true;
};

const openShipPullRequest = ({
  reference,
  branch,
  message,
  labels,
  run,
}: {
  reference: string;
  branch: string;
  message: string;
  labels: string[];
  run: Run;
}): void => {
  const existing = run({
    command: "gh",
    args: ["pr", "list", "--head", branch, "--state", "open", "--json", "number"],
  });

  if (existing.includes("number")) return;

  run({
    command: "gh",
    args: [
      "pr",
      "create",
      "--base",
      "main",
      "--head",
      branch,
      ...labels.flatMap((label) => ["--label", label]),
      "--title",
      `[bot] ${message}`,
      "--body",
      `The iteration branch \`${reference}\` no longer exists, so the bridge cannot write there. Merging this lands the change on main.`,
    ],
  });
};

const pushTo = ({ reference, run }: { reference: string; run: Run }): void => {
  try {
    run({ command: "git", args: ["push", "origin", `HEAD:refs/heads/${reference}`] });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);

    throw new Error(
      `push to ${reference} was refused; another run moved it — the next run recomputes\n${detail}`,
    );
  }
};

// Where the clone was standing before the bridge moved it. On a runner the checkout is
// throwaway and nobody notices; in a working clone, leaving it detached silently strands
// whatever the person was doing — which it did, once, to the branch that wrote this comment.
const standingOn = ({ run }: { run: Run }): string => {
  const branch = run({ command: "git", args: ["rev-parse", "--abbrev-ref", "HEAD"] });

  return branch === "HEAD" ? run({ command: "git", args: ["rev-parse", "HEAD"] }) : branch;
};

const standBackOn = ({ ref, run }: { ref: string; run: Run }): void => {
  run({ command: "git", args: ["checkout", ref] });
};

export const commitToIterationBranch = async ({
  reference,
  apply,
  message,
  shipping = false,
  run = shell,
}: {
  reference: string;
  apply: () => Promise<string[]>;
  message: string;
  shipping?: boolean;
  run?: Run;
}): Promise<{ branch: string; committed: boolean }> => {
  const was = standingOn({ run });

  try {
    return await commitThere({ reference, apply, message, shipping, run });
  } finally {
    standBackOn({ ref: was, run });
  }
};

const commitThere = async ({
  reference,
  apply,
  message,
  shipping,
  run,
}: {
  reference: string;
  apply: () => Promise<string[]>;
  message: string;
  shipping: boolean;
  run: Run;
}): Promise<{ branch: string; committed: boolean }> => {
  const alive =
    run({ command: "git", args: ["ls-remote", "--heads", "origin", `refs/heads/${reference}`] })
      .length > 0;

  if (alive) {
    standOn({ ref: reference, run });

    if (!(await commitWhatApplyChanged({ apply, message, run }))) {
      return { branch: reference, committed: false };
    }

    pushTo({ reference, run });

    return { branch: reference, committed: true };
  }

  const branch = shipBranchFor(reference);

  standOn({ ref: "main", run });

  if (!(await commitWhatApplyChanged({ apply, message, run }))) {
    return { branch: reference, committed: false };
  }

  run({ command: "git", args: ["push", "--force", "origin", `HEAD:refs/heads/${branch}`] });

  const domain = reference.split("/")[0] as string;

  openShipPullRequest({
    reference,
    branch,
    message,
    labels: shipping ? [domain, "completed"] : [domain],
    run,
  });

  return { branch, committed: true };
};
