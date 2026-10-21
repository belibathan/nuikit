// Replay support for the [nuikit-qb] adapters: starts a stand-in `nuikit` runtime that records every
// intent an adapter opens (validated against the real schema) and lets a test play the player
// (resolve, cancel, events), and starts an adapter resource with @nuikit/init.lua's client half
// (lua/intents.lua → nk.*) loaded in front of it, as the import would in game.
//
// Threads: FiveM runs scripts in coroutines (Citizen.Await, Wait). The adapter harness in ../harness.mjs
// runs calls on the main Lua thread, so this file adds a coroutine model in Lua: CreateThread starts a
// coroutine, Wait yields it, `frames(n)` resumes every live thread n times (n frames), and `promise` +
// Citizen.Await yield the waiting coroutine until the promise resolves. A yielding export
// (qb-input's ShowInput) is called with `thread(res, lua)`, which is what a script's own thread does.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, "../../../..");
export const ADAPTERS = path.join(REPO, "adapters", "[nuikit-qb]");
const CORE_LUA = path.join(REPO, "packages/core/lua");
const INTENTS_LUA = path.join(CORE_LUA, "intents.lua");
const SCHEMA_LUA = readFileSync(path.join(CORE_LUA, "intents.schema.lua"), "utf8");

if (SCHEMA_LUA.includes("]=====]")) throw new Error("schema contains the long-bracket terminator");

/** Lua run before any file: the schema loader, the coroutine model, promise/Await, natives adapters touch. */
export const PRELUDE = `
  __SCHEMA = [=====[${SCHEMA_LUA}]=====]
  function LoadResourceFile(resource, file)
    if resource == 'nuikit' and file == 'lib/intents.schema.lua' then return __SCHEMA end
    return nil
  end
  __threads = {}
  function CreateThread(fn)
    local co = coroutine.create(fn)
    __threads[#__threads + 1] = co
    local ok, err = coroutine.resume(co)
    if not ok then error(err, 0) end
  end
  Citizen = Citizen or {}
  Citizen.CreateThread = CreateThread
  function Wait(ms) if coroutine.isyieldable() then coroutine.yield(ms or 0) end end
  Citizen.Wait = Wait
  Citizen.SetTimeout = SetTimeout
  --- Resume every live thread once per frame.
  function __frames(n)
    for _ = 1, (n or 1) do
      local live = {}
      for _, co in ipairs(__threads) do
        if coroutine.status(co) == 'suspended' then
          local ok, err = coroutine.resume(co)
          if not ok then error(err, 0) end
        end
        if coroutine.status(co) ~= 'dead' then live[#live + 1] = co end
      end
      __threads = live
    end
  end
  promise = {
    new = function()
      return {
        resolve = function(self, v)
          if self.done then return end
          self.done, self.value = true, v
          local co = self.co
          if co then
            self.co = nil
            local ok, err = coroutine.resume(co, v)
            if not ok then error(err, 0) end
          end
        end,
      }
    end,
  }
  Citizen.Await = function(p)
    if p.done then return p.value end
    if not coroutine.isyieldable() then error('Citizen.Await outside a thread', 2) end
    p.co = coroutine.running()
    return coroutine.yield()
  end
  -- Natives the adapters touch that the base harness does not mock. Each call is recorded in NATIVES.
  NATIVES = {}
  local function native(name, ret)
    _G[name] = function(...) NATIVES[#NATIVES + 1] = { name, ... } return ret end
  end
  native('RegisterKeyMapping')
  native('PlayerPedId', 1)
  native('IsEntityDead', false)
  native('IsPedInAnyVehicle', false)
  native('GetVehiclePedIsIn', 0)
  native('RequestAnimDict')
  native('HasAnimDictLoaded', true)
  native('RequestModel')
  native('HasModelLoaded', true)
  native('TaskPlayAnim')
  native('TaskStartScenarioInPlace')
  native('ClearPedTasks')
  native('StopAnimTask')
  native('GetEntityCoords', { x = 0, y = 0, z = 0 })
  native('CreateObject', 77)
  native('GetPedBoneIndex', 1)
  native('AttachEntityToEntity')
  native('DeleteObject')
  native('DeleteEntity')
  native('SetModelAsNoLongerNeeded')
  native('RemoveAnimDict')
  native('DisableControlAction')
  native('IsControlJustReleased', false)
  native('IsDisabledControlJustReleased', false)
  native('GetHashKey', 1)
  function __natives() local out = {} for i, n in ipairs(NATIVES) do out[i] = n[1] end return json.encode(out) end
`;

