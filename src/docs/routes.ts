import { basename } from "node:path";
import type { ContentLocation } from "../model/paths";

const slugOf = (file: string): string => basename(file).replace(/\.md$/, "");

// Astro's `base` reaches the assets it emits and nothing else: these paths are ours, so a
// published site would serve every one of them from the domain root and find nothing. Read
// here rather than threaded through every caller, because it is one fact about the whole
// build, decided once by `ccgh docs`.
const base = (): string => {
  const configured = process.env.CCGH_BASE ?? "/";

  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
};

export const urlFor = (location: ContentLocation): string => {
  const { kind, domain, iteration, file } = location;
  const at = base();

  if (kind === "domain") return `${at}/${domain}`;
  if (kind === "guide") return `${at}/${domain}/guide/${slugOf(file)}`;
  if (kind === "decision") return `${at}/${domain}/decisions/${slugOf(file)}`;
  if (kind === "fix") return `${at}/${domain}/fixes/${slugOf(file)}`;
  if (kind === "iteration") return `${at}/${domain}/${iteration}`;
  if (kind === "brainstorm") return `${at}/${domain}/${iteration}/brainstorm`;

  return `${at}/${domain}/${iteration}/${slugOf(file)}`;
};

// The root crumb is a place, not a project: naming the repository here would be a second
// copy of what the shell already shows, and the origin's copy said the wrong thing.
export const breadcrumbFor = (
  location: ContentLocation,
): Array<{ label: string; href: string }> => {
  const crumbs = [
    { label: "Home", href: `${base()}/` },
    { label: location.domain, href: `${base()}/${location.domain}` },
  ];

  if (location.kind === "domain") return crumbs;

  if (location.iteration) {
    crumbs.push({
      label: location.iteration,
      href: `${base()}/${location.domain}/${location.iteration}`,
    });
  }

  if (location.kind === "iteration") return crumbs;

  return [...crumbs, { label: slugOf(location.file), href: urlFor(location) }];
};
