import type { MetadataRoute } from "next";
import { site, isIndexableDeployment } from "@/lib/site.config";

/**
 * robots.txt.
 *
 * Two deliberate choices:
 *
 * 1. CSS and JS are never blocked. Blocking them stops the renderer building
 *    the page, which is a self-inflicted invisibility.
 *
 * 2. AI crawlers are allowed explicitly rather than left to the wildcard.
 *    Naming them documents the decision, and blocking OAI-SearchBot removes you
 *    from ChatGPT's search entirely — a one-line setting with a binary outcome.
 *    If you ever want to opt out, do it here, on purpose.
 *
 * Note that Google-Extended controls Gemini training only. There is no way to
 * opt out of AI Overviews separately from Google Search.
 */
const AI_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Google-Extended",
  "DuckAssistBot",
  "Applebot-Extended",
  "Bingbot",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  /**
   * Preview and staging deployments keep themselves out of the index entirely.
   * next.config.ts also sends X-Robots-Tag: noindex on those deployments —
   * robots.txt stops the crawl, the header covers anything already discovered.
   * Both read the same signal, so there is one thing to get right.
   */
  if (!isIndexableDeployment()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        /**
         * Keep this list honest and short, and never put anything under
         * /_next/ in it. Blocking the JS or CSS bundles stops the renderer
         * building the page — the page then looks fine to you and empty to a
         * crawler. check-render.mjs fails the build if that reappears here.
         */
        disallow: ["/api/"],
      },
      { userAgent: AI_CRAWLERS, allow: "/" },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