/** The stand-in runtime: records intents, validates with the real schema, answers like systems/nuikit/client/intents.lua. */
const RUNTIME_LUA = `
  INTENTS = {}
  OPEN = {}
  local function push(e) INTENTS[#INTENTS + 1] = e end
  AddEventHandler('nuikit:intent:open', function(id, kind, props)
    local from = GetInvokingResource() or 'nuikit'
    local issues = NUI.intents.validate(kind, props)
    if #issues > 0 then
      push({ op = 'invalid', id = id, kind = kind, resource = from, problem = issues[1].path .. ' ' .. issues[1].message })
      TriggerEvent('nuikit:intent:resolved', id, { reason = 'invalid' })
      return
    end
    if kind == 'progress' and not OPEN[id] then
      for _, other in pairs(OPEN) do
        if other.kind == 'progress' then
          push({ op = 'busy', id = id, kind = kind, resource = from })
          TriggerEvent('nuikit:intent:resolved', id, { reason = 'busy' })
          return
        end
      end
    end
    if OPEN[id] then push({ op = 'replace', id = id }) end
    push({ op = 'open', id = id, kind = kind, props = props, resource = from })
    local copy = {}
    for k, v in pairs(props) do copy[k] = v end
    OPEN[id] = { kind = kind, props = copy, resource = from }
  end)
  AddEventHandler('nuikit:intent:update', function(id, patch)
    local it = OPEN[id]
    if not it or it.resource ~= GetInvokingResource() then return end
    for k, v in pairs(patch) do it.props[k] = v end
    push({ op = 'update', id = id, props = patch })
  end)
  AddEventHandler('nuikit:intent:cancel', function(id, reason)
    local it = OPEN[id]
    if not it or it.resource ~= GetInvokingResource() then return end
    OPEN[id] = nil
    push({ op = 'cancel', id = id, reason = reason })
    TriggerEvent('nuikit:intent:resolved', id, { reason = reason or 'cancel' })
  end)
  --- The player: resolve the open intent with a result (what a renderer POSTs).
  function __resolve(id, result, data)
    if not OPEN[id] then error('no open intent ' .. tostring(id)) end
    OPEN[id] = nil
    push({ op = 'resolve', id = id })
    TriggerEvent('nuikit:intent:resolved', id, { result = result, data = data })
  end
  --- The player closed it (Escape, timeout, the cancel key).
  function __dismiss(id, reason)
    if not OPEN[id] then error('no open intent ' .. tostring(id)) end
    OPEN[id] = nil
    push({ op = 'dismiss', id = id, reason = reason })
    TriggerEvent('nuikit:intent:resolved', id, { reason = reason })
  end
  function __event(id, event, data) TriggerEvent('nuikit:intent:event', id, event, data) end
  function __open() local out = {} for id, it in pairs(OPEN) do out[id] = it end return json.encode(out) end
  function __intents() return json.encode(INTENTS) end
`;

