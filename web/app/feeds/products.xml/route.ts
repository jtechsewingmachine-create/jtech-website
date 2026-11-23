import { site, absoluteUrl } from "@/lib/site.config";
import { products } from "@/lib/merchant-products";

/**
 * The merchant feed, in Google's product data format (RSS 2.0, g: namespace).
 * Submit https://yourdomain/feeds/products.xml in Merchant Center as a
 * scheduled fetch. OpenAI's commerce spec accepts the same format, so this one
 * file also serves ChatGPT shopping if and when it reaches your market.
 *
 * Generated from lib/merchant-products.ts at build time — never edit values here.
 */
export const dynamic = "force-static";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function GET() {
  const items = products
    .map((p) => {
      const tag = (name: string, value: string | undefined) => (value ? `<g:${name}>${esc(value)}</g:${name}>` : "");
      return `<item>
${tag("id", p.id)}
<title>${esc(p.name)}</title>
<description>${esc(p.description)}</description>
<link>${esc(absoluteUrl(p.path))}</link>
${tag("image_link", absoluteUrl(p.image.src))}
${tag("availability", p.availability)}
${tag("price", `${p.price.toFixed(2)} ${p.currency}`)}
${tag("brand", p.brand)}
${tag("gtin", p.gtin)}
${tag("mpn", p.mpn)}
${p.gtin || p.mpn ? "" : tag("identifier_exists", "no")}
${tag("condition", p.condition ?? "new")}
${p.shipping ? `<g:shipping><g:country>${esc(p.shipping.country)}</g:country><g:price>${p.shipping.price.toFixed(2)} ${esc(p.currency)}</g:price></g:shipping>` : ""}
</item>`.replace(/\n{2,}/g, "\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${esc(site.name)}</title>
<link>${esc(site.url)}</link>
<description>${esc(site.description)}</description>
${items}
</channel>
</rss>
`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
