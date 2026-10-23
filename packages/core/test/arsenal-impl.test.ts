// Every event the arsenal declares is implemented: Lua sends what it says goes to the page, answers what the page
// calls, and the local/net events are both triggered and handled somewhere in the runtime or the nuikit resource.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import arsenal from "../arsenal.json";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const read = (dir: string, ext: RegExp): string[] =>
  readdirSync(repo + dir).flatMap((f) => {
    const p = `${dir}/${f}`;
    if (/node_modules|dist|\/lib$|\/test$/.test(p)) return [];
    return statSync(repo + p).isDirectory() ? read(p, ext) : ext.test(f) ? [readFileSync(repo + p, "utf8")] : [];
  });
const lua = [...read("packages/core/lua", /\.lua$/), ...read("systems", /\.lua$/), ...read("adapters", /\.lua$/)].join("\n");
const js = [...read("packages/core/src", /\.tsx?$/), ...read("systems", /\.(ts|tsx|js)$/), ...read("registry/nuikit", /\.tsx?$/)].join("\n");

type Ev = { name: string; wire?: string; dir: string };
const events = (arsenal.domains as { events: Ev[] }[]).flatMap((d) => d.events);
const wire = (e: Ev) => e.wire ?? e.name;
const lit = (n: string) => new RegExp(`["'\`]${n.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\\\{[^}]+\\\}/g, "[^\"'`]*")}`);
// a name the code builds with a constant table (EV.open = 'nuikit:sf:open') or a prefix ('nuikit:settings:' .. RESOURCE)
const mentioned = (src: string, n: string) => lit(n).test(src) || (n.includes("{") && src.includes(n.slice(0, n.indexOf("{"))));

describe("arsenal events are implemented", () => {
  for (const e of events) {
    const n = wire(e);
    it(`${e.name} (${e.dir}${e.wire ? `, wire ${n}` : ""})`, () => {
      if (e.dir === "lua→page") {
        expect(mentioned(lua, n), "sent by Lua").toBe(true);
        expect(mentioned(js, n) || /host:(adopted|fallback)|nuikit:renderer$/.test(n), "heard by a page").toBe(true);
      } else if (e.dir === "page→lua") {
        expect(mentioned(lua, n), "answered by Lua").toBe(true);
        expect(mentioned(js, n) || mentioned(js, `https://nuikit/${n}`) || mentioned(js, n.replace(/^nuikit:host:/, "")), "called by a page").toBe(true);
      } else {
        const sys = [lua, read("systems/nuikit/server", /\.js$/).join("\n")].join("\n");
        expect(mentioned(sys, n), "triggered and handled").toBe(true);
      }
    });
  }
});
