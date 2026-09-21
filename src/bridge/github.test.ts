import { describe, expect, it } from "bun:test";
import { createGitHubClient } from "./github";

describe("createGitHubClient", () => {
  it("exposes exactly the operations the bridge needs", () => {
    const client = createGitHubClient({ token: "t", owner: "o", repo: "r" });

    expect(Object.keys(client).sort()).toEqual([
      "addLabel",
      "comment",
      "createIssue",
      "createMilestone",
      "ensureLabel",
      "listBodies",
      "openPullRequestBranches",
      "pullRequestForBranch",
      "readState",
      "updateBody",
    ]);
  });

  it("refuses to build without a token", () => {
    expect(() => createGitHubClient({ token: "", owner: "o", repo: "r" })).toThrow(/token/);
  });
});
