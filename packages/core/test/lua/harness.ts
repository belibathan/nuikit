/**
 * Runs lua/nuikit.lua in real Lua 5.4 (wasmoon) with the FiveM client natives it uses mocked.
 * Several "resources" share one client. Local events are queued and delivered in order to every
 * resource's handlers once the current Lua call returns (wasmoon can't safely re-enter one engine
 * from inside another). That is the stricter case for nuikit: it must not rely on TriggerEvent
 * being synchronous across resources.
 */
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { LuaFactory, type LuaEngine } from "wasmoon";

const luaPath = (file: string) => (isAbsolute(file) ? file : fileURLToPath(new URL(`../../lua/${file}`, import.meta.url)));
const lua_ = (file: string) => readFileSync(luaPath(file), "utf8");
const SOURCE = lua_("nuikit.lua");

export interface StartOptions {
  /** Lua run before nuikit.lua: mock natives, framework exports, statebags. */
  before?: string;
  /** More files to load after nuikit.lua, in order: names in lua/ ("bridge.lua") or absolute paths. */
  scripts?: string[];
  /** fxmanifest metadata, e.g. { nuikit_ui: ["web/dist/module.js"] } (GetResourceMetadata). */
  metadata?: Record<string, string[]>;
  /**
   * How the resource gets the runtime. "vendored" (default): nuikit.lua runs as its own client script.
   * "import": shared_script '@nuikit/init.lua', which loads lib/*.lua from the nuikit resource
   * (LoadResourceFile('nuikit', 'lib/…') serves packages/core/lua). "none": no runtime at all.
   */
  runtime?: "vendored" | "import" | "none";
  /** "import" only: pretend the nuikit resource isn't there (LoadResourceFile returns nil). */
  runtimeMissing?: boolean;
  /** The resource's KVP at start (what an earlier session saved): pass another resource's `kvp` to restart with it. */
  kvp?: Map<string, string>;
}

type Handler = { resource: string; fn: (...args: unknown[]) => unknown };

export interface Resource {
  name: string;
  lua: LuaEngine;
  /** Messages sent to this resource's UI, newest last. */
  messages: { action: string; data: any }[];
  /** Current NUI focus as set by this resource. */
  focus: { focus: boolean; cursor: boolean; keepInput: boolean };
  /** Run Lua in this resource. */
  run<T = unknown>(code: string): Promise<T>;
  /** Simulate the UI calling fetchNui(name, data). */
  call(name: string, data?: unknown): Promise<any>;
  /** Like call(), but resolves whenever Lua answers (callbacks that answer later, e.g. long-polls). */
  callLater(name: string, data?: unknown): Promise<any>;
  /** This resource's KVP store. */
  kvp: Map<string, string>;
  /** Commands it registered. */
  commands: Map<string, (source: number, args: string[]) => void>;
  keyMappings: Map<string, string>;
  /** Server events it triggered. */
  serverEvents: { event: string; args: unknown[] }[];
  /** Like call, for callbacks that answer later: `done`/`result` fill in when cb runs. */
  callPending(name: string, data?: unknown): { done: boolean; result: any };
  /** Functions this resource registered with exports('name', fn). */
  exports: Map<string, (...args: unknown[]) => unknown>;
  /** Latest `nuikit:surfaces` payload. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  surfaces(): any;
}

// Lua has no null: drop JSON nulls so wasmoon pushes nil (it chokes on a JS null).
const clone = <T>(v: T): T =>
  v === undefined || v === null ? (undefined as T) : JSON.parse(JSON.stringify(v), (_k, x) => (x === null ? undefined : x));

export async function createClient(options: { syncEvents?: boolean; onNuiMessage?: (resource: string, msg: unknown) => void } = {}) {
  const factory = new LuaFactory();
  const handlers = new Map<string, Handler[]>();
  const resources = new Map<string, Resource>();
  // Replicated state (GlobalState) and its change handlers, shared by every resource on the client.
  const globalState = new Map<string, unknown>();
  const bagHandlers: { resource: string; key: string; fn: (bag: string, key: string, value: unknown) => void }[] = [];
  // The local player's state bag (LocalPlayer.state, bag "player:1") and its handlers (bag filter nil).
  const playerState = new Map<string, unknown>();
  const playerHandlers: { resource: string; key: string; fn: (bag: string, key: string, value: unknown) => void }[] = [];
  // SetTimeout callbacks, run by runTimers().
  const timers: { resource: string; ms: number; fn: () => void }[] = [];
  const metadata = new Map<string, Record<string, string[]>>();
  /** The resource an onClientResourceStop is being delivered for (GetResourceState → "stopping"). */
  let stopping: string | undefined;

