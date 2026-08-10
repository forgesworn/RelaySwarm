#!/usr/bin/env node
// End-to-end test: run the PoC and the fan-out spike against live relays
// and verify every transfer. No mocks - if the relays are reachable and
// the protocol works, this passes. Run: npm test
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const results = [];

function run(name, args, validate) {
  process.stderr.write(`\n=== ${name} ===\n`);
  const r = spawnSync("node", args, { cwd: root, encoding: "utf8", timeout: 120_000 });
  process.stderr.write(r.stderr || "");
  let summary = null;
  try { summary = JSON.parse(r.stdout); } catch {}
  const ok = r.status === 0 && summary && validate(summary);
  results.push({ name, ok, detail: summary });
  process.stderr.write(`${ok ? "PASS" : "FAIL"}: ${name}\n`);
  return ok;
}

run("PoC: two peers, 600KB, verified", ["poc.mjs", "--size", "614400"],
  (s) => s.ok === true && s.sha256Verified === true);

run("Fan-out: 1 seeder, 3 leechers, 1MB each, all verified", [join("spikes", "fanout.mjs"), "--n", "3", "--size", "1048576"],
  (s) => s.ok === true && s.aggregate?.succeeded === 3);

const passed = results.filter((r) => r.ok).length;
console.log(JSON.stringify({ ok: passed === results.length, passed, total: results.length, results: results.map(({ name, ok }) => ({ name, ok })) }, null, 2));
process.exit(passed === results.length ? 0 : 1);
