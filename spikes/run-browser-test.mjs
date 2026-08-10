#!/usr/bin/env node
// Orchestrates one browser interop test: Node seeder (werift) + real browser
// leecher (native WebRTC), signalling over Nostr relays. macOS (open -a).
// Local:  node spikes/run-browser-test.mjs --browser "Google Chrome" [--size 2097152]
// Remote: node spikes/run-browser-test.mjs --remote <ssh-host> [--browser Safari]
//   (opens the page on the remote machine via ssh; the page loads from and
//    posts its result back to this machine's LAN address)

import { spawn, execFile } from "node:child_process";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
function flag(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}
const BROWSER = flag("browser", "Google Chrome");
const REMOTE = flag("remote", "");
const SIZE = Number(flag("size", 2 * 1024 * 1024));
const PORT = 8790 + Math.floor(Math.random() * 200);
const swarm = `browser-${randomBytes(6).toString("hex")}`;
const resultsDir = join(here, "results");
mkdirSync(resultsDir, { recursive: true });
const before = new Set(readdirSync(resultsDir));

const serve = spawn("node", [join(here, "serve.mjs"), "--port", String(PORT)], { stdio: "inherit" });
const seeder = spawn("node", [join(here, "seeder.mjs"), "--swarm", swarm, "--size", String(SIZE), "--ttl", "90"], { stdio: "inherit" });

const cleanup = () => { serve.kill(); seeder.kill(); };
process.on("exit", cleanup);

await new Promise((r) => setTimeout(r, 2500));
let urlHost = "localhost";
if (REMOTE) {
  const { execSync } = await import("node:child_process");
  urlHost = execSync("ipconfig getifaddr en0 || ipconfig getifaddr en1").toString().trim();
}
const url = `http://${urlHost}:${PORT}/?swarm=${swarm}&size=${SIZE}`;
if (REMOTE) {
  console.error(`opening on ${REMOTE} (default browser${flag("browser", "") ? `: ${BROWSER}` : ""}) at ${url}`);
  const openCmd = flag("browser", "") ? `open -a "${BROWSER}" "${url}"` : `open "${url}"`;
  execFile("ssh", [REMOTE, openCmd]);
} else {
  console.error(`opening ${BROWSER} at ${url}`);
  execFile("open", ["-a", BROWSER, url]);
}

const deadline = Date.now() + 80_000;
let resultFile = null;
while (Date.now() < deadline && !resultFile) {
  await new Promise((r) => setTimeout(r, 1000));
  const fresh = readdirSync(resultsDir).filter((f) => !before.has(f));
  if (fresh.length) resultFile = join(resultsDir, fresh.sort().at(-1));
}

if (!resultFile) {
  console.error("FAIL: no result posted within 80s");
  cleanup();
  process.exit(1);
}
const result = JSON.parse(readFileSync(resultFile, "utf8"));
const label = REMOTE ? `${REMOTE} ${flag("browser", "") || "default browser"}` : BROWSER;
console.log(JSON.stringify({ browser: label, ...result }, null, 2));
cleanup();
process.exit(result.ok ? 0 : 1);
