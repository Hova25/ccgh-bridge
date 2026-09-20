export type ContentKind =
  | "domain"
  | "guide"
  | "decision"
  | "iteration"
  | "brainstorm"
  | "task"
  | "fix";

export type ContentLocation = {
  kind: ContentKind;
  domain: string;
  iteration: string | null;
  reference: string | null;
  file: string;
};

const inDomain = ({
  kind,
  domain,
  file,
}: {
  kind: ContentKind;
  domain: string;
  file: string;
}): ContentLocation => ({ kind, domain, iteration: null, reference: null, file });

const inIteration = ({
  kind,
  domain,
  iteration,
  file,
}: {
  kind: ContentKind;
  domain: string;
  iteration: string;
  file: string;
}): ContentLocation => ({
  kind,
  domain,
  iteration,
  reference: `${domain}/${iteration}`,
  file,
});

export const locate = (relativePath: string): ContentLocation | null => {
  const segments = relativePath.split("/");
  const [domain, second, third, fourth, fifth] = segments;

  if (!domain || !second) return null;

  if (segments.length === 2) {
    return second === "index.md" ? inDomain({ kind: "domain", domain, file: relativePath }) : null;
  }

  if (segments.length === 3 && third) {
    if (second === "guide") return inDomain({ kind: "guide", domain, file: relativePath });
    if (second === "decisions") return inDomain({ kind: "decision", domain, file: relativePath });
    if (second === "fixes") return inDomain({ kind: "fix", domain, file: relativePath });
    return null;
  }

  if (second !== "iterations" || !third) return null;

  if (segments.length === 4) {
    if (fourth === "spec.md")
      return inIteration({ kind: "iteration", domain, iteration: third, file: relativePath });
    if (fourth === "brainstorm.md")
      return inIteration({ kind: "brainstorm", domain, iteration: third, file: relativePath });
    return null;
  }

  if (segments.length === 5 && fourth === "tasks" && fifth) {
    return inIteration({ kind: "task", domain, iteration: third, file: relativePath });
  }

  return null;
};
