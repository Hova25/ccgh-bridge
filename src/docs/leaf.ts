import type { ContentLocation } from "../model/paths";

// The pure half of what a leaf page needs. Its other half — `pathsFor` and `leafOf` — reads
// the collections, so it lives beside `entries` in the site rather than here.
export const slugOf = (location: ContentLocation): string =>
  (location.file.split("/").at(-1) ?? location.file).replace(/\.md$/, "");
