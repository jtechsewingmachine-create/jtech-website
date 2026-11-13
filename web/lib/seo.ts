import type { Metadata } from "next";
import { site, absoluteUrl } from "./site.config";
import { routeFor } from "./routes";

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
      route.indexable === false
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
      name: r.path === "/" ? site.name : r.title.split("—")[0].trim(),
      item: absoluteUrl(r.path),
    })),
  };
}
