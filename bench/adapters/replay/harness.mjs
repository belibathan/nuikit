// Replay harness for adapters: runs adapter Lua in real Lua 5.4 (wasmoon) with the FiveM client
// natives an adapter touches mocked, feeds it a recorded call log (what scripts did), and returns
// what the calling script got back: export return values, events it received, server events and
// commands it would have triggered, NUI messages, prints. Same shape as packages/core/test/lua/harness.ts,
// cut down to what adapters need, and with FiveM's real export mechanism: exports[res]:name(...)
// triggers `__cfx_export_<res>_<name>` with a setter, whoever handles it hands back the function.
//
//   import { createClient, replay } from "./harness.mjs";
//   const client = await createClient();
//   await client.start("nuikit_spike_standin", { files: [".../client.lua"] });
//   const got = await replay(client, recording, { caller: "some_script" });
//
// Recording format: see recordings/README.md. Not FiveM: start order, `provide`, cross-resource
// timing and everything in bench/adapters/spike are in-game questions this harness can't answer.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const require = createRequire(path.join(REPO, "packages/core/package.json"));
const { LuaFactory } = require("wasmoon");

// Lua has no null: drop nulls so wasmoon pushes nil. Functions (menu `action`s, callbacks) are kept.
function clone(v) {
  if (v === undefined || v === null) return undefined;
  // A Lua function crossing engines: wasmoon chokes on a nil return it reads as null.
  if (typeof v === "function") return (...a) => { const r = v(...a); return r === null ? undefined : r; };
  if (Array.isArray(v)) return v.map(clone);
  if (typeof v === "object") {
    const out = {};
    for (const [k, x] of Object.entries(v)) {
      const c = clone(x);
      if (c !== undefined) out[k] = c;
    }
    return out;
  }
  return v;
}

