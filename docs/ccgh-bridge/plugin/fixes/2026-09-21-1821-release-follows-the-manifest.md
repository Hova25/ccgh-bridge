---
title: Tag and publish a release when the manifest's version changes
date: 2026-09-21
issue: 113
pr: 112
---

# Tag and publish a release when the manifest's version changes

A release took two steps. A pull request bumped the version in `plugin.json`, and once it had
merged someone had to tag the merge commit `vX.Y.Z` and force-move `v1` onto it by hand, since
the tag belongs on a commit that only exists after the merge. Until that second step, nothing
reached a consumer, and every release waited on it. The procedure also never published a GitHub
release, so the repository's releases page stayed empty although every version had its tag.

A `release` workflow now takes the second step. It runs when a push to `main` changes
`.claude-plugin/plugin.json`, reads the version, and does nothing if its tag already exists.
Otherwise it tags the pushed commit `vX.Y.Z`, moves the major tag onto it, and publishes the
GitHub release with notes generated from the pull requests since the previous version tag. The
README describes the new procedure and keeps the manual commands for when the workflow fails.
The versions released before this one keep their tags and have no GitHub release; creating
those is a separate decision.
