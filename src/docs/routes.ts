import { basename } from "node:path";
import type { ContentLocation } from "../model/paths";

const slugOf = (file: string): string => basename(file).replace(/\.md$/, "");

export const urlFor = (location: ContentLocation): string => {
  const { kind, domain, iteration, file } = location;

  if (kind === "domain") return `/${domain}`;
  if (kind === "guide") return `/${domain}/guide/${slugOf(file)}`;
  if (kind === "decision") return `/${domain}/decisions/${slugOf(file)}`;
  if (kind === "fix") return `/${domain}/fixes/${slugOf(file)}`;
  if (kind === "iteration") return `/${domain}/${iteration}`;
  if (kind === "brainstorm") return `/${domain}/${iteration}/brainstorm`;

  return `/${domain}/${iteration}/${slugOf(file)}`;
};

// The root crumb is a place, not a project: naming the repository here would be a second
// copy of what the shell already shows, and the origin's copy said the wrong thing.
export const breadcrumbFor = (
  location: ContentLocation,
): Array<{ label: string; href: string }> => {
  const crumbs = [
    { label: "Home", href: "/" },
    { label: location.domain, href: `/${location.domain}` },
  ];

  if (location.kind === "domain") return crumbs;

  if (location.iteration) {
    crumbs.push({
      label: location.iteration,
      href: `/${location.domain}/${location.iteration}`,
    });
  }

  if (location.kind === "iteration") return crumbs;

  return [...crumbs, { label: slugOf(location.file), href: urlFor(location) }];
};
