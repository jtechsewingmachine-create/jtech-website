import Link from "next/link";
import type { Metadata } from "next";

/**
 * A real 404.
 *
 * Next serves this file with an actual 404 status, which is the point. The
 * failure to avoid is what we found in production: an unknown URL redirecting
 * to a parent page and returning 200, so every typo becomes a live page. That
 * inflates the crawlable surface and hides genuinely dead URLs from Search
 * Console.
 *
 * Redirect to a parent only when there is a real one-to-one successor. For a
 * page that is gone for good, prefer 410 — see README.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <article>
      <h1>Page not found</h1>
      <p>
        That page does not exist. It may have been moved, or the address may be
        mistyped.
      </p>
      <Link href="/">Back to the home page</Link>
    </article>
  );
}
