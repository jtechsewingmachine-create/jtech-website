#!/usr/bin/env node
/**
 * The live-site check: what `npm run verify` proves about a build, re-proved
 * against the deployed domain, plus the one thing only a live site has — its
 * certificate. Run on a schedule (.github/workflows/live-check.yml); a non-zero
 * exit is the alert.
 *
 * It catches the silent failures: site down, an unknown URL returning 200, a
 * noindex or Disallow: / that reached production, a canonical pointing at the
 * wrong host, content missing from the server HTML, and a certificate about to
 * expire. It does not catch a hack or a manual action — Search Console emails
 * those — and it is not a ranking monitor; that is the weekly report.
 *
 * Usage: node scripts/check-live.mjs https://yourdomain.com
 */
import { connect } from "node:tls";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const WARN_DAYS = 30;
const FAIL_DAYS = 14;

const base = (process.argv[2] || process.env.SITE_URL || "").replace(/\/$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("check-live: pass the live URL, e.g. node scripts/check-live.mjs https://yourdomain.com");
  process.exit(2);
}
const { hostname, port, protocol } = new URL(base);
let failed = false;

/** Days until the certificate expires, and whether the chain is trusted. */
function certificate(host, p) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port: p, servername: host, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      resolve({
        days: Math.floor((new Date(cert.valid_to) - Date.now()) / 86_400_000),
        trusted: socket.authorized,
        reason: socket.authorizationError,
      });
    });
    socket.setTimeout(10_000, () => socket.destroy(new Error("TLS connection timed out")));
    socket.on("error", reject);
  });
}

if (protocol === "https:") {
  try {
    const { days, trusted, reason } = await certificate(hostname, Number(port) || 443);
    if (!trusted) {
      console.error(`  FAIL  certificate: not trusted (${reason})`);
      failed = true;
    }
    if (days < FAIL_DAYS) {
      console.error(`  FAIL  certificate: expires in ${days} days`);
      failed = true;
    } else if (days < WARN_DAYS) {
      console.warn(`  warn  certificate: expires in ${days} days`);
    } else {
      console.log(`certificate: ${days} days left`);
    }
  } catch (err) {
    console.error(`  FAIL  certificate: ${err.message}`);
    failed = true;
  }
} else {
  console.warn("  warn  not https — certificate not checked");
}

// Everything else is the render check, held to production rules.
const render = spawnSync(
  process.execPath,
  [join(dirname(fileURLToPath(import.meta.url)), "check-render.mjs"), base],
  { stdio: "inherit", env: { ...process.env, SITE_ENV: "production", VERCEL_ENV: "" } },
);
if (render.status !== 0) failed = true;

console.log(`\ncheck-live: ${failed ? "FAILED" : "passed"}`);
process.exit(failed ? 1 : 0);