  /** The real, single, global NUI focus: the last SetNuiFocus call wins, whichever resource made it. */
  const nui = { focus: false, cursor: false, keepInput: false, owner: null as string | null };

  const queue: { event: string; args: unknown[]; from?: string }[] = [];
  /** The resource that triggered the event being delivered (FiveM's GetInvokingResource()). */
  let invoker: string | undefined;
  function trigger(event: string, ...args: unknown[]) {
    triggerFrom(undefined, event, ...args);
  }
  function triggerFrom(from: string | undefined, event: string, ...args: unknown[]) {
    // Synchronous mode: handlers run right away, nested in the caller, like FiveM's local TriggerEvent.
    if (options.syncEvents) deliver(event, args.map(clone), from);
    else queue.push({ event, args: args.map(clone), from });
  }
  function deliver(event: string, args: unknown[], from?: string) {
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
  /** Queued mode: deliver everything queued, in order, until nothing new is triggered. */
  function flush() {
    for (let guard = 0; queue.length; guard++) {
      if (guard > 10_000) throw new Error("event loop did not settle");
      const { event, args, from } = queue.shift()!;
      deliver(event, args, from);
    }
  }

  async function start(name: string, startOptions: StartOptions = {}): Promise<Resource> {
    // No proxies: event args must arrive as real Lua tables, like msgpack-decoded args in FiveM.
    const lua = await factory.createEngine({ enableProxy: false });
    const callbacks = new Map<string, (data: unknown, cb: (r: unknown) => void) => void>();
    const res: Resource = {
      name,
      lua,
      messages: [],
      focus: { focus: false, cursor: false, keepInput: false },
      run: async (code) => {
        const out = await lua.doString(code);
        flush();
        return out;
      },
      call: (cbName, data = {}) =>
        new Promise((resolve, reject) => {
          const fn = callbacks.get(cbName);
          if (!fn) return reject(new Error(`no NUI callback "${cbName}" in ${name}`));
          let result: unknown;
          fn(clone(data), (r) => {
            result = clone(r);
          });
          flush();
          resolve(result);
        }),
      callLater: (cbName, data = {}) =>
        new Promise((resolve, reject) => {
          const fn = callbacks.get(cbName);
          if (!fn) return reject(new Error(`no NUI callback "${cbName}" in ${name}`));
          fn(clone(data), (r) => resolve(clone(r)));
          flush();
        }),
      kvp: new Map(startOptions.kvp ?? []),
      commands: new Map(),
      keyMappings: new Map(),
      serverEvents: [],
      exports: new Map(),
      callPending: (cbName, data = {}) => {
        const fn = callbacks.get(cbName);
        if (!fn) throw new Error(`no NUI callback "${cbName}" in ${name}`);
        const state: { done: boolean; result: any } = { done: false, result: undefined };
        fn(clone(data), (r) => {
          state.done = true;
          state.result = clone(r);
        });
        flush();
        return state;
      },
      surfaces: () => [...res.messages].reverse().find((m) => m.action === "nuikit:surfaces")?.data?.surfaces ?? {},
    };
    const g = lua.global;
    g.set("GetCurrentResourceName", () => name);
    g.set("GetConvar", (_k: string, d: string) => d);
    g.set("GetConvarInt", (_k: string, d: number) => d);
    g.set("print", (...a: unknown[]) => { if (process.env.LUADBG) console.log(name, ...a); });
    // Natives return nothing (wasmoon can't push some JS values back into Lua).
    g.set("SendNUIMessage", (m: { action: string; data: unknown }) => {
      res.messages.push(clone(m) as any);
      options.onNuiMessage?.(name, clone(m));
    });
    g.set("RegisterNUICallback", (n: string, fn: any) => {
      callbacks.set(n, fn);
    });
    g.set("SetNuiFocus", (focus: boolean, cursor: boolean) => {
      Object.assign(res.focus, { focus, cursor });
      Object.assign(nui, { focus, cursor, owner: focus ? name : nui.owner === name ? null : nui.owner });
    });
    g.set("SetNuiFocusKeepInput", (keepInput: boolean) => {
      Object.assign(res.focus, { keepInput });
      nui.keepInput = keepInput;
    });
    g.set("AddEventHandler", (event: string, fn: any) => {
      const list = handlers.get(event) ?? [];
      list.push({ resource: name, fn });
      handlers.set(event, list);
    });
    g.set("TriggerEvent", (event: string, ...args: unknown[]) => {
      triggerFrom(name, event, ...args);
    });
    g.set("json", {
      encode: (v: unknown) => JSON.stringify(v ?? null),
      decode: (s: string) => clone(JSON.parse(s)),
    });
    g.set("GetResourceKvpString", (k: string) => res.kvp.get(k));
    g.set("SetResourceKvp", (k: string, v: string) => {
      res.kvp.set(k, String(v));
    });
    g.set("DeleteResourceKvp", (k: string) => {
      res.kvp.delete(k);
    });
    g.set("SetTimeout", (ms: number, fn: () => void) => {
      timers.push({ resource: name, ms, fn });
    });
    g.set("RegisterCommand", (cmd: string, fn: any) => {
      res.commands.set(cmd, fn);
    });
    // key mappings: recorded, so a test can read the default key
    g.set("RegisterKeyMapping", (cmd: string, _desc: string, _mapper: string, key: string) => {
      res.keyMappings.set(cmd, key);
    });
    g.set("TriggerServerEvent", (event: string, ...args: unknown[]) => {
      res.serverEvents.push({ event, args: args.map(clone) });
    });
    g.set("__globalState", (k: string) => clone(globalState.get(k)));
    g.set("__playerGet", (k: string) => clone(playerState.get(k)));
    // bag:set runs the change handlers (before the value lands, as in FiveM), then stores it
    g.set("__playerSet", (k: string, v: unknown) => {
      for (const h of [...playerHandlers]) if (h.key === k && resources.has(h.resource)) h.fn("player:1", k, clone(v));
      playerState.set(k, clone(v));
    });
    g.set("AddStateBagChangeHandler", (key: string, bag: string, fn: any) => {
      if (bag === "global") bagHandlers.push({ resource: name, key, fn });
      else if (bag == null || bag === "player:1") playerHandlers.push({ resource: name, key, fn });
    });
    g.set("GetInvokingResource", () => invoker);
    // Resource natives over the resources started in this client (tests can override in `before`).
    g.set("GetResourceState", (r: string) => (r === stopping ? "stopping" : resources.has(r) ? "started" : "missing"));
    g.set("GetNumResources", () => resources.size);
    g.set("GetResourceByFindIndex", (i: number) => [...resources.keys()][i]);
    g.set("GetNumResourceMetadata", (r: string, key: string) => metadata.get(r)?.[key]?.length ?? 0);
    g.set("GetResourceMetadata", (r: string, key: string, i: number) => metadata.get(r)?.[key]?.[i]);
    g.set("GetGameTimer", () => Math.floor(performance.now()));
    metadata.set(name, startOptions.metadata ?? {});
    g.set("RegisterNetEvent", (event: string, fn?: any) => {
      if (!fn) return;
      const list = handlers.get(event) ?? [];
      list.push({ resource: name, fn });
      handlers.set(event, list);
    });
    resources.set(name, res);
    // exports('name', fn) registers; exports.<resource>:<name>(...) calls another resource's export
    // (the callee sees GetInvokingResource() == the caller, as in FiveM).
    g.set("__exportCall", (target: string, exportName: string, ...args: unknown[]) => {
      const fn = resources.get(target)?.exports.get(exportName);
      if (!fn) throw new Error(`no export "${exportName}" in ${target}`);
      const outer = invoker;
      invoker = name;
      try {
        // Functions (callbacks) cross as references, as FiveM passes them between resources.
        return clone(fn(...args.map((a) => (typeof a === "function" ? (...x: unknown[]) => void a(...x.map(clone)) : clone(a)))));
      } finally {
        invoker = outer;
      }
    });
    g.set("__exportSet", (exportName: string, fn: (...a: unknown[]) => unknown) => {
      res.exports.set(exportName, fn);
    });
    await lua.doString(`
      GlobalState = setmetatable({}, { __index = function(_, k) return __globalState(k) end })
      LocalPlayer = { state = setmetatable({ set = function(_, k, v) __playerSet(k, v) end }, { __index = function(_, k) return __playerGet(k) end }) }
      exports = setmetatable({}, {
        __call = function(_, name, fn) __exportSet(name, fn) end,
        __index = function(_, target)
          return setmetatable({}, { __index = function(_, name)
            return function(_, ...) return __exportCall(target, name, ...) end
          end })
        end,
      })
    `);
    if (startOptions.before) await lua.doString(startOptions.before);
    // The nuikit resource's lib/ (packages/core/lua), for @nuikit/init.lua and intents.lua's schema.
    g.set("__nuikitLib", (file: string) => {
      if (startOptions.runtimeMissing) return undefined;
      const m = /^lib\/([\w.-]+)\.lua$/.exec(file);
      return m && m[1] !== "init" && existsSync(luaPath(`${m[1]}.lua`)) ? lua_(`${m[1]}.lua`) : undefined;
    });
    await lua.doString(`
      local prev = LoadResourceFile
      LoadResourceFile = function(r, f)
        if r == 'nuikit' and f:sub(1, 4) == 'lib/' then return __nuikitLib(f) end
        if prev then return prev(r, f) end
      end
      IsDuplicityVersion = IsDuplicityVersion or function() return false end
    `);
    const runtime = startOptions.runtime ?? "vendored";
    if (runtime === "vendored") await lua.doString(SOURCE);
    else if (runtime === "import") {
      g.set("__nuikitInit", lua_("init.lua"));
      await lua.doString(lua_("init.lua"));
    }
    for (const file of startOptions.scripts ?? []) await lua.doString(lua_(file));
    flush();
    trigger("onClientResourceStart", name);
    flush();
    return res;
  }

  /**
   * Stop a resource as FiveM does: onClientResourceStop reaches every handler, the stopping
   * resource's own included (it releases focus, closes its surfaces), and only then is its script
   * unloaded, so nothing it registered runs afterwards.
   */
  function stop(name: string) {
    metadata.delete(name);
    stopping = name;
    try {
      // onResourceStop reaches every resource (the stopping one included), with the stopping name.
      for (const h of [...(handlers.get("onResourceStop") ?? [])]) h.fn(name);
      trigger("onClientResourceStop", name);
      flush();
    } finally {
      stopping = undefined;
    }
    for (const [event, list] of handlers) handlers.set(event, list.filter((h) => h.resource !== name));
    for (let i = bagHandlers.length - 1; i >= 0; i--) if (bagHandlers[i]!.resource === name) bagHandlers.splice(i, 1);
    for (let i = timers.length - 1; i >= 0; i--) if (timers[i]!.resource === name) timers.splice(i, 1);
    resources.get(name)?.lua.global.close();
    resources.delete(name);
  }

  /** Which resource currently holds NUI focus (exactly one, or none). */
  function focused(): string | null {
    // NUI focus is one global (last SetNuiFocus wins), as in the game.
    return nui.focus ? nui.owner : null;
  }

  function close() {
    for (const r of resources.values()) r.lua.global.close();
  }

  /** Deliver an event to every resource, as the server's TriggerClientEvent would. */
  function event(name: string, ...args: unknown[]) {
    trigger(name, ...args);
    flush();
  }

  /** The server set GlobalState[key] (replicated): handlers run, then reads see the new value. */
  function setGlobal(key: string, value: unknown) {
    for (const h of [...bagHandlers]) if (h.key === key) h.fn("global", key, clone(value));
    globalState.set(key, value);
    flush();
  }

  /** Fire every pending SetTimeout (time passing). */
  function runTimers() {
    const due = timers.splice(0);
    for (const t of due) t.fn();
    flush();
  }

  return { start, stop, focused, nui, close, event, resources, setGlobal, runTimers };
}
