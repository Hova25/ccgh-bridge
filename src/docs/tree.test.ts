import { describe, expect, it } from "bun:test";
import { locate } from "../model/paths";
import type { ParsedEntry } from "../model/validate";
import { type TreeNode, treeOf } from "./tree";

const at = (file: string) => {
  const location = locate(file);

  if (!location) throw new Error(`no known shape for ${file}`);

  return location;
};

const entry = ({ file, data }: { file: string; data: Record<string, unknown> }): ParsedEntry => ({
  location: at(file),
  data,
  body: "",
});

const tree = () => [
  entry({ file: "harness/index.md", data: { title: "Harness", summary: "s" } }),
  entry({ file: "harness/guide/workflow.md", data: { title: "How work flows", order: 1 } }),
  entry({
    file: "harness/iterations/2026-09-13-1529-bootstrap/spec.md",
    data: { title: "Bootstrap", status: "shipped" },
  }),
  entry({
    file: "harness/iterations/2026-09-13-1529-bootstrap/tasks/01-a.md",
    data: { title: "First", order: 1, issue: 4, github: { state: "closed" } },
  }),
  entry({
    file: "harness/iterations/2026-09-13-1529-bootstrap/tasks/02-b.md",
    data: { title: "Second", order: 2, issue: 5, github: { state: "open" } },
  }),
];

const find = ({ nodes, label }: { nodes: TreeNode[]; label: string }): TreeNode | undefined => {
  for (const node of nodes) {
    if (node.label === label) return node;

    const deeper = find({ nodes: node.children, label });
    if (deeper) return deeper;
  }

  return undefined;
};

describe("treeOf", () => {
  it("nests domain, iteration and tasks", () => {
    const nodes = treeOf({ entries: tree(), currentUrl: "/" });

    expect(nodes[0]?.label).toBe("harness");
    expect(find({ nodes, label: "Bootstrap" })?.badge).toBe("shipped");

    const tasks = find({ nodes, label: "tasks" });
    expect(tasks?.children).toHaveLength(2);
    expect(tasks?.href).toBeNull();
  });

  it("labels an iteration with its title and keeps the dated name for the tooltip", () => {
    const node = find({ nodes: treeOf({ entries: tree(), currentUrl: "/" }), label: "Bootstrap" });

    expect(node?.hint).toBe("2026-09-13-1529-bootstrap");
    expect(
      find({ nodes: treeOf({ entries: tree(), currentUrl: "/" }), label: "tasks" })?.hint,
    ).toBe(null);
  });

  it("counts done tasks on the tasks group", () => {
    expect(
      find({ nodes: treeOf({ entries: tree(), currentUrl: "/" }), label: "tasks" })?.badge,
    ).toBe("1/2");
  });

  it("folds everything when the current page is the home page", () => {
    expect(treeOf({ entries: tree(), currentUrl: "/" }).every((node) => !node.open)).toBe(true);
  });

  it("opens every ancestor of the current page and marks it current", () => {
    const nodes = treeOf({
      entries: tree(),
      currentUrl: "/harness/2026-09-13-1529-bootstrap/02-b",
    });

    expect(find({ nodes, label: "harness" })?.open).toBe(true);
    expect(find({ nodes, label: "Bootstrap" })?.open).toBe(true);
    expect(find({ nodes, label: "tasks" })?.open).toBe(true);
    expect(find({ nodes, label: "Second" })?.current).toBe(true);
    expect(find({ nodes, label: "First" })?.current).toBe(false);
  });

  it("leaves a sibling branch folded", () => {
    const nodes = treeOf({
      entries: tree(),
      currentUrl: "/harness/2026-09-13-1529-bootstrap/02-b",
    });

    expect(find({ nodes, label: "guide" })?.open).toBe(false);
  });

  it("orders tasks by their order field, not by title", () => {
    const nodes = treeOf({ entries: tree().reverse(), currentUrl: "/" });

    expect(find({ nodes, label: "tasks" })?.children.map((child) => child.label)).toEqual([
      "First",
      "Second",
    ]);
  });

  it("marks a merged task done even while its issue is open", () => {
    const entries = tree();
    const second = entries.find((item) => item.data.title === "Second");

    if (!second) throw new Error("the fixture lost its second task");

    (second.data.github as Record<string, unknown>).merged_at = "2026-09-13T21:00:00Z";

    const nodes = treeOf({ entries, currentUrl: "/" });

    expect(find({ nodes, label: "Second" })?.badge).toBe("done");
    expect(find({ nodes, label: "tasks" })?.badge).toBe("2/2");
  });
});
