import type { MetadataRoute } from "next";
import { site, absoluteUrl } from "@/lib/site.config";
import { indexableRoutes, sitemapChunkIds } from "@/lib/routes";

/**
 * Sitemap, split automatically.
 *
 * A sitemap file holds at most 50,000 URLs. Breaching it is silent — the
 * overflow simply stops being submitted — and we found a large production site
 * sitting 443 URLs from that cap, one product launch away from losing pages
 * with no error anywhere. Chunking at site.sitemapChunkSize (40,000) means no
 * amount of growth can ever reach the limit.
 *
 * Next generates /sitemap/0.xml, /sitemap/1.xml ... and an index referencing
 * them. With a single chunk you get /sitemap.xml directly.
 */
export async function generateSitemaps() {
  return sitemapChunkIds(site.sitemapChunkSize).map((id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const all = indexableRoutes();
  const start = id * site.sitemapChunkSize;
  const lastModified = new Date();

  return all.slice(start, start + site.sitemapChunkSize).map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.pageType === "pillar" ? "weekly" : "monthly",
    priority: route.priority ?? 0.5,
  }));
}
