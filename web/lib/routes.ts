/**
 * The route registry: every indexable page, with the five fields the search
 * research step produces.
 *
 * This is the single source of truth. Pages read their metadata from here, the
 * sitemap is generated from here, and the CI checks validate it. Adding a page
 * means adding a row — and a page whose row is missing fails the build rather
 * than shipping without a title.
 */

export type Intent =
  | "informational"
  | "comparison"
  | "commercial"
  | "navigational"
  | "local";

export type PageType = "pillar" | "child" | "comparison" | "guide" | "utility";

export interface Route {
  /** Path as served. Lowercase, hyphenated, no trailing slash. "/" for home. */
  path: string;
  /** The exact search this page exists to answer. One page per query. */
  targetQuery: string;
  /** What the searcher wants. Decides how the page should read. */
  intent: Intent;
  /** Shape of the page. Decides template and depth. */
  pageType: PageType;
  /** Path of the pillar this page sits under. null for a pillar or the home page. */
  clusterParent: string | null;
  /** <title>. Aim for 50–60 characters; the build fails over 60. */
  title: string;
  /** <meta name="description">. 140–160 characters. */
  description: string;
  /** Sitemap priority hint. Optional. */
  priority?: number;
  /** Set false for a page that should exist but not be indexed. */
  indexable?: boolean;
}

// Target queries are UNVERIFIED drafts from the blueprint; replace after search research.
export const routes: Route[] = [
  {
    path: "/",
    targetQuery: "jtech sewing machines",
    intent: "navigational",
    pageType: "pillar",
    clusterParent: null,
    title: "Jtech Sewing Machines | Find Your Next Sewing Machine",
    description:
      "Explore Jtech sewing machines, understand what's included and what to consider before choosing, then ask about a machine. Private prototype with sample content.",
    priority: 1,
  },
];

export const routeFor = (path: string): Route => {
  const route = routes.find((r) => r.path === path);
  if (!route) {
    throw new Error(
      `No route registered for "${path}". Add it to lib/routes.ts before creating the page.`,
    );
  }
  return route;
};

export const childrenOf = (path: string): Route[] =>
  routes.filter((r) => r.clusterParent === path);

export const indexableRoutes = (): Route[] =>
  routes.filter((r) => r.indexable !== false);

/**
 * The sitemap chunk ids, derived from the route count.
 *
 * The sitemap, the sitemap index and robots.txt all read this one function, so
 * they cannot disagree about how many files exist or what they are called.
 */
export const sitemapChunkIds = (chunkSize: number): number[] => {
  const count = Math.max(1, Math.ceil(indexableRoutes().length / chunkSize));
  return Array.from({ length: count }, (_, i) => i);
};
