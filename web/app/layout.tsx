import type { Metadata } from "next";
import Link from "next/link";
import { Red_Hat_Display } from "next/font/google";
import { Logo } from "@/components/Logo";
import { mainNav, footerNav } from "@/lib/nav";
import { site } from "@/lib/site.config";
import { siteJsonLd } from "@/lib/seo";
import "./globals.css";

// Geometric sans matching the UI reference headings (D-010). next/font self-hosts
// it, but fetches from Google Fonts at build time: if CI blocks that, switch to
// next/font/local with the same `variable`.
const sans = Red_Hat_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

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
    <html lang={site.locale} className={sans.variable}>
      <body>
        {/* Organization + WebSite, once per site. Page-level schema goes in the page. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }}
        />
        <a className="skip-link" href="#main">
          Skip to content
        </a>

        <header className="site-header">
          <div className="container site-header__inner">
            <Link href="/" className="site-header__logo" aria-label="Jtech Sewing Machines home">
              <Logo />
            </Link>
            {/* Real anchors, so crawlers can follow navigation. Never div onClick. */}
            <nav aria-label="Main" className="site-nav">
              <ul>
                {mainNav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        {/* One <main> per page. The render check asserts it has real content. */}
        <main id="main" tabIndex={-1}>
          {children}
        </main>

        <footer className="site-footer">
          <div className="container site-footer__inner">
            <Link href="/" className="site-footer__logo" aria-label="Jtech Sewing Machines home">
              <Logo />
            </Link>
            <nav aria-label="Footer" className="site-footer__nav">
              {footerNav.map((group) => (
                <div key={group.heading}>
                  <h2>{group.heading}</h2>
                  <ul>
                    {group.links.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href}>{l.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
          <div className="container site-footer__legal">
            <p>© {new Date().getFullYear()} {site.organization.legalName}</p>
            <p>Private prototype: sample products and details.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
