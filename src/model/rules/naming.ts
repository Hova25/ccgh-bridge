import { basename } from "node:path";
import { DATED_NAME, datedName } from "../schemas";
import type { Failure, ParsedEntry } from "../validate";

const iterationDirectory = datedName;
const taskFile = /^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const decisionFile = /^\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const guideFile = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const fixFile = new RegExp(`^${DATED_NAME}\\.md$`);

export const checkNaming = (entries: ParsedEntry[]): Failure[] => {
  const failures: Failure[] = [];
  const reported = new Set<string>();

  for (const { location } of entries) {
    const file = location.file;
    const name = basename(file);

    if (location.iteration && !iterationDirectory.test(location.iteration)) {
      const key = location.reference as string;

      if (!reported.has(key)) {
        reported.add(key);
        failures.push({
          file,
          message: `iteration directory must be yyyy-mm-dd-HHMM-slug, got ${location.iteration}`,
        });
      }
    }

    if (location.kind === "task" && !taskFile.test(name)) {
      failures.push({ file, message: "task file must start with a two-digit order prefix" });
    }

    if (location.kind === "decision" && !decisionFile.test(name)) {
      failures.push({ file, message: "decision file must start with a three-digit prefix" });
    }

    if (location.kind === "fix" && !fixFile.test(name)) {
      failures.push({ file, message: "fix file must be yyyy-mm-dd-HHMM-slug" });
    }

    if (location.kind === "guide" && !guideFile.test(name)) {
      failures.push({ file, message: "guide file must be a lower-case slug" });
    }
  }

  return failures;
};
