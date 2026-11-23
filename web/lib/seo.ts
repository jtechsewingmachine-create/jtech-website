import type { Metadata } from "next";
import { site, absoluteUrl, isIndexableDeployment } from "./site.config";
import { routeFor } from "./routes";
import type { Product } from "./merchant-products";

const SCHEMA_AVAILABILITY = {
  in_stock: "https://schema.org/InStock",
  out_of_stock: "https://schema.org/OutOfStock",
  preorder: "https://schema.org/PreOrder",
  backorder: "https://schema.org/BackOrder",
} as const;

/**
 * Product + Offer schema, built from the same record as the page and the feed.
 * AggregateRating appears only when the product carries real review data, and
 * the page must show that rating — schema only for visible content (rule 8).
 */
export function productJsonLd(p: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    sku: p.id,
    ...(p.gtin ? { gtin: p.gtin } : {}),
    ...(p.mpn ? { mpn: p.mpn } : {}),
    brand: { "@type": "Brand", name: p.brand },
    image: absoluteUrl(p.image.src),
    ...(p.rating
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating.value, reviewCount: p.rating.count } }
      : {}),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(p.path),
      price: p.price.toFixed(2),
      priceCurrency: p.currency,
      availability: SCHEMA_AVAILABILITY[p.availability],
      itemCondition: `https://schema.org/${p.condition === "used" ? "Used" : p.condition === "refurbished" ? "Refurbished" : "New"}Condition`,
      ...(p.shipping
        ? {
            shippingDetails: {
              "@type": "OfferShippingDetails",
              shippingRate: { "@type": "MonetaryAmount", value: p.shipping.price.toFixed(2), currency: p.currency },
              shippingDestination: { "@type": "DefinedRegion", addressCountry: p.shipping.country },
            },
          }
        : {}),
      ...(p.returns
        ? {
            hasMerchantReturnPolicy: {
              "@type": "MerchantReturnPolicy",
              applicableCountry: p.returns.country,
              returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
              merchantReturnDays: p.returns.days,
            },
          }
        : {}),
    },
  };
}

/**
 * Builds a page's Metadata from its registry row.
 *
 * Every page calls this. It guarantees a unique title, a unique description and
 * a self-referencing absolute canonical, plus complete Open Graph and Twitter
 * cards — the set of things that are cheap at build time and tedious to
 * retrofit. A page whose path is not registered throws, so the failure is a
 * build error rather than a page that quietly ships without a title.
 */
export function seoFor(path: string): Metadata {
  const route = routeFor(path);
  const canonical = absoluteUrl(route.path);

  return {
    title: route.title,
    description: route.description,
    alternates: { canonical },
    robots:
      route.indexable === false || !isIndexableDeployment() // previews: meta agrees with robots.txt and X-Robots-Tag
        ? { index: false, follow: true }
        : {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
          },
    openGraph: {
      type: "website",
      siteName: site.name,
      title: route.title,
      description: route.description,
      url: canonical,
      locale: site.locale,
      images: [{ url: absoluteUrl(site.ogImage), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: route.title,
      description: route.description,
      images: [absoluteUrl(site.ogImage)],
      ...(site.twitterHandle ? { site: site.twitterHandle } : {}),
    },
  };
}

/** Organization + WebSite JSON-LD. Rendered once, in the root layout. */
export function siteJsonLd() {
  const org = {
    "@type": "Organization",
    "@id": `${site.url}/#organization`,
    name: site.name,
    legalName: site.organization.legalName,
    url: site.url,
    description: site.description,
    ...(site.organization.foundingDate
      ? { foundingDate: site.organization.foundingDate }
      : {}),
    logo: absoluteUrl(site.organization.logo),
    ...(site.organization.sameAs.length
      ? { sameAs: site.organization.sameAs }
      : {}),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      org,
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        name: site.name,
        url: site.url,
        description: site.description,
        publisher: { "@id": org["@id"] },
        inLanguage: site.locale,
      },
    ],
  };
}

/**
 * BreadcrumbList for a page, derived from its cluster parent.
 * Returns null for the home page, which needs no breadcrumb.
 */
export function breadcrumbJsonLd(path: string) {
  const route = routeFor(path);
  if (route.path === "/") return null;

  const trail = [routeFor("/")];
  if (route.clusterParent) trail.push(routeFor(route.clusterParent));
  trail.push(route);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: r.path === "/" ? site.name : (r.breadcrumb ?? r.title.split(/[—|]/)[0].trim()),
      item: absoluteUrl(r.path),
    })),
  };
}
