import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const API_PORT = 8090;

export default defineConfig({
  testDir: "../tests/qa",
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
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
