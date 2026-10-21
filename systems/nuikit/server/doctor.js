/*
 * nuikit doctor: the server tells you what's left (docs/doctor.md).
 *
 *   nuikit doctor         framework, adapter packs, every UI resource's status, conflicts, next steps
 *   nuikit doctor json    the same report as one JSON line (txAdmin, scripts)
 *
 * This file only builds the snapshot from FXServer natives and prints; the detection and every
 * finding live in nuikit-core's doctor (compiler.js carries it, synced from packages/core), so they
 * run under vitest with hand-made snapshots.
 *
 * Live intent counts: the intents runtime emits `nuikit:intent` { source, intent } (server event, or
 * from a client); counted here by source resource since start. Convars:
 *   nuikit_latest <version>   tell the doctor the newest release (no network calls are made)
 *   nuikit_check_updates 1    opt in to an online check (reserved; prints that it's not built yet)
 */
"use strict";

// One scope: FXServer runs every server_script of a resource in the same context (main.js has its own RESOURCE).
(() => {
const RESOURCE = GetCurrentResourceName();
const { doctor, formatDoctor } = globalThis.NuikitTheme;

// Metadata keys the doctor reads. GetResourceMetadata only answers for keys asked by name.
const KEYS = [
  "ui_page", "loadscreen", "version", "provide", "dependency", "dependencies",
  "nuikit_protocol", "nuikit_ui", "nuikit_renderer", "nuikit_level", "nuikit_adapter",
  "shared_script", "client_script", "server_script", "shared_scripts", "client_scripts", "server_scripts",
];

// Resources already started when nuikit's server script ran started before nuikit.
const startedBefore = new Set();
for (let i = 0; i < GetNumResources(); i++) {
  const name = GetResourceByFindIndex(i);
  if (name && name !== RESOURCE && GetResourceState(name) === "started") startedBefore.add(name);
}
on("onResourceStart", (name) => startedBefore.delete(name));

// Intent counts by source (nuikit:intent { source, intent }).
const intents = {};
function countIntent(payload) {
  if (!payload || typeof payload !== "object") return;
  const source = String(payload.source || "unknown");
  const intent = String(payload.intent || "unknown");
  const bySource = (intents[source] = intents[source] || {});
  bySource[intent] = (bySource[intent] || 0) + 1;
}
on("nuikit:intent", countIntent);
onNet("nuikit:intent", countIntent);

function metadata(name) {
  const out = {};
  for (const key of KEYS) {
    const n = GetNumResourceMetadata(name, key);
    if (!n) continue;
    out[key] = [];
    for (let i = 0; i < n; i++) out[key].push(String(GetResourceMetadata(name, key, i)));
  }
  return out;
}

function snapshot() {
  const resources = [];
  for (let i = 0; i < GetNumResources(); i++) {
    const name = GetResourceByFindIndex(i);
    if (!name) continue;
    resources.push({ name, state: GetResourceState(name), metadata: metadata(name), startedBeforeRuntime: startedBefore.has(name) });
  }
  let overrides = null;
  const raw = LoadResourceFile(RESOURCE, "overrides.json");
  if (raw) {
    try {
      overrides = JSON.parse(raw);
    } catch (err) {
      console.log(`^5[nuikit]^7 ^3overrides.json is not valid JSON: ${err && err.message ? err.message : err}^7`);
    }
  }
  const theme = typeof globalThis.__nuikitTheme === "function" ? globalThis.__nuikitTheme() : null;
  const latest = GetConvar("nuikit_latest", "") || null;
  return {
    runtime: { version: GetResourceMetadata(RESOURCE, "version", 0) || "0.0.0", protocol: Number(GetResourceMetadata(RESOURCE, "nuikit_protocol", 0) || 1), latest },
    resources,
    readFile: (res, path) => LoadResourceFile(res, path) || null,
    overrides,
    theme: theme ? { contrast: theme.contrast, warnings: theme.warnings } : null,
    intents,
  };
}

function run(reply, json) {
  const report = doctor(snapshot());
  if (json) {
    reply(JSON.stringify(report));
    return report;
  }
  for (const line of formatDoctor(report)) {
    reply(line.replace(/^(\s+)(ERROR)\b/, "$1^1$2^7").replace(/^(\s+)(WARN)\b/, "$1^3$2^7").replace(/^(\s+)(INFO)\b/, "$1^5$2^7"));
  }
  if (GetConvar("nuikit_check_updates", "0") === "1") {
    reply("^3nuikit_check_updates is set, but the online check isn't built yet; set `nuikit_latest <version>` by hand^7");
  }
  return report;
}

globalThis.NuikitDoctor = { run, snapshot };
exports("doctor", () => doctor(snapshot()));
})();
