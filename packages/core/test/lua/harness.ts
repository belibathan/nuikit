/**
 * Runs lua/nuikit.lua in real Lua 5.4 (wasmoon) with the FiveM client natives it uses mocked.
 * Several "resources" share one client. Local events are queued and delivered in order to every
 * resource's handlers once the current Lua call returns (wasmoon can't safely re-enter one engine
 * from inside another). That is the stricter case for nuikit: it must not rely on TriggerEvent
 * being synchronous across resources.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LuaFactory, type LuaEngine } from "wasmoon";

const SOURCE = readFileSync(fileURLToPath(new URL("../../lua/nuikit.lua", import.meta.url)), "utf8");

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
  /** Latest `nuikit:surfaces` payload. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  surfaces(): any;
}

// Lua has no null: drop JSON nulls so wasmoon pushes nil (it chokes on a JS null).
const clone = <T>(v: T): T =>
  v === undefined || v === null ? (undefined as T) : JSON.parse(JSON.stringify(v), (_k, x) => (x === null ? undefined : x));

export async function createClient(options: { syncEvents?: boolean } = {}) {
  const factory = new LuaFactory();
  const handlers = new Map<string, Handler[]>();
  const resources = new Map<string, Resource>();

  const queue: { event: string; args: unknown[] }[] = [];
  function trigger(event: string, ...args: unknown[]) {
    // Synchronous mode: handlers run right away, nested in the caller, like FiveM's local TriggerEvent.
    if (options.syncEvents) deliver(event, args.map(clone));
    else queue.push({ event, args: args.map(clone) });
  }
  function deliver(event: string, args: unknown[]) {
    for (const h of [...(handlers.get(event) ?? [])]) {
      try {
        h.fn(...args.map(clone));
      } catch (e) {
        throw new Error(`${event} → ${h.resource} with ${JSON.stringify(args)}: ${e}`);
      }
    }
  }
  /** Queued mode: deliver everything queued, in order, until nothing new is triggered. */
  function flush() {
    for (let guard = 0; queue.length; guard++) {
      if (guard > 10_000) throw new Error("event loop did not settle");
      const { event, args } = queue.shift()!;
      deliver(event, args);
    }
  }

  async function start(name: string): Promise<Resource> {
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
      surfaces: () => [...res.messages].reverse().find((m) => m.action === "nuikit:surfaces")?.data?.surfaces ?? {},
    };
    const g = lua.global;
    g.set("GetCurrentResourceName", () => name);
    g.set("GetConvarInt", (_k: string, d: number) => d);
    g.set("print", (...a: unknown[]) => { if (process.env.LUADBG) console.log(name, ...a); });
    // Natives return nothing (wasmoon can't push some JS values back into Lua).
    g.set("SendNUIMessage", (m: { action: string; data: unknown }) => {
      res.messages.push(clone(m) as any);
    });
    g.set("RegisterNUICallback", (n: string, fn: any) => {
      callbacks.set(n, fn);
    });
    g.set("SetNuiFocus", (focus: boolean, cursor: boolean) => {
      Object.assign(res.focus, { focus, cursor });
    });
    g.set("SetNuiFocusKeepInput", (keepInput: boolean) => {
      Object.assign(res.focus, { keepInput });
    });
    g.set("AddEventHandler", (event: string, fn: any) => {
      const list = handlers.get(event) ?? [];
      list.push({ resource: name, fn });
      handlers.set(event, list);
    });
    g.set("TriggerEvent", (event: string, ...args: unknown[]) => {
      trigger(event, ...args);
    });
    g.set("json", { encode: (v: unknown) => JSON.stringify(v ?? null) });
    resources.set(name, res);
    await lua.doString(SOURCE);
    flush();
    return res;
  }

  function stop(name: string) {
    for (const [event, list] of handlers) handlers.set(event, list.filter((h) => h.resource !== name));
    trigger("onClientResourceStop", name);
    flush();
    resources.get(name)?.lua.global.close();
    resources.delete(name);
  }

  /** Which resource currently holds NUI focus (exactly one, or none). */
  function focused(): string | null {
    const owners = [...resources.values()].filter((r) => r.focus.focus).map((r) => r.name);
    if (owners.length > 1) throw new Error(`focus held by several resources: ${owners.join(", ")}`);
    return owners[0] ?? null;
  }

  function close() {
    for (const r of resources.values()) r.lua.global.close();
  }

  return { start, stop, focused, close, resources };
}
