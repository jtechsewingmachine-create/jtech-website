import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site.config";
import { siteJsonLd } from "@/lib/seo";
import "./globals.css";

/**
 * No webfont by default, deliberately.
 *
 * `next/font/google` fetches the font at build time, so the build fails outright
 * on any network that blocks fonts.googleapis.com — which includes plenty of CI
 * runners and locked-down environments. A template reused for years should not
 * carry that failure mode, and the typeface is a per-project design decision
 * anyway.
 *
 * The system stack in globals.css costs no request, renders with zero layout
 * shift and no flash of invisible text. To add a webfont for a specific project:
 * import it from `next/font/google` or `next/font/local` with
 * `display: "swap"` and `variable: "--font-sans"`, then put the variable class
 * on <html>. globals.css already prefers --font-sans when it is defined.
 */

/**
 * Site-wide metadata defaults. Per-page values come from lib/routes.ts via
 * seoFor(), which overrides these. metadataBase makes every relative URL in
 * metadata resolve to an absolute one, which canonicals and OG tags require.
 */
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s` },
  description: site.description,
  applicationName: site.name,
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={site.locale}>
      <body>
        {/* Organization + WebSite, once per site. Page-level schema goes in the page. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }}
        />

        <header className="site-header">
          {/* Real anchors, so crawlers can follow navigation. Never div onClick. */}
          <nav aria-label="Main">
            <Link href="/">{site.name}</Link>
          </nav>
        </header>

        {/* One <main> per page. The render check asserts it has real content. */}
        <main>{children}</main>

        <footer className="site-footer">
          <p>
            © {new Date().getFullYear()} {site.organization.legalName}
          </p>
        </footer>
      </body>
    </html>
  );
}
