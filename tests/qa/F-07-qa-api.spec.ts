import { test, expect } from "@playwright/test";

const PROXY = "/api/enquiries";
const DIRECT = "http://127.0.0.1:8090/api/enquiries";
const ok = { name: "Asha", phone: "98765 43210", intent: "general" };
const J = { "Content-Type": "application/json" };

for (const [label, url] of [["proxy", PROXY], ["direct", DIRECT]] as const) {
  test.describe(`API attack via ${label}`, () => {
    test.use({ extraHTTPHeaders: label === "direct" ? { "X-Proxy-Secret": "test-proxy-secret" } : {} });
    test("valid -> 201 ok, no-store", async ({ request }) => {
      const r = await request.post(url, { data: ok });
      expect(r.status()).toBe(201);
      expect(await r.json()).toEqual({ ok: true });
      expect(r.headers()["cache-control"]).toContain("no-store");
    });
    for (const m of ["get", "put", "delete", "patch"] as const) {
      test(`${m.toUpperCase()} is not accepted`, async ({ request }) => {
        const r = await request[m](url, { data: ok });
        // GET on the proxy is the warm-up ping (D-038): 204, empty, stores nothing.
        if (m === "get" && url === PROXY) return expect([r.status(), await r.text()]).toEqual([204, ""]);
        expect([404, 405]).toContain(r.status());
      });
    }
    test("wrong content types -> 415", async ({ request }) => {
      for (const ct of ["text/plain", "application/x-www-form-urlencoded", "multipart/form-data; boundary=x", "application/jsonx"]) {
        const r = await request.post(url, { headers: { "Content-Type": ct }, data: JSON.stringify(ok) });
        expect(r.status(), ct).toBe(415);
      }
    });
    test("json with charset param accepted", async ({ request }) => {
      const r = await request.post(url, { headers: { "Content-Type": "application/json; charset=utf-8" }, data: JSON.stringify(ok) });
      expect(r.status()).toBe(201);
    });
    test("malformed / empty / non-object JSON -> 400, no internals", async ({ request }) => {
      for (const body of ["", "{", "{'a':1}", "[]", "null", "123", '"str"', "{}{", '{"name":"a"} garbage']) {
        const r = await request.post(url, { headers: J, data: body });
        const t = await r.text();
        expect(r.status(), body).toBe(400);
        expect(t).not.toMatch(/goroutine|\.go:|panic/);
      }
    });
    test("type confusion -> 400", async ({ request }) => {
      for (const d of [{ ...ok, name: 123 }, { ...ok, phone: 9876543210 }, { ...ok, intent: ["general"] }, { ...ok, message: { a: 1 } }, { ...ok, model: false }]) {
        const r = await request.post(url, { headers: J, data: JSON.stringify(d) });
        expect(r.status(), JSON.stringify(d)).toBe(400);
      }
    });
    test("nulls behave like missing", async ({ request }) => {
      const r = await request.post(url, { headers: J, data: JSON.stringify({ ...ok, message: null, model: null, website: null }) });
      expect(r.status()).toBe(201);
    });
    test("unknown fields are ignored and never stored/echoed", async ({ request }) => {
      const r = await request.post(url, { data: { ...ok, id: 5, admin: true, __proto__: { x: 1 } } });
      expect(r.status()).toBe(201);
      expect(await r.json()).toEqual({ ok: true });
    });
    test("oversize body -> 413", async ({ request }) => {
      const r = await request.post(url, { headers: J, data: JSON.stringify({ ...ok, message: "x".repeat(20000) }) });
      expect(r.status()).toBe(413);
    });
    test("message 1000 ok, 1001 rejected (runes, not bytes)", async ({ request }) => {
      expect((await request.post(url, { data: { ...ok, message: "😀".repeat(1000) } })).status()).toBe(201);
      expect((await request.post(url, { data: { ...ok, message: "😀".repeat(1001) } })).status()).toBe(400);
    });
    test("name boundaries 1/2/80/81 runes", async ({ request }) => {
      const s = async (n: string) => (await request.post(url, { data: { ...ok, name: n } })).status();
      expect(await s("a")).toBe(400);
      expect(await s("ab")).toBe(201);
      expect(await s("é".repeat(80))).toBe(201);
      expect(await s("é".repeat(81))).toBe(400);
      expect(await s("  a  ")).toBe(400);
      expect(await s("   ")).toBe(400);
    });
    test("control chars, lone surrogates, bidi, zero-width", async ({ request }) => {
      const s = async (raw: string) => (await request.post(url, { headers: J, data: raw })).status();
      expect(await s(`{"name":"As\\u0000ha","phone":"9876543210","intent":"general"}`)).toBe(400);
      expect(await s(`{"name":"Asha","phone":"9876543210","intent":"general","message":"a\\u0007b"}`)).toBe(400);
      expect(await s(`{"name":"Asha","phone":"9876543210","intent":"general","message":"a\\nb\\tc"}`)).toBe(201);
      expect(await s(`{"name":"Asha","phone":"9876543210","intent":"general","message":"\\ud800"}`)).toBeLessThan(500); // lone surrogate -> U+FFFD
      expect(await s(`{"name":"As\\u200bha","phone":"9876543210","intent":"general"}`)).toBeLessThan(500);
    });
    test("phone variants", async ({ request }) => {
      const s = async (p: string) => (await request.post(url, { data: { ...ok, phone: p } })).status();
      for (const p of ["9876543210", "+91 98765 43210", "098765 43210", "(987) 654-3210", "98765.43210"]) expect(await s(p), p).toBe(201);
      for (const p of ["1234567890", "98765432", "98765432101", "+1 9876543210", "abcdefghij", "", "  ", "９８７６５４３２１０"]) expect(await s(p), p).toBe(400);
    });
    test("intent / model whitelist, injection strings", async ({ request }) => {
      const s = async (o: object) => (await request.post(url, { data: { ...ok, ...o } })).status();
      expect(await s({ intent: "General" })).toBe(400);
      expect(await s({ intent: "' OR 1=1 --" })).toBe(400);
      expect(await s({ model: "demo-model-2" })).toBe(201);
      expect(await s({ model: "nope" })).toBe(400);
      expect(await s({ model: "../etc/passwd" })).toBe(400);
      expect(await s({ name: `<script>alert(1)</script>'; DROP TABLE enquiries;--`, message: "' OR 1=1 --" })).toBe(201);
    });
    test("honeypot -> fake 201, even when otherwise invalid; whitespace-only honeypot is not a trap", async ({ request }) => {
      const a = await request.post(url, { data: { ...ok, website: "http://spam" } });
      expect([a.status(), await a.json()]).toEqual([201, { ok: true }]);
      expect((await request.post(url, { data: { website: "x" } })).status()).toBe(201);
      expect((await request.post(url, { data: { ...ok, website: "   " } })).status()).toBe(201);
    });
    test("error responses: field errors are plain strings, JSON content-type", async ({ request }) => {
      const r = await request.post(url, { data: { name: "<b>", phone: "x", intent: "q" } });
      expect(r.status()).toBe(400);
      expect(r.headers()["content-type"]).toContain("application/json");
    });
  });
}

test("direct API without / with wrong secret -> 403, never stored", async ({ request }) => {
  for (const h of [{}, { "X-Proxy-Secret": "wrong" }, { "X-Client-IP": "1.2.3.4" }, { "X-Forwarded-For": "1.2.3.4" }]) {
    const r = await request.post(DIRECT, { headers: { ...J, ...h }, data: JSON.stringify(ok) });
    expect(r.status(), JSON.stringify(h)).toBe(403);
    expect(await r.json()).toEqual({ error: "forbidden" });
  }
});

test("health + unknown route", async ({ request }) => {
  expect((await request.get("http://127.0.0.1:8090/healthz")).status()).toBe(200);
  expect((await request.get("http://127.0.0.1:8090/nope")).status()).toBe(404);
  expect((await request.post("http://127.0.0.1:8090/api/enquiries/", { headers: { "X-Proxy-Secret": "test-proxy-secret" } })).status()).toBe(404);
});
