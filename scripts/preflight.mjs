#!/usr/bin/env node
/**
 * Local gate that mirrors the CI `check` job closely enough to catch failures
 * before a branch is pushed or a merge request against main is opened.
 *
 * Usage:
 *   npm run verify:preflight            # fast gate: lint, typecheck, tests, build
 *   npm run verify:preflight -- --full  # adds the browser verification suites
 */
import { spawnSync } from "node:child_process";

const full = process.argv.includes("--full");

const fastSteps = [
  ["lint", "npm run lint"],
  ["typecheck", "npm run typecheck"],
  ["unit tests", "npm test"],
  ["cms tests", "npm run test:cms"],
  ["production build", "npm run build"],
];

const fullSteps = [
  ["ui verification", "npm run verify:ui"],
  ["tour import verification", "npm run verify:tour-import"],
  ["cms verification", "npm run verify:cms"],
  ["hero verification", "npm run verify:hero"],
];

const steps = full ? [...fastSteps, ...fullSteps] : fastSteps;
const started = Date.now();

console.log(
  `Preflight gate (${full ? "full" : "fast"}): ${steps.length} step(s). ` +
    `Run "npm run verify:preflight -- --full" for CI browser parity.`,
);

for (const [label, command] of steps) {
  const stepStarted = Date.now();
  console.log(`\n=== ${label}: ${command} ===`);
  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  const seconds = ((Date.now() - stepStarted) / 1000).toFixed(1);
  if (result.status !== 0) {
    console.error(`\nPreflight failed: ${label} (${command}) after ${seconds}s.`);
    process.exit(result.status ?? 1);
  }
  console.log(`--- ${label} passed in ${seconds}s ---`);
}

const total = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\nPreflight passed: ${steps.length}/${steps.length} steps in ${total}s.`);