/** Start the stand-in `nuikit` runtime. Returns helpers to read and drive the intents it holds. */
export async function startRuntime(client) {
  const res = await client.start("nuikit", { before: PRELUDE + "\nNUI = {}\n", files: [INTENTS_LUA] });
  await res.run(RUNTIME_LUA);
  const j = async (code) => JSON.parse((await res.run(code)) || "null");
  const api = {
    res,
    /** Every op in order: open / update / cancel / resolve / dismiss / invalid / busy / replace. */
    intents: () => j("return __intents()"),
    /** Only the opens. */
    opens: async (kind) => (await api.intents()).filter((e) => e.op === "open" && (!kind || e.kind === kind)),
    /** Currently open, by id. */
    open: () => j("return __open()"),
    /** Ids open now, oldest first in insertion order of the table (use openIds().at(-1) only when one). */
    openIds: async () => Object.keys((await api.open()) ?? {}),
    /** The one open intent of a kind (throws when there are several or none). */
    only: async (kind) => {
      const entries = Object.entries((await api.open()) ?? {}).filter(([, it]) => !kind || it.kind === kind);
      if (entries.length !== 1) throw new Error(`expected one open ${kind ?? "intent"}, found ${entries.length}`);
      return { id: entries[0][0], ...entries[0][1] };
    },
    resolve: (id, result, data) => res.run(`__resolve(${JSON.stringify(id)}, json.decode(${JSON.stringify(JSON.stringify(result ?? null))}), json.decode(${JSON.stringify(JSON.stringify(data ?? null))}))`),
    dismiss: (id, reason = "escape") => res.run(`__dismiss(${JSON.stringify(id)}, ${JSON.stringify(reason)})`),
    event: (id, event, data) => res.run(`__event(${JSON.stringify(id)}, ${JSON.stringify(event)}, json.decode(${JSON.stringify(JSON.stringify(data ?? {}))}))`),
  };
  return api;
}

/** Start an adapter resource from adapters/[nuikit-qb]/<name> with nk.* in front, as @nuikit/init.lua gives it. */
export async function startAdapter(client, name, { files = ["client/main.lua"], before = "", convars } = {}) {
  const dir = path.join(ADAPTERS, name);
  const res = await client.start(name, {
    // Exports are kept in Lua as well (__LOCAL): a yielding export (ShowInput) can only be called from a
    // Lua coroutine in its own engine; wasmoon can't yield across the JS call the harness routes exports through.
    before: PRELUDE + `
      NUI = {}
      __LOCAL = {}
      local prev = exports
      exports = setmetatable({}, {
        __call = function(_, n, fn) __LOCAL[n] = fn prev(n, fn) end,
        __index = function(_, r) return prev[r] end,
      })
    ` + before,
    files: [INTENTS_LUA, ...files.map((f) => path.join(dir, f))],
    convars,
  });
  // @nuikit/init.lua does `nk = NUI` after loading the libs.
  await res.run("nk = NUI");
  res.natives = async () => JSON.parse(await res.run("return __natives()"));
  res.frames = (n = 1) => res.run(`__frames(${n})`);
  return res;
}

/** Run Lua inside a script thread (a coroutine), as FiveM runs a script's code. Returns after the first yield. */
export async function thread(res, lua) {
  await res.run(`CreateThread(function() ${lua} end)`);
}

/** The recording for an adapter: recordings/<name>.json. */
export function recording(name) {
  return JSON.parse(readFileSync(path.join(HERE, "recordings", `${name}.json`), "utf8"));
}

// ───────────────────────────────── play a recording with the player in it

const toLua = (v) => {
  if (v && typeof v === "object" && "$fn" in v) return `function(...) __fn(${JSON.stringify(v.$fn)}, ...) end`;
  if (Array.isArray(v)) return `{${v.map(toLua).join(", ")}}`;
  if (v && typeof v === "object") return `{${Object.entries(v).map(([k, x]) => `[${JSON.stringify(k)}] = ${toLua(x)}`).join(", ")}}`;
  if (v === null || v === undefined) return "nil";
  return JSON.stringify(v);
};

const clone = (v) => (v === undefined || v === null ? undefined : JSON.parse(JSON.stringify(v), (_k, x) => (x === null ? undefined : x)));

/**
 * Like harness.replay(), plus the player's side, since an adapter's return path only runs once a
 * renderer answers. Extra step kinds, on top of export / event / serverEvent / command / wait:
 *   { "kind": "resolve", "intent": "menu", "result": { … }, "data": { … } }   the open intent of that kind resolves
 *   { "kind": "dismiss", "intent": "menu", "reason": "escape" }               the player closed it
 *   { "kind": "intentEvent", "intent": "radial", "event": "select", "data": { … } }
 *   { "kind": "frames", "n": 3 }                                              n game frames (threads run)
 *   { "kind": "thread", "adapter": "nuikit_qb_input", "name": "ShowInput", "args": [ … ], "label": "first" }
 *       an export that yields (ShowInput), called from a script thread. It runs as a coroutine in the
 *       adapter's engine (see startAdapter); its return value lands in got.threads[label] when it resumes.
 * Function args written { "$fn": "label" } report their calls in got.fnCalls, as in harness.replay().
 * `adapters` maps adapter names to their started resources (needed for "thread" steps).
 */
