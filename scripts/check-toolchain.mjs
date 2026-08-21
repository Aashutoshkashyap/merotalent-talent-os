#!/usr/bin/env node

/**
 * Verifies the local Node.js and npm versions.
 *
 * Default run is offline and fast: it compares the running versions against the
 * `engines` floor in package.json and fails only when the toolchain is too old
 * to build the project. This is what `predev` and `prebuild` use, so it never
 * needs the network and never blocks work on a plane.
 *
 * Pass --latest to additionally check nodejs.org and the npm registry and print
 * an update prompt when a newer Node LTS or npm release is available. That
 * check is advisory and never fails the command.
 */

import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checkLatest = process.argv.includes("--latest");
const NETWORK_TIMEOUT_MS = 8_000;

const parseVersion = (value) => {
  const match = String(value ?? "").trim().match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
};

const formatVersion = (version) =>
  version ? `${version.major}.${version.minor}.${version.patch}` : "unknown";

const compareVersions = (left, right) =>
  left.major - right.major || left.minor - right.minor || left.patch - right.patch;

/** Reads the minimum from a `>=x.y.z` engines range. */
const minimumFrom = (range) => parseVersion(range);

const readEngines = async () => {
  const manifest = JSON.parse(
    await readFile(resolve(projectRoot, "package.json"), "utf8"),
  );
  return manifest.engines ?? {};
};

const npmVersion = async () => {
  const { stdout } = await run("npm", ["--version"]);
  return parseVersion(stdout);
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.json();
};

const latestNodeLts = async () => {
  const releases = await fetchJson("https://nodejs.org/dist/index.json");
  const lts = releases.find((release) => release.lts);
  return lts ? { version: parseVersion(lts.version), codename: lts.lts } : null;
};

const latestNpm = async () => {
  const registry = await fetchJson("https://registry.npmjs.org/npm/latest");
  return parseVersion(registry.version);
};

const reportBelowMinimum = (tool, current, minimum, howToUpdate) => {
  console.error(
    `\n✖ ${tool} ${formatVersion(current)} is too old — this project requires ${tool} >= ${formatVersion(minimum)}.`,
  );
  console.error(`  Update with: ${howToUpdate}\n`);
};

const reportOutdated = (tool, current, latest, howToUpdate, suffix = "") => {
  console.warn(
    `\n▲ ${tool} ${formatVersion(current)} is behind the latest release ${formatVersion(latest)}${suffix}.`,
  );
  console.warn(`  Update with: ${howToUpdate}\n`);
};

const main = async () => {
  const engines = await readEngines();
  const nodeCurrent = parseVersion(process.versions.node);
  const npmCurrent = await npmVersion().catch(() => null);

  let belowMinimum = false;

  const nodeMinimum = minimumFrom(engines.node);
  if (nodeMinimum && nodeCurrent && compareVersions(nodeCurrent, nodeMinimum) < 0) {
    reportBelowMinimum("Node.js", nodeCurrent, nodeMinimum, "nvm install --lts && nvm use --lts");
    belowMinimum = true;
  }

  const npmMinimum = minimumFrom(engines.npm);
  if (npmMinimum && npmCurrent && compareVersions(npmCurrent, npmMinimum) < 0) {
    reportBelowMinimum("npm", npmCurrent, npmMinimum, "npm install -g npm@latest");
    belowMinimum = true;
  }

  if (belowMinimum) {
    process.exitCode = 1;
    return;
  }

  if (!checkLatest) {
    console.log(
      `✔ Node.js ${formatVersion(nodeCurrent)} and npm ${formatVersion(npmCurrent)} meet the project minimums.`,
    );
    console.log("  Run `npm run check:toolchain` to compare against the latest releases.");
    return;
  }

  // Advisory only: a registry outage must not fail the developer's command.
  const [nodeLts, npmLatest] = await Promise.all([
    latestNodeLts().catch(() => null),
    latestNpm().catch(() => null),
  ]);

  let anyOutdated = false;

  if (nodeLts && nodeCurrent && compareVersions(nodeCurrent, nodeLts.version) < 0) {
    reportOutdated(
      "Node.js",
      nodeCurrent,
      nodeLts.version,
      "nvm install --lts && nvm use --lts",
      ` (${nodeLts.codename} LTS)`,
    );
    anyOutdated = true;
  }

  if (npmLatest && npmCurrent && compareVersions(npmCurrent, npmLatest) < 0) {
    reportOutdated("npm", npmCurrent, npmLatest, "npm install -g npm@latest");
    anyOutdated = true;
  }

  if (!nodeLts && !npmLatest) {
    console.warn("▲ Could not reach nodejs.org or the npm registry; skipped the latest-version check.");
    return;
  }

  if (!anyOutdated) {
    console.log(
      `✔ Node.js ${formatVersion(nodeCurrent)} and npm ${formatVersion(npmCurrent)} are up to date.`,
    );
  }
};

main().catch((error) => {
  console.error(`✖ Toolchain check failed: ${error.message}`);
  process.exitCode = 1;
});
