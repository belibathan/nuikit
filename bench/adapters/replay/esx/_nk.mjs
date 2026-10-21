// Shared setup for the adapter replay tests (esx/ and standalone/): a `nuikit` resource running the
// stand-in runtime (_runtime.lua) over the real lib/intents.lua + schema, adapter resources that import
// the same lib the way @nuikit/init.lua does, and the es_extended mock. Run: node --test "bench/adapters/replay/esx/*.test.mjs"
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, "../../../..");
const LIB = path.join(REPO, "packages/core/lua/intents.lua");
const SCHEMA = readFileSync(path.join(REPO, "packages/core/lua/intents.schema.lua"), "utf8");
if (SCHEMA.includes("]==]")) throw new Error("schema contains ]==]");

/** What @nuikit/init.lua gives a resource: the schema reachable from LoadResourceFile, then `nk`. */
const importLib = `
  function LoadResourceFile(res, file) if file == 'lib/intents.schema.lua' then return [==[${SCHEMA}]==] end end
`;
const NK_SHIM = path.join(HERE, "_nk.lua");

/** The nuikit resource (stand-in runtime). */
export async function startNk(client) {
  return client.start("nuikit", { before: importLib, files: [LIB, NK_SHIM, path.join(HERE, "_runtime.lua")] });
}

/** An adapter resource: adapters/<pack>/<name>/client.lua with nk in scope. */
export async function startAdapter(client, pack, name, opts = {}) {
  const file = path.join(REPO, "adapters", pack, name, "client.lua");
  return client.start(name, { ...opts, before: importLib + (opts.before ?? ""), files: [LIB, NK_SHIM, file] });
}

/** What @es_extended/imports.lua gives a resource, against the mock: ESX.UI.Menu over its exports. */
export const ESX_IMPORT = `
  ESX = { UI = { Menu = {} } }
  for _, name in ipairs({ 'RegisterType', 'Open', 'Close', 'CloseAll', 'GetOpened', 'GetOpenedMenus', 'IsOpen' }) do
    ESX.UI.Menu[name] = function(...) return exports.es_extended['UI_Menu_' .. name](nil, ...) end
  end
`;

/** The es_extended mock (ESX.UI.Menu). */
export async function startEsx(client) {
  const res = await client.start("es_extended", { files: [path.join(HERE, "_es_extended.lua")] });
  return res;
}

/** A recording next to the test: <dir>/recordings/<name>.json. */
export const recording = (dir, name) => JSON.parse(readFileSync(path.join(dir, "recordings", `${name}.json`), "utf8"));

/** Intent messages the runtime recorded, in order: { op, kind, props | reason }. */
export const intents = (nk, kind) => nk.messages.filter((m) => !kind || m.kind === kind);
