import type { NextConfig } from "next";
import { isIndexableDeployment } from "./lib/site.config";

/**
 * Security and caching headers.
 *
 * Referrer-Policy and HSTS are here because they were the two headers missing
 * from the production site we audited — both one-liners, both easy to never
 * get around to.
 */
const securityHeaders = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
    // Add "; preload" and submit to hstspreload.org once you are certain every
    // subdomain is HTTPS-only. Preload is effectively irreversible.
  },
  {
    // shortcut: 'unsafe-inline' is needed for Next's inline styles and the
    // JSON-LD script tags. Tighten to a nonce-based policy when the site
    // handles logins, payments or any untrusted user input.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Canonical URL shape: lowercase, no trailing slash. Next redirects
  // /path/ to /path, and the registry enforces lowercase paths.
  trailingSlash: false,

  // Fail the production build on type or lint errors rather than shipping them.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  // Smaller payloads; the audited site was spending its whole budget on JS.
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  images: {
    // WebP only: cold AVIF encodes of the large hero hung /_next/image under
    // load in F-08 QA (D-037). WebP is near the same size and encodes fast.
    formats: ["image/webp"],
    // Add any external image hosts here; next/image refuses unlisted ones.
    remotePatterns: [],
  },

  async headers() {
    const rules = [{ source: "/:path*", headers: securityHeaders }];

    // Preview and staging deployments: belt and braces with app/robots.ts.
    // robots.txt stops a crawl starting; this stops anything already found from
    // being indexed, and covers responses robots.txt does not govern.
    if (!isIndexableDeployment()) {
      rules.push({
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      });
    }

    return rules;
  },
};

export default nextConfig;
