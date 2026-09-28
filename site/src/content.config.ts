import { defineCollection } from "astro:content";
import { pathToFileURL } from "node:url";
import { glob } from "astro/loaders";
import {
  brainstormSchema,
  decisionSchema,
  domainSchema,
  fixSchema,
  guideSchema,
  iterationSchema,
  taskSchema,
} from "../../src/model/schemas";

// The identifier keeps the path, minus the extension, because `locate()` parses it.
const keepPath = ({ entry }: { entry: string }) => entry.replace(/\.md$/, "");

// The loader resolves its base with `new URL(base, root)`, which reads a path rather than a
// URL: `C:\repository` becomes the scheme `c:`, and a `#` or a `?` anywhere in the path starts
// a fragment or a query. Both are paths a repository can sit at, so the conversion is done
// here rather than left to the parser.
const base = process.env.CCGH_CONTENT ? pathToFileURL(process.env.CCGH_CONTENT) : undefined;

const contentCollection = ({ pattern, schema }: { pattern: string; schema: unknown }) =>
  defineCollection({
    loader: glob({ base, pattern, generateId: keepPath }),
    schema: schema as never,
  });

export const collections = {
  domains: contentCollection({ pattern: "*/index.md", schema: domainSchema }),
  guides: contentCollection({ pattern: "*/guide/*.md", schema: guideSchema }),
  decisions: contentCollection({ pattern: "*/decisions/*.md", schema: decisionSchema }),
  fixes: contentCollection({ pattern: "*/fixes/*.md", schema: fixSchema }),
  iterations: contentCollection({ pattern: "*/iterations/*/spec.md", schema: iterationSchema }),
  brainstorms: contentCollection({
    pattern: "*/iterations/*/brainstorm.md",
    schema: brainstormSchema,
  }),
  tasks: contentCollection({ pattern: "*/iterations/*/tasks/*.md", schema: taskSchema }),
};
