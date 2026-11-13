import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const API_PORT = 8090;

export default defineConfig({
  testDir: "../tests/qa",
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    // Safari engine: real H.264 playback and mask-image/-webkit- checks.
    // Tab-key tests are excluded: Safari's default (macOS "Keyboard navigation" off) only tabs to form
    // controls, so links are skipped by design; Chromium covers keyboard order.
    // "browser back from confirmation" crashes the WebKit engine itself on reload (Page crashed);
    // Chromium covers that flow. One retry: Playwright's WebKit build occasionally crashes on back/forward + reload (engine
    // crash, not an app error); retried passes are still reported as "flaky".
    { name: "webkit", use: { ...devices["Desktop Safari"] }, grepInvert: /keyboard: |focus indicator: |browser back from confirmation/ },
  ],
  // Tests run against the production build, which is what crawlers and users get,
  // with the real Go API behind the /api/enquiries route handler (in-memory store: no Supabase env).
  webServer: [
    {
      command: `go run .`,
      cwd: "../api",
      url: `http://127.0.0.1:${API_PORT}/healthz`,
      // The whole suite submits from 127.0.0.1, so lift the per-IP limit (the limiter has its own Go tests).
      env: { PORT: String(API_PORT), SUPABASE_URL: "", SUPABASE_SECRET_KEY: "", RATE_LIMIT: "100000", PROXY_SECRET: "test-proxy-secret" },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npm run build && npx next start -p ${PORT}`,
      url: `http://127.0.0.1:${PORT}`,
      env: { API_ORIGIN: `http://127.0.0.1:${API_PORT}`, PROXY_SECRET: "test-proxy-secret" },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
