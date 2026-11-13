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
  /** Short visible name for breadcrumbs (defaults to the title before "|" or "—"). */
  breadcrumb?: string;
  /** Sitemap priority hint. Optional. */
  priority?: number;
  /** Set false for a page that should exist but not be indexed. */
  indexable?: boolean;
}

// Target queries are UNVERIFIED drafts from the blueprint; replace after search research.
export const routes: Route[] = [
  {
    path: "/",
    targetQuery: "jtech sewing machine",
    intent: "navigational",
    pageType: "pillar",
    clusterParent: null,
    title: "Jtech Sewing Machines | Find Your Next Sewing Machine",
    description:
      "Explore Jtech sewing machines, understand what's included and what to consider before choosing, then ask about a machine. Private prototype with sample content.",
    priority: 1,
  },
  {
    path: "/machines",
    breadcrumb: "Machines",
    targetQuery: "jtech sewing machine models",
    intent: "comparison",
    pageType: "pillar",
    clusterParent: null,
    title: "Jtech Sewing Machine Models | Compare What's Included",
    description:
      "Browse Jtech sewing machine models and check each one's type, package contents, price status and support details, including what is still awaiting confirmation.",
    priority: 0.9,
  },
  {
    path: "/machines/stylish-stitcher",
    breadcrumb: "Stylish Stitcher",
    targetQuery: "jtech stylish stitcher",
    intent: "commercial",
    pageType: "child",
    clusterParent: "/machines",
    title: "Jtech Stylish Stitcher Sewing Machine | Details and Photos",
    description:
      "Photos and details of the Jtech Stylish Stitcher sewing machine, with what is confirmed and what is still awaiting confirmation, and how to ask about it.",
    priority: 0.8,
  },
  {
    path: "/machines/demo-model-2",
    breadcrumb: "Demo model 2",
    targetQuery: "jtech demo model 2",
    intent: "commercial",
    pageType: "child",
    clusterParent: "/machines",
    title: "Jtech Traditional Sewing Machine With Table | Demo Model 2",
    description:
      "Demo model 2: a sample Jtech traditional sewing machine listing comparing a head-only option with a table and stand package, with sample prices marked as such.",
    priority: 0.7,
  },
  {
    path: "/machines/demo-model-3",
    breadcrumb: "Demo model 3",
    targetQuery: "jtech demo model 3",
    intent: "commercial",
    pageType: "child",
    clusterParent: "/machines",
    title: "Jtech Traditional Sewing Machine | Demo Model 3 Listing",
    description:
      "Demo model 3: a sample Jtech traditional sewing machine with a table, shown as currently unavailable, with routes to ask about availability or other machines.",
    priority: 0.6,
  },

  {
    path: "/enquiry",
    targetQuery: "contact jtech",
    intent: "navigational",
    pageType: "utility",
    clusterParent: null,
    title: "Contact Jtech Sewing Machines | Ask About a Machine",
    description:
      "Ask Jtech about a sewing machine, support or a trade enquiry. A short form with your name, number and question; asking is not an order and no payment is taken.",
    indexable: false,
  },
  {
    path: "/enquiry/confirmation",
    targetQuery: "your jtech enquiry",
    intent: "navigational",
    pageType: "utility",
    clusterParent: "/enquiry",
    title: "Enquiry Confirmation | Jtech Sewing Machines",
    description:
      "Confirmation of your Jtech enquiry. In this prototype nothing is sent and no order is placed; continue browsing machines or return to the enquiry form.",
    indexable: false,
  },

  {
    path: "/support",
    breadcrumb: "Support",
    targetQuery: "jtech sewing machine support",
    intent: "informational",
    pageType: "utility",
    clusterParent: null,
    title: "Jtech Sewing Machine Support | Repairs, Warranty, Contact",
    description:
      "How to get help with a Jtech sewing machine: buying, demonstrations, repairs, warranty and trade enquiries, with what is confirmed and what is still pending.",
    priority: 0.6,
  },
  {
    // Fictional prototype entries only: keep out of the index until verified locations exist.
    path: "/locations",
    breadcrumb: "Locations",
    targetQuery: "jtech sewing machine locations",
    intent: "local",
    pageType: "utility",
    clusterParent: null,
    title: "Jtech Sewing Machine Locations | Sales and Service Points",
    description:
      "Where to see a Jtech sewing machine or get it serviced. This prototype shows clearly fictional example locations; real locations are awaiting confirmation.",
    indexable: false,
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
