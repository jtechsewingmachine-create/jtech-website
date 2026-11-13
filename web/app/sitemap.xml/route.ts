import { site, absoluteUrl } from "@/lib/site.config";
import { sitemapChunkIds } from "@/lib/routes";

/**
 * The sitemap index at /sitemap.xml.
 *
 * Next's `generateSitemaps` serves the chunks at /sitemap/0.xml, /sitemap/1.xml
 * and so on, but it does not create an index, so /sitemap.xml would 404 — while
 * robots.txt points at it and Search Console expects it. That is a dead link
 * handed to Google, and it is silent: nothing warns you.
 *
 * This index fixes that and keeps the conventional single URL to submit, no
 * matter how many chunks the route count grows into. The chunk list comes from
 * sitemapChunkIds(), the same function the sitemap and robots.txt use.
 */
export const dynamic = "force-static";

export function GET(): Response {
  const lastmod = new Date().toISOString();

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapChunkIds(site.sitemapChunkSize)
  .map(
    (id) =>
      `  <sitemap>\n    <loc>${absoluteUrl(`/sitemap/${id}.xml`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
