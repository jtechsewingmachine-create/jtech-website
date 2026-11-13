#!/usr/bin/env node
/**
 * Orchestrates the render check: pick a free port, start the production server,
 * wait for it, run the check against it, tear it down, propagate the exit code.
 *
 * This exists because the obvious shell version — `next start & ... && check` —
 * has a false-pass bug that bit during this template's own build. If the port
 * was already in use, `next start` died with EADDRINUSE, the readiness loop
 * happily connected to the *stale* server already listening there, the check
 * passed against the old build, and the whole thing reported green.
 *
 * A gate that can report success without having tested the current code is
 * worse than no gate. So: an ephemeral port nothing else can hold, an explicit
 * failure if the server does not come up, and a non-zero exit on any step.
 *
 * Usage: node scripts/verify.mjs   (expects `next build` to have run)
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";

const READY_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 500;

/** Ask the OS for a port nothing is using, then release it immediately. */
async function freePort() {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

async function waitForServer(url, child) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `server exited with code ${child.exitCode} before becoming ready — see its output above`,
      );
    }
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`server did not respond at ${url} within ${READY_TIMEOUT_MS / 1000}s`);
}

const run = (cmd, args) => spawn(cmd, args, { stdio: "inherit", shell: false });

const port = await freePort();
const base = `http://127.0.0.1:${port}`;

console.log(`verify: starting production server on ${base}\n`);

/**
 * The Next CLI is run directly rather than through `npx` or a shell. Both of
 * those wrap the real server in a parent process, so terminating what we
 * spawned leaves the actual server orphaned — still listening, still holding
 * the inherited stdout, which hangs the whole run. One process we can signal.
 */
const server = run(process.execPath, [
  "node_modules/next/dist/bin/next",
  "start",
  "--port",
  String(port),
]);

const shutdown = () => {
  if (server.exitCode !== null) return;
  server.kill("SIGTERM");
  // Do not let a server that ignores SIGTERM hold the run open.
  setTimeout(() => server.kill("SIGKILL"), 3000).unref();
};
process.on("exit", shutdown);
process.on("SIGINT", () => {
  shutdown();
  process.exit(130);
});

try {
  await waitForServer(base, server);
} catch (err) {
  console.error(`\nverify: ${err.message}`);
  shutdown();
  process.exit(1);
}

const check = run("node", ["scripts/check-render.mjs", base]);
const [code] = await once(check, "exit");

shutdown();
process.exit(code ?? 1);
