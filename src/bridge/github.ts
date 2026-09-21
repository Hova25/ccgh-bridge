import { Octokit } from "@octokit/rest";

// The shapes the client returns. At the origin they lived in the modules that consume them —
// `plan` and `relink` — which made the client depend on its own consumers. They belong to
// whoever produces them.
export type RemoteIssue = {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
};

export type RemoteState = {
  issues: RemoteIssue[];
  milestones: string[];
};

export type RemoteBody = { number: number; kind: "issue" | "pull"; body: string };

export type GitHubClient = {
  readState: (milestonePrefix: string) => Promise<RemoteState>;
  createMilestone: (title: string) => Promise<number>;
  createIssue: (input: {
    title: string;
    body: string;
    milestone: string | null;
    labels: string[];
  }) => Promise<number>;
  updateBody: (input: { number: number; body: string }) => Promise<void>;
  listBodies: () => Promise<RemoteBody[]>;
  comment: (input: { number: number; body: string }) => Promise<void>;
  ensureLabel: (name: string) => Promise<void>;
  addLabel: (input: { number: number; label: string }) => Promise<void>;
  pullRequestForBranch: (input: { branch: string }) => Promise<number | null>;
  openPullRequestBranches: () => Promise<Set<string>>;
};

export const createGitHubClient = ({
  token,
  owner,
  repo,
}: {
  token: string;
  owner: string;
  repo: string;
}): GitHubClient => {
  if (!token) throw new Error("a GitHub token is required");

  const octokit = new Octokit({ auth: token });
  const target = { owner, repo };
  const milestoneNumbers = new Map<string, number>();

  const rememberMilestones = async (): Promise<Array<{ title: string; number: number }>> => {
    const all = await octokit.paginate(octokit.issues.listMilestones, {
      ...target,
      state: "all",
    });

    for (const milestone of all) milestoneNumbers.set(milestone.title, milestone.number);

    return all.map(({ title, number }) => ({ title, number }));
  };

  const milestoneNumber = async (title: string): Promise<number> => {
    if (!milestoneNumbers.has(title)) await rememberMilestones();

    const found = milestoneNumbers.get(title);
    if (!found) throw new Error(`milestone ${title} does not exist`);

    return found;
  };

  return {
    readState: async (milestonePrefix) => {
      const milestones = await rememberMilestones();
      const issues = await octokit.paginate(octokit.issues.listForRepo, {
        ...target,
        state: "all",
        per_page: 100,
      });

      const mapped: RemoteIssue[] = issues
        .filter((issue) => !issue.pull_request)
        .map((issue) => ({
          number: issue.number,
          title: issue.title,
          body: issue.body ?? "",
          state: issue.state === "closed" ? "closed" : "open",
        }));

      return {
        issues: mapped,
        milestones: milestones
          .map((milestone) => milestone.title)
          .filter((title) => title.startsWith(milestonePrefix)),
      };
    },

    createMilestone: async (title) => {
      const created = await octokit.issues.createMilestone({ ...target, title });
      milestoneNumbers.set(title, created.data.number);

      return created.data.number;
    },

    createIssue: async ({ title, body, milestone, labels }) => {
      const created = await octokit.issues.create({
        ...target,
        title,
        body,
        labels,
        milestone: milestone === null ? undefined : await milestoneNumber(milestone),
      });

      return created.data.number;
    },

    updateBody: async ({ number, body }) => {
      await octokit.issues.update({ ...target, issue_number: number, body });
    },

    // Pull requests come back in the same list, flagged by a pull_request field, and
    // issues.update accepts either kind, so one listing serves the relink.
    listBodies: async () => {
      const all = await octokit.paginate(octokit.issues.listForRepo, {
        ...target,
        state: "all",
        per_page: 100,
      });

      return all.map((item) => ({
        number: item.number,
        kind: item.pull_request ? ("pull" as const) : ("issue" as const),
        body: item.body ?? "",
      }));
    },

    comment: async ({ number, body }) => {
      await octokit.issues.createComment({ ...target, issue_number: number, body });
    },

    addLabel: async ({ number, label }) => {
      await octokit.issues.addLabels({ ...target, issue_number: number, labels: [label] });
    },

    pullRequestForBranch: async ({ branch }) => {
      const found = await octokit.pulls.list({
        ...target,
        head: `${owner}:${branch}`,
        state: "all",
        per_page: 100,
      });

      const exact = found.data.find((pull) => pull.head.ref === branch);

      return exact?.number ?? null;
    },

    openPullRequestBranches: async () => {
      const open = await octokit.paginate(octokit.pulls.list, {
        ...target,
        state: "open",
        per_page: 100,
      });

      return new Set(open.map((pull) => pull.head.ref));
    },

    ensureLabel: async (name) => {
      try {
        await octokit.issues.getLabel({ ...target, name });
      } catch {
        await octokit.issues.createLabel({ ...target, name, color: "ededed" });
      }
    },
  };
};
