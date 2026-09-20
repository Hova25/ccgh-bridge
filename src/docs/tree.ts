import type { ParsedEntry } from "../model/validate";
import { urlFor } from "./routes";

export type TreeNode = {
  label: string;
  // What the tooltip says when the label alone would not: the dated name behind a title.
  hint: string | null;
  href: string | null;
  badge: string | null;
  open: boolean;
  current: boolean;
  children: TreeNode[];
};

const leaf = ({
  label,
  hint = null,
  href,
  badge = null,
  currentUrl,
}: {
  label: string;
  hint?: string | null;
  href: string;
  badge?: string | null;
  currentUrl: string;
}): TreeNode => ({
  label,
  hint,
  href,
  badge,
  open: false,
  current: href === currentUrl,
  children: [],
});

const group = ({ label, children }: { label: string; children: TreeNode[] }): TreeNode => ({
  label,
  hint: null,
  href: null,
  badge: null,
  open: false,
  current: false,
  children,
});

const mirrorState = (task: ParsedEntry): string | null =>
  ((task.data.github ?? {}) as { state?: string | null }).state ?? null;

const isDone = (task: ParsedEntry): boolean => {
  const github = (task.data.github ?? {}) as { state?: string | null; merged_at?: string | null };

  return github.state === "closed" || Boolean(github.merged_at);
};

const openAncestors = (node: TreeNode): boolean => {
  const anyChildOpen = node.children.map(openAncestors).some(Boolean);

  node.open = node.current || anyChildOpen;

  return node.open;
};

export const treeOf = ({
  entries,
  currentUrl,
}: {
  entries: ParsedEntry[];
  currentUrl: string;
}): TreeNode[] => {
  const domains = [...new Set(entries.map((entry) => entry.location.domain))].sort();

  const nodes = domains.map((domain) => {
    const owned = entries.filter((entry) => entry.location.domain === domain);
    const children: TreeNode[] = [];

    const pages = (kind: string) =>
      owned
        .filter((entry) => entry.location.kind === kind)
        .sort((a, b) => a.location.file.localeCompare(b.location.file))
        .map((entry) =>
          leaf({ label: entry.data.title as string, href: urlFor(entry.location), currentUrl }),
        );

    const guides = pages("guide");
    const decisions = pages("decision");
    const fixes = pages("fix").reverse();

    if (guides.length > 0) children.push(group({ label: "guide", children: guides }));
    if (decisions.length > 0) children.push(group({ label: "decisions", children: decisions }));
    if (fixes.length > 0) children.push(group({ label: "fixes", children: fixes }));

    const iterations = owned
      .filter((entry) => entry.location.kind === "iteration")
      .sort((a, b) =>
        (b.location.iteration as string).localeCompare(a.location.iteration as string),
      );

    for (const iteration of iterations) {
      const reference = iteration.location.reference;
      const inside = owned.filter((entry) => entry.location.reference === reference);
      const tasks = inside
        .filter((entry) => entry.location.kind === "task")
        .sort((a, b) => (a.data.order as number) - (b.data.order as number));

      const parts: TreeNode[] = [];
      const brainstorm = inside.find((entry) => entry.location.kind === "brainstorm");

      if (brainstorm) {
        parts.push(leaf({ label: "brainstorm", href: urlFor(brainstorm.location), currentUrl }));
      }

      if (tasks.length > 0) {
        const taskNodes = tasks.map((task) =>
          leaf({
            label: task.data.title as string,
            href: urlFor(task.location),
            badge: isDone(task) ? "done" : (mirrorState(task) ?? "pending"),
            currentUrl,
          }),
        );

        const tasksGroup = group({ label: "tasks", children: taskNodes });
        tasksGroup.badge = `${tasks.filter(isDone).length}/${tasks.length}`;
        parts.push(tasksGroup);
      }

      const node = leaf({
        label: iteration.data.title as string,
        hint: iteration.location.iteration as string,
        href: urlFor(iteration.location),
        badge: iteration.data.status as string,
        currentUrl,
      });

      node.children = parts;
      children.push(node);
    }

    const node = group({ label: domain, children });
    const index = owned.find((entry) => entry.location.kind === "domain");

    if (index) {
      node.href = urlFor(index.location);
      node.current = node.href === currentUrl;
    }

    return node;
  });

  for (const node of nodes) openAncestors(node);

  return nodes;
};
