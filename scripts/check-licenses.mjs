#!/usr/bin/env node
/**
 * Fail if any installed package carries a forbidden strong-copyleft / SSPL-style license.
 */
import { execFileSync } from "node:child_process";

const FORBIDDEN = [
  /\bAGPL\b/i,
  /\bGPL\b/i,
  /\bLGPL\b/i,
  /\bSSPL\b/i,
  /\bBUSL\b/i,
  /Commons Clause/i,
  /Elastic License/i,
  /Server Side Public License/i,
];

const raw = execFileSync("pnpm", ["licenses", "list", "--json"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

/** @type {Record<string, Array<{ name: string; versions?: string[] }>>} */
const byLicense = JSON.parse(raw);
const violations = [];

for (const [license, packages] of Object.entries(byLicense)) {
  if (!FORBIDDEN.some((pattern) => pattern.test(license))) {
    continue;
  }
  for (const pkg of packages) {
    violations.push(`${pkg.name}@${(pkg.versions ?? []).join(",")}: ${license}`);
  }
}

if (violations.length > 0) {
  console.error("Forbidden licenses detected:");
  for (const line of violations) {
    console.error(`  - ${line}`);
  }
  process.exit(1);
}

console.log(`License check passed (${Object.keys(byLicense).length} license groups).`);