export async function createClient() {
  const factory = new LuaFactory();
  const resources = new Map(); // name → resource
  const handlers = new Map(); // event → [{ resource, fn }]
  const queue = [];
  let invoker; // GetInvokingResource() during delivery
  let clock = 0; // GetGameTimer(), advanced by wait()

  function deliver(event, args, from) {
    for (const h of [...(handlers.get(event) ?? [])]) {
      const outer = invoker;
      invoker = from;
      try {
        h.fn(...args.map(clone));
      } catch (e) {
        throw new Error(`${event} → ${h.resource} with ${JSON.stringify(args)}: ${e}`);
      } finally {
        invoker = outer;
      }
    }
  }
  function flush() {
    for (let guard = 0; queue.length; guard++) {
      if (guard > 10_000) throw new Error("event loop did not settle");
      const { event, args, from } = queue.shift();
      deliver(event, args, from);
    }
  }
  function trigger(from, event, ...args) {
    queue.push({ event, args: args.map(clone), from });
  }

  /** FiveM's export resolution: trigger the setter event, call what came back. */
  function callExport(from, resource, name, ...args) {
    const event = `__cfx_export_${resource}_${name}`;
    const list = handlers.get(event) ?? [];
    if (!list.length) throw new Error(`No such export ${name} in resource ${resource}`);
    let fn;
    // Every handler runs (as FiveM delivers the event to every handler); the last setter wins.
    for (const h of list) {
      const outer = invoker;
      invoker = from;
      try {
        h.fn((f) => { fn = f; });
      } finally {
        invoker = outer;
      }
    }
    if (typeof fn !== "function") throw new Error(`export ${resource}:${name} set no function`);
    const outer = invoker;
    invoker = from;
    let out;
    try {
      out = fn(...args.map(clone));
    } finally {
      invoker = outer;
    }
    flush();
    return clone(out);
  }

  async function start(name, opts = {}) {
    const lua = await factory.createEngine({ enableProxy: false });
    const res = {
      name,
      lua,
      prints: [],
      messages: [],
      serverEvents: [],
      commands: new Map(),
      executed: [],
      nuiCallbacks: new Map(),
      timers: [],
      cancelled: 0,
      run: async (code) => {
        const out = await lua.doString(code);
        flush();
        return out;
      },
      /** The UI calling fetchNui(name, data). */
      call: (cbName, data = {}) => {
        const fn = res.nuiCallbacks.get(cbName);
        if (!fn) throw new Error(`no NUI callback "${cbName}" in ${name}`);
        let result;
        fn(clone(data), (r) => { result = clone(r); });
        flush();
        return result;
      },
    };
    const g = lua.global;
    g.set("GetCurrentResourceName", () => name);
    g.set("GetInvokingResource", () => invoker);
    g.set("GetGameTimer", () => clock);
    g.set("GetConvarInt", (_k, d) => opts.convars?.[_k] ?? d);
    g.set("GetConvar", (_k, d) => opts.convars?.[_k] ?? d);
    g.set("GetResourceState", (r) => (resources.has(r) || opts.started?.includes(r) ? "started" : "missing"));
    g.set("print", (...a) => { res.prints.push(a.map(String).join(" ")); if (process.env.LUADBG) console.log(name, ...a); });
    g.set("json", { encode: (v) => JSON.stringify(v ?? null), decode: (s) => clone(JSON.parse(s)) });
    g.set("AddEventHandler", (event, fn) => {
      const list = handlers.get(event) ?? [];
      list.push({ resource: name, fn });
      handlers.set(event, list);
    });
    g.set("RegisterNetEvent", (event, fn) => {
      if (!fn) return;
      const list = handlers.get(event) ?? [];
      list.push({ resource: name, fn });
      handlers.set(event, list);
    });
    g.set("TriggerEvent", (event, ...args) => trigger(name, event, ...args));
    g.set("TriggerServerEvent", (event, ...args) => { res.serverEvents.push({ event, args: args.map(clone) }); });
    g.set("CancelEvent", () => { res.cancelled++; });
    g.set("RegisterCommand", (cmd, fn) => { res.commands.set(cmd, fn); });
    g.set("ExecuteCommand", (line) => { res.executed.push(line); });
    g.set("RegisterNUICallback", (n, fn) => { res.nuiCallbacks.set(n, fn); });
    g.set("SendNUIMessage", (m) => { res.messages.push(clone(m)); });
    g.set("SetNuiFocus", () => {});
    g.set("SetTimeout", (ms, fn) => { res.timers.push({ ms, fn }); });
    g.set("CreateThread", (fn) => { if (opts.runThreads) fn(); });
    g.set("Wait", () => {});
    g.set("__callExport", (resource, exportName, ...args) => callExport(name, resource, exportName, ...args));
    g.set("__declareExport", (exportName, fn) => {
      const event = `__cfx_export_${name}_${exportName}`;
      const list = handlers.get(event) ?? [];
      list.push({ resource: name, fn: (setCB) => setCB(fn) });
      handlers.set(event, list);
    });
    resources.set(name, res);
    await lua.doString(`
      -- exports: exports('name', fn) declares; exports['res']:name(...) / exports.res:name(...) calls.
      exports = setmetatable({}, {
        __call = function(_, name, fn) __declareExport(name, fn) end,
        __index = function(_, resource)
          return setmetatable({}, { __index = function(_, exportName)
            return function(_, ...) return __callExport(resource, exportName, ...) end
          end })
        end,
      })
    `);
    if (opts.before) await lua.doString(opts.before);
    for (const file of opts.files ?? []) {
      await lua.doString(readFileSync(file, "utf8"));
    }
    flush();
    trigger(undefined, "onClientResourceStart", name);
    flush();
    return res;
  }

  function stop(name) {
    for (const [event, list] of handlers) handlers.set(event, list.filter((h) => h.resource !== name));
    trigger(undefined, "onClientResourceStop", name);
    flush();
    resources.get(name)?.lua.global.close();
    resources.delete(name);
  }

  /** Time passes: advance the clock and fire due SetTimeouts. */
  function wait(ms) {
    clock += ms;
    for (const r of resources.values()) {
      const due = r.timers.filter((t) => t.ms <= ms);
      r.timers = r.timers.filter((t) => t.ms > ms);
      for (const t of due) t.fn();
    }
    flush();
  }

  /** A script in `from` triggers a local event. */
  function event(from, name, ...args) {
    trigger(from, name, ...args);
    flush();
  }

  /** The server triggers a client event (no invoking resource). */
  function serverEvent(name, ...args) {
    trigger(undefined, name, ...args);
    flush();
  }

  function command(resource, cmd, args = []) {
    const fn = resources.get(resource)?.commands.get(cmd);
    if (!fn) throw new Error(`no command /${cmd} in ${resource}`);
    fn(0, args.map(String), args.join(" "));
    flush();
  }

  function close() {
    for (const r of resources.values()) r.lua.global.close();
  }

  return { start, stop, wait, event, serverEvent, command, callExport, flush, close, resources, handlers };
}

