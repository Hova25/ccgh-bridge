import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import { stringifyFrontMatter } from "../model/front-matter";

export type MirrorState = {
  state: "open" | "closed";
  pr: number | null;
  merged_at: string | null;
};

const edit = async ({
  root,
  file,
  change,
}: {
  root: string;
  file: string;
  change: (data: Record<string, unknown>) => void;
}): Promise<void> => {
  const path = join(root, file);
  const parsed = matter(await readFile(path, "utf8"));
  const data = { ...parsed.data };

  // YAML reads `date: 2026-09-21` as a Date, and writing it back would turn the day a record
  // was written into a timestamp at midnight. Such keys go back out as the day they were.
  const days = Object.keys(data).filter((key) => {
    const value = data[key];

    return value instanceof Date && value.toISOString().endsWith("T00:00:00.000Z");
  });

  for (const key of days) data[key] = (data[key] as Date).toISOString().slice(0, 10);

  change(data);

  let written = stringifyFrontMatter({ content: parsed.content, data });

  for (const key of days) {
    written = written.replace(new RegExp(`^${key}: "(\\d{4}-\\d{2}-\\d{2})"$`, "m"), `${key}: $1`);
  }

  await writeFile(path, written, "utf8");
};

export const writeIssueNumbers = async ({
  root,
  created,
}: {
  root: string;
  created: Array<{ file: string; number: number; pr?: number }>;
}): Promise<string[]> => {
  for (const { file, number, pr } of created) {
    await edit({
      root,
      file,
      change: (data) => {
        data.issue = number;
        if (pr) data.pr = pr;
      },
    });
  }

  return created.map(({ file }) => file);
};

export const writePullRequest = async ({
  root,
  file,
  pr,
}: {
  root: string;
  file: string;
  pr: number;
}): Promise<void> => {
  await edit({
    root,
    file,
    change: (data) => {
      data.pr = pr;
    },
  });
};

export const writeMirror = async ({
  root,
  file,
  state,
}: {
  root: string;
  file: string;
  state: MirrorState;
}): Promise<void> => {
  await edit({
    root,
    file,
    change: (data) => {
      data.github = { ...state, synced_at: new Date().toISOString() };
    },
  });
};

export const markShipped = async ({
  root,
  specFile,
}: {
  root: string;
  specFile: string;
}): Promise<void> => {
  await edit({
    root,
    file: specFile,
    change: (data) => {
      if (data.status !== "active") {
        throw new Error(`${specFile} is ${data.status}, only an active iteration can ship`);
      }

      data.status = "shipped";
    },
  });
};

export const writeCompletion = async ({
  root,
  completion,
}: {
  root: string;
  completion: { file: string; pr: number; mergedAt: string };
}): Promise<void> => {
  await edit({
    root,
    file: completion.file,
    change: (data) => {
      const github = (data.github ?? {}) as Record<string, unknown>;

      data.github = {
        ...github,
        pr: completion.pr,
        merged_at: completion.mergedAt,
        synced_at: new Date().toISOString(),
      };
    },
  });
};
