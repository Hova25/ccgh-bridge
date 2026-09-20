import { defineCollection } from "astro:content";
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

const contentCollection = ({ pattern, schema }: { pattern: string; schema: unknown }) =>
  defineCollection({
    loader: glob({ base: process.env.CCGH_CONTENT, pattern, generateId: keepPath }),
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
