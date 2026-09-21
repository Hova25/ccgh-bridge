import { existsSync } from "node:fs";
import { join } from "node:path";

export type PackageManager = "bun" | "pnpm" | "yarn" | "npm";

const lockfiles: [string, PackageManager][] = [
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
  ["npm-shrinkwrap.json", "npm"],
];

// The lockfile names the package manager; without one, package.json alone is npm's.
export const packageManagerOf = ({ repository }: { repository: string }): PackageManager | null => {
  if (!existsSync(join(repository, "package.json"))) return null;

  const found = lockfiles.find(([name]) => existsSync(join(repository, name)));

  return found ? found[1] : "npm";
};
