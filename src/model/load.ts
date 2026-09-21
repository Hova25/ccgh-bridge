import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import matter from "gray-matter";
import { type ContentLocation, locate } from "./paths";

export type LoadedEntry = {
  location: ContentLocation;
  data: Record<string, unknown>;
  body: string;
};

export type LoadedContent = {
  entries: LoadedEntry[];
  unknown: string[];
  unreadable: Array<{ file: string; reason: string }>;
};

const markdownFiles = async ({
  root,
  directory,
}: {
  root: string;
  directory: string;
}): Promise<string[]> => {
  const found: string[] = [];

  for (const item of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, item.name);

    if (item.isDirectory()) {
      found.push(...(await markdownFiles({ root, directory: full })));
    } else if (item.name.endsWith(".md")) {
      found.push(relative(root, full).split(sep).join("/"));
    }
  }

  return found;
};

export const loadContent = async (root: string): Promise<LoadedContent> => {
  const entries: LoadedEntry[] = [];
  const unknown: string[] = [];
  const unreadable: Array<{ file: string; reason: string }> = [];

  for (const file of await markdownFiles({ root, directory: root })) {
    const location = locate(file);

    if (!location) {
      unknown.push(file);
      continue;
    }

    try {
      // A Windows checkout with core.autocrlf hands every rule "\r\n", and they all split on "\n".
      const text = (await readFile(join(root, file), "utf8")).replaceAll("\r\n", "\n");
      const { data, content } = matter(text);
      entries.push({ location, data, body: content });
    } catch (error) {
      unreadable.push({ file, reason: (error as Error).message.split("\n")[0] as string });
    }
  }

  return { entries, unknown, unreadable };
};
