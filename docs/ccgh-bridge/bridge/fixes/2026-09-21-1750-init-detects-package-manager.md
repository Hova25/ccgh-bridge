---
title: Install with the package manager the lockfile names
date: 2026-09-21
issue: 105
pr: 104
---

# Install with the package manager the lockfile names

When `ccgh.json` lists `check` commands, `ccgh init` adds to `ccgh-validate.yml` the steps that
install the repository's dependencies before running them. It decided on the mere presence of
`package.json`, and always chose Bun: `setup-bun`, then `bun install --frozen-lockfile`. In a
pnpm, Yarn or npm repository that step fails, since there is no Bun lockfile to keep frozen, and
every pull request fails its validation before the repository's own checks ever run.

The toolchain now follows the lockfile at the repository root. `bun.lock` or `bun.lockb` keeps
the Bun steps unchanged. `pnpm-lock.yaml` sets up pnpm through `pnpm/action-setup`, which reads
the version from `packageManager` in `package.json` and is otherwise asked for the latest, then
Node with the pnpm cache and `pnpm install --frozen-lockfile`. `yarn.lock` installs with
`yarn install --frozen-lockfile` and the Yarn cache, or, beside a `.yarnrc.yml`, enables corepack
and runs `yarn install --immutable` without the cache, which would otherwise be read from Yarn 1.
`package-lock.json` or `npm-shrinkwrap.json` runs `npm ci` with the npm cache, and a
`package.json` with no lockfile runs `npm install`. Node follows `.nvmrc` or `.node-version`
when the repository has one, and the current LTS otherwise. A repository without `package.json`
installs nothing, as before. The check commands themselves are still the ones `ccgh.json`
lists; a consumer re-runs `ccgh init` to regenerate the workflow.
