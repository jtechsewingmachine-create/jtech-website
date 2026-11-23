/**
 * Product data — the single source for a product's page, its Product schema and
 * the merchant feed at /feeds/products.xml.
 *
 * Why one source: AI shopping surfaces (Google AI Mode, AI Overviews and Gemini
 * via Merchant Center today; ChatGPT later, which accepts the same Google-format
 * feed) rank on price, availability and identifiers. A price that says one
 * thing on the page, another in the schema and a third in the feed is the
 * mismatch Merchant Center disapproves products for. The render check fails
 * the build on any such disagreement.
 *
 * Every product's `path` must be a registered, indexable route in
 * lib/routes.ts, and its page must render productJsonLd(product) and show the
 * price as visible text. Empty by default: a site with no products ships an
 * empty, valid feed.
 */
export type Product = {
  /** Its page, registered in lib/routes.ts. */
  path: string;
  /** Your SKU. Stable forever: Merchant Center tracks history by it. */
  id: string;
  name: string;
  description: string;
  brand: string;
  /** The manufacturer's barcode. If you resell a branded product, use theirs. */
  gtin?: string;
  /** Manufacturer part number, when there is no GTIN. */
  mpn?: string;
  /** In currency units, e.g. 14999 for ₹14,999. */
  price: number;
  currency: string;
  availability: "in_stock" | "out_of_stock" | "preorder" | "backorder";
  condition?: "new" | "refurbished" | "used";
  image: { src: string; alt: string; width: number; height: number };
  /** ONLY from real reviews that are shown on the page. Never estimated. */
  rating?: { value: number; count: number };
  shipping?: { country: string; price: number };
  returns?: { country: string; days: number };
};

export const products: Product[] = [];

export const productFor = (path: string): Product | undefined =>
  products.find((p) => p.path === path);

/** "₹14,999" — the visible price; the render check looks for its digits. */
export const formatPrice = (p: Product) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: p.currency, maximumFractionDigits: 0 }).format(p.price);
