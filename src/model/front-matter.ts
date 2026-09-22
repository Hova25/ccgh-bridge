import matter from "gray-matter";
import { dump, load } from "js-yaml";

// gray-matter's own js-yaml 3 can only quote with single quotes, which Prettier at its default
// settings rewrites as double: every file ccgh wrote would fail a consumer's format check.
const yaml = {
  parse: (input: string) => (load(input) ?? {}) as object,
  stringify: (data: object) => dump(data, { quotingType: '"' }),
};

export const stringifyFrontMatter = ({
  content,
  data,
}: {
  content: string;
  data: Record<string, unknown>;
}): string => matter.stringify(content, data, { engines: { yaml } });