export async function play(client, rt, recording, { caller = "recorded_script", adapters = {} } = {}) {
  const got = { returns: [], threads: {}, errors: [], events: [], fnCalls: [], serverEvents: [], executed: [], prints: [] };
  const before = (recording.expects ?? []).map((e) => `AddEventHandler(${JSON.stringify(e)}, function(...) __got(${JSON.stringify(e)}, ...) end)`).join("\n");
  const callerRes = await client.start(caller, { before: PRELUDE + "\n" + before });
  const hook = (res) => {
    const g = res.lua.global;
    g.set("__got", (event, ...args) => { got.events.push({ event, args: args.map(clone) }); });
    g.set("__fn", (label, ...args) => { got.fnCalls.push({ label, args: args.map(clone) }); });
    g.set("__thread", (label, value) => { got.threads[label] = clone(value) ?? null; });
  };
  hook(callerRes);
  for (const res of Object.values(adapters)) hook(res);
  const sizeBefore = (r) => ({ se: r.serverEvents.length, ex: r.executed.length });

  let n = 0;
  for (const step of recording.calls) {
    n++;
    const snapshot = [...client.resources.values()].map((r) => [r, sizeBefore(r)]);
    try {
      const args = (step.args ?? []).map(toLua).join(", ");
      if (step.kind === "export") {
        const out = await callerRes.run(`return __callExport(${JSON.stringify(step.resource)}, ${JSON.stringify(step.name)}${args ? ", " + args : ""})`);
        got.returns.push({ call: `${step.resource}:${step.name}`, value: clone(out) });
      } else if (step.kind === "thread") {
        const label = step.label ?? `${step.name}#${n}`;
        const res = adapters[step.adapter];
        if (!res) throw new Error(`thread step needs adapters[${step.adapter}]`);
        await res.run(`CreateThread(function() __thread(${JSON.stringify(label)}, __LOCAL[${JSON.stringify(step.name)}](${args})) end)`);
      } else if (step.kind === "event") {
        await callerRes.run(`TriggerEvent(${JSON.stringify(step.name)}${args ? ", " + args : ""})`);
      } else if (step.kind === "serverEvent") {
        client.serverEvent(step.name, ...(step.args ?? []));
      } else if (step.kind === "command") {
        client.command(step.resource, step.name, step.args ?? []);
      } else if (step.kind === "wait") {
        client.wait(step.ms ?? 0);
      } else if (step.kind === "frames") {
        for (const r of client.resources.values()) await r.run(`if __frames then __frames(${step.n ?? 1}) end`);
      } else if (step.kind === "resolve") {
        const it = await rt.only(step.intent);
        await rt.resolve(it.id, step.result, step.data);
      } else if (step.kind === "dismiss") {
        const it = await rt.only(step.intent);
        await rt.dismiss(it.id, step.reason ?? "escape");
      } else if (step.kind === "intentEvent") {
        const it = await rt.only(step.intent);
        await rt.event(it.id, step.event, step.data);
      } else {
        throw new Error(`unknown step kind ${step.kind}`);
      }
    } catch (e) {
      got.errors.push({ step: n, call: step, error: String(e) });
    }
    for (const [r, b] of snapshot) {
      got.serverEvents.push(...r.serverEvents.slice(b.se).map((x) => ({ resource: r.name, ...x })));
      got.executed.push(...r.executed.slice(b.ex).map((line) => ({ resource: r.name, line })));
    }
  }
  for (const r of client.resources.values()) got.prints.push(...r.prints.map((line) => ({ resource: r.name, line })));
  return got;
}
