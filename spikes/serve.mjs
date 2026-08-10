#!/usr/bin/env node
// Serves the browser spike page and collects results POSTed by it.
// Listens on 0.0.0.0 so a phone on the LAN can load it too.
// Run: node spikes/serve.mjs [--port 8787]

import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const portIdx = args.indexOf("--port");
const PORT = portIdx >= 0 ? Number(args[portIdx + 1]) : 8787;
const fileIdx = args.indexOf("--file");
const PAGE = fileIdx >= 0 ? args[fileIdx + 1] : join(here, "browser-peer.html");
const resultsDir = join(here, "results");
mkdirSync(resultsDir, { recursive: true });

createServer((req, res) => {
  if (req.method === "GET") {
    res.writeHead(200, { "content-type": "text/html" });
    res.end(readFileSync(PAGE));
    return;
  }
  if (req.method === "POST" && req.url === "/result") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const file = join(resultsDir, `browser-${Date.now()}.json`);
      writeFileSync(file, body);
      console.log(`RESULT ${file}`);
      console.log(body);
      res.writeHead(204);
      res.end();
    });
    return;
  }
  res.writeHead(404);
  res.end();
}).listen(PORT, "0.0.0.0", () => console.log(`serving on http://localhost:${PORT} (and LAN)`));
