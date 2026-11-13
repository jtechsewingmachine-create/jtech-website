/**
 * Single source of truth for site-wide facts.
 *
 * Everything that must stay consistent across the site, the schema markup and
 * third-party profiles lives here and nowhere else. Entity inconsistency
 * (different founding years, HQs and figures across sources) is what makes AI
 * assistants hedge or get a brand wrong, so these values get written once and
 * reused by the layout, the JSON-LD, robots.txt and the sitemap.
 */
export const site = {
  // --- Required: change these for every new project ---
  name: "Jtech Sewing Machines",
  // shortcut: domain not decided yet; set SITE_URL in each deployment (F-09).
  url: (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""), // no trailing slash
  description:
    "Jtech sewing machines and traditional sewing-machine tables. Explore the range, see what each machine includes, and ask about a machine.",
  locale: "en",

  // --- Organization facts. Keep identical to LinkedIn, Crunchbase, Wikipedia. ---
  organization: {
    legalName: "Jtech Sewing Machines", // awaiting owner confirmation
    foundingDate: "", // ISO. Unknown: left empty so schema omits it rather than inventing one.
    logo: "/logo.png", // relative to url; raster, as Google requires for Organization logos
    // Every profile that represents this entity. Feeds schema.org sameAs.
    sameAs: [
      // "https://www.linkedin.com/company/example",
      // "https://github.com/example",
    ] as string[],
  },

  // --- Social card defaults ---
  ogImage: "/og.png", // 1200x630, relative to url
  twitterHandle: "", // e.g. "@example", or "" to omit

  /**
   * Max URLs per sitemap file. The hard limit is 50,000 and breaching it
   * silently stops the overflow being submitted, so we split well below it.
   */
  sitemapChunkSize: 40_000,
} as const;

export const absoluteUrl = (path: string): string =>
  `${site.url}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Is this deployment allowed to be indexed?
 *
 * Preview and staging deployments are real, reachable URLs serving the same
 * content as production. Left alone they get crawled, and you compete with
 * yourself on your own pages — silently, because nothing warns you.
 *
 * The guard is deliberately opt-out, not opt-in: it returns false only when
 * something explicitly says this is NOT production. A self-hosted production
 * deploy with no environment variables set therefore stays indexable. Getting
 * that backwards would noindex a live site with no error anywhere, which is the
 * one failure mode here that is catastrophic rather than untidy.
 *
 * Vercel sets VERCEL_ENV on its own. On any other host, set SITE_ENV=preview
 * (or staging) on the non-production environment.
 */
export const isIndexableDeployment = (): boolean =>
  [process.env.VERCEL_ENV, process.env.SITE_ENV]
    .filter(Boolean)
    .every((signal) => signal === "production");