/**
 * Replays a recording against the started adapter(s) and returns what the caller got.
 * Function-valued args in a recording are written as { "$fn": "<label>" }; each becomes a function
 * that records its calls under that label in `got.fnCalls`.
 */
export async function replay(client, recording, { caller = "recorded_script" } = {}) {
  const got = { returns: [], errors: [], events: [], fnCalls: [], serverEvents: [], executed: [], messages: [], prints: [] };
  const sizeBefore = (r) => ({ se: r.serverEvents.length, ex: r.executed.length, msg: r.messages.length });

  // The caller: a resource that only listens for the events the recording says it expects.
  const callerRes = await client.start(caller, {
    before: (recording.expects ?? []).map((e) => `AddEventHandler(${JSON.stringify(e)}, function(...) __got(${JSON.stringify(e)}, ...) end)`).join("\n"),
  });
  callerRes.lua.global.set("__got", (event, ...args) => { got.events.push({ event, args: args.map(clone) }); });
  callerRes.lua.global.set("__fn", (label, ...args) => { got.fnCalls.push({ label, args: args.map(clone) }); });

  const toLua = (v) => {
    if (v && typeof v === "object" && "$fn" in v) return `function(...) __fn(${JSON.stringify(v.$fn)}, ...) end`;
    if (Array.isArray(v)) return `{${v.map(toLua).join(", ")}}`;
    if (v && typeof v === "object") return `{${Object.entries(v).map(([k, x]) => `[${JSON.stringify(k)}] = ${toLua(x)}`).join(", ")}}`;
    if (v === null || v === undefined) return "nil";
    return JSON.stringify(v);
  };

  for (const call of recording.calls) {
    const snapshot = [...client.resources.values()].map((r) => [r, sizeBefore(r)]);
    try {
      if (call.kind === "export") {
        const args = (call.args ?? []).map(toLua).join(", ");
        const out = await callerRes.run(`return __callExport(${JSON.stringify(call.resource)}, ${JSON.stringify(call.name)}${args ? ", " + args : ""})`);
        got.returns.push({ call: `${call.resource}:${call.name}`, value: clone(out) });
      } else if (call.kind === "event") {
        const args = (call.args ?? []).map(toLua).join(", ");
        await callerRes.run(`TriggerEvent(${JSON.stringify(call.name)}${args ? ", " + args : ""})`);
      } else if (call.kind === "serverEvent") {
        client.serverEvent(call.name, ...(call.args ?? []));
      } else if (call.kind === "command") {
        client.command(call.resource, call.name, call.args ?? []);
      } else if (call.kind === "wait") {
        client.wait(call.ms ?? 0);
      } else {
        throw new Error(`unknown call kind ${call.kind}`);
      }
    } catch (e) {
      got.errors.push({ call, error: String(e) });
    }
    // Side effects every resource produced during this call (server events, commands, NUI messages).
    for (const [r, before] of snapshot) {
      got.serverEvents.push(...r.serverEvents.slice(before.se).map((x) => ({ resource: r.name, ...x })));
      got.executed.push(...r.executed.slice(before.ex).map((line) => ({ resource: r.name, line })));
      got.messages.push(...r.messages.slice(before.msg).map((m) => ({ resource: r.name, ...m })));
    }
  }
  for (const r of client.resources.values()) got.prints.push(...r.prints.map((line) => ({ resource: r.name, line })));
  return got;
}
