// Run: node --test scripts/search-report.test.mjs
// Proves the report end to end against a fake Google: token signing, the three
// API calls, and each of the five flags firing (and not firing) on fixture data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { pull, buildReport, loadRoutes, T } from "./search-report.mjs";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const account = { client_email: "bot@example.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) };
const routes = [
  { path: "/", targetQuery: "example brand name" },
  { path: "/guides", targetQuery: "example guides" },
  { path: "/guides/getting-started", targetQuery: "how to get started with example" },
  { path: "/account", targetQuery: null, indexable: false },
];
const S = "https://example.com";
const row = (q, page, clicks, impressions, position) => ({ keys: [q, S + page], clicks, impressions, ctr: clicks / impressions, position });

function fakeGoogle() {
  const calls = [];
  const json = (body) => ({ ok: true, json: async () => body, text: async () => JSON.stringify(body) });
  const fetchFn = async (url, init) => {
    calls.push({ url, body: init.body });
    if (url.includes("oauth2")) {
      const jwt = decodeURIComponent(init.body.split("assertion=")[1]);
      const [h, c, sig] = jwt.split(".");
      assert.ok(createVerify("RSA-SHA256").update(`${h}.${c}`).verify(publicKey, sig, "base64url"), "JWT signature verifies");
      assert.equal(JSON.parse(Buffer.from(c, "base64url")).scope, "https://www.googleapis.com/auth/webmasters.readonly");
      return json({ access_token: "tok" });
    }
    assert.equal(init.headers.authorization, "Bearer tok");
    if (url.includes("searchAnalytics")) {
      const dims = JSON.parse(init.body).dimensions;
      return json({ rows: dims.length === 2
        ? [
            row("example guides", "/guides", 5, 400, 12.4),             // 8–20 → check 2
            row("example brand name", "/", 1, 300, 3.0),                // CTR 0.3% → check 3
            row("example how to", "/guides/getting-started", 2, 40, 9), // unplanned → check 4; also 8–20
            row("example brand name", "/", 0, 5, 30),                   // small; fine
          ]
        : [{ keys: [S + "/guides"], clicks: 9, impressions: 300, position: 6.0 }] }); // was 6, now 12.4 → dropped
    }
    if (url.includes("urlInspection")) {
      const path = new URL(JSON.parse(init.body).inspectionUrl).pathname;
      return json({ inspectionResult: { indexStatusResult: path === "/guides/getting-started"
        ? { verdict: "NEUTRAL", coverageState: "Crawled - currently not indexed" }
        : { verdict: "PASS", coverageState: "Submitted and indexed" } } });
    }
    throw new Error("unexpected call " + url);
  };
  return { fetchFn, calls };
}

test("pulls with a valid signed token, skips non-indexable routes, and flags all five checks", async () => {
  const g = fakeGoogle();
  const data = await pull({ property: "sc-domain:example.com", account, siteUrl: S, routes, fetchFn: g.fetchFn, now: Date.parse("2026-11-16T00:00:00Z") });
  assert.equal(g.calls.filter((c) => c.url.includes("urlInspection")).length, 3, "the private /account page is not inspected");
  assert.deepEqual(data.period, { startDate: "2026-10-17", endDate: "2026-11-13" }, "28 days inclusive, ending three days back");
  const md = buildReport({ routes, ...data, date: "2026-11-16" });
  const section = (n) => md.split("\n## ")[n];
  assert.match(section(1), /\/guides\/getting-started \| NEUTRAL/);
  assert.doesNotMatch(section(1), /\| \/ \|/);
  assert.match(section(2), /example guides \| 12\.4/);
  assert.match(section(3), /example brand name \| 305 \| 0\.3%/);
  assert.match(section(4), /example how to/);
  assert.doesNotMatch(section(4), /example guides|example brand name/, "planned queries are not flagged as unplanned");
  assert.match(section(5), /\/guides \| 6\.0 \| 12\.4/);
});

test("a quiet week flags nothing", () => {
  const md = buildReport({ routes, current: [row("example guides", "/guides", 50, 400, 2)], previous: [], period: { startDate: "a", endDate: "b" },
    inspections: [{ path: "/", verdict: "PASS", coverage: "Submitted and indexed" }], date: "x" });
  assert.match(md, /\*\*0 item\(s\) flagged\.\*\*/);
  assert.equal(md.split("_Nothing flagged._").length - 1, 5);
});

test("reads the real registry", () => {
  const r = loadRoutes();
  assert.ok(r.length >= 3 && r.every((x) => x.path));
  assert.ok(T.ctrFloor > 0);
});
