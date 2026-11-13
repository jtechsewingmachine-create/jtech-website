/**
 * Same-origin proxy from the browser to the Go enquiry API (D-034).
 *
 * The browser only ever talks to this site (no CORS; CSP connect-src stays 'self'). This handler adds
 * the shared PROXY_SECRET and the visitor's IP; the Go API trusts the IP only with a valid secret and
 * rejects direct calls in production, so X-Forwarded-For can't be used to dodge the rate limit.
 */
export const dynamic = "force-dynamic";
// Room for a cold start: on Render's free plan the API sleeps when idle and takes ~50s to wake (D-038).
export const maxDuration = 60;
const API_TIMEOUT_MS = 55_000;

const MAX_BODY = 8 * 1024;

const json = (status: number, body: unknown) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Visitor IP for rate limiting. Only Vercel guarantees x-forwarded-for (it overwrites any client value),
 * so it is read only there. Anywhere else no IP is sent and the API falls back to one shared bucket:
 * strict, but never spoofable. shortcut: on another host, read that platform's guaranteed header here.
 */
function visitorIp(req: Request): string {
  if (!process.env.VERCEL) return "";
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
}

export async function POST(req: Request) {
  const api = process.env.API_ORIGIN;
  if (!api) {
    console.error("API_ORIGIN is not set; enquiries cannot be delivered");
    return json(503, { error: "enquiry service unavailable" });
  }
  const body = await req.text();
  if (new TextEncoder().encode(body).length > MAX_BODY) return json(413, { error: "request too large" });

  const headers: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") ?? "",
    "X-Client-IP": visitorIp(req),
  };
  if (process.env.PROXY_SECRET) headers["X-Proxy-Secret"] = process.env.PROXY_SECRET;

  try {
    const res = await fetch(`${api.replace(/\/$/, "")}/api/enquiries`, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      cache: "no-store",
    });
    const out = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
    const retry = res.headers.get("retry-after");
    if (retry) out.set("Retry-After", retry);
    return new Response(await res.text(), { status: res.status, headers: out });
  } catch {
    return json(503, { error: "enquiry service unavailable" });
  }
}

/** Warm-up: the enquiry page pings this on load so a sleeping API is awake by the time the visitor submits. */
export async function GET() {
  const api = process.env.API_ORIGIN;
  if (api) {
    await fetch(`${api.replace(/\/$/, "")}/healthz`, { cache: "no-store", signal: AbortSignal.timeout(API_TIMEOUT_MS) }).catch(() => {});
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
