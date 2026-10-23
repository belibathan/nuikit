import type { DomainSpec } from "./types";

/** Host: one page renders many resources' modules (docs/host.md). */
export default {
  js: "host",
  lua: "host",
  title: "Host",
  doc: "One frame renders many resources' UIs as modules; each falls back to its own ui_page.",
  docs: "docs/host.md",
  entries: [
    { name: "create", kind: "call", doc: "The host page runtime.", js: "createHost", only: "js only: the host page", since: "0.5.0" },
    { name: "defineModule", kind: "call", doc: "A resource's UI as a module.", js: "defineModule", only: "js only: pages", since: "0.5.0" },
    { name: "defineReactModule", kind: "call", doc: "A module from a React App.", js: "defineReactModule", only: "js only: pages", since: "0.5.0" },
    { name: "mountStandalone", kind: "call", doc: "Mount a module as its own page.", js: "mountStandalone", only: "js only: pages", since: "0.5.0" },
    { name: "standalone", kind: "call", doc: "ui_page boot: render unless the host adopted this resource.", js: "standalone", only: "js only: pages", since: "0.5.0" },
    { name: "context", kind: "call", doc: "The hosted context, or null on a page of its own.", js: "hostedContext", only: "js only: pages", since: "0.5.0" },
    { name: "scope", kind: "call", doc: "Scope a module's stylesheet.", js: "scopeStylesheet", also: ["scopeSelector", "splitSelectors", "hoist"], only: "js only: the host page", since: "0.5.0" },
    { name: "modules", kind: "call", doc: "Hosted resources (tooling).", lua: "nk.host.modules", impl: "NUI.hostModules", scope: "nuikit", only: "lua only: the nuikit resource hosts", since: "0.5.0" },
    { name: "isHosted", kind: "call", doc: "This resource's UI is rendered by the host.", lua: "nk.host.isHosted", impl: "function() return rawget(nk, 'hosted') == true end", only: "lua only: the page asks nuikit:host:mode", since: "0.5.0" },
  ],
  events: [
    { name: "nuikit:host:mode", dir: "page→lua", payload: "{}", reply: "{ hosted: boolean }", sender: "runtime", doc: "Own ui_page asks whether to render.", since: "0.5.0" },
    { name: "nuikit:host:call", dir: "page→lua", payload: "{ t: string; n: string; d?: unknown }", reply: "unknown", sender: "nuikit", doc: "A hosted module's fetchNui, forwarded.", since: "0.5.0" },
    { name: "nuikit:host:ready", dir: "page→lua", payload: "{}", reply: "{ ok: boolean }", sender: "nuikit", doc: "The host page loaded.", since: "0.5.0" },
    { name: "nuikit:host:error", dir: "page→lua", payload: "{ resource: string; message: string }", reply: "{ ok: boolean }", sender: "nuikit", doc: "A module failed to mount.", since: "0.5.0" },
    { name: "nuikit:host:adopted", dir: "lua→page", payload: "undefined", sender: "runtime", doc: "Own ui_page: stay empty, the host renders.", since: "0.5.0" },
    { name: "nuikit:host:fallback", dir: "lua→page", payload: "undefined", sender: "runtime", doc: "Own ui_page: render, the host is gone.", since: "0.5.0" },
    { name: "nuikit:host:hello", dir: "local", payload: "(resource: string)", sender: "owner", doc: "A resource with a module started.", since: "0.5.0" },
    { name: "nuikit:host:adopt", dir: "local", payload: "(resource: string)", sender: "nuikit", doc: "The host adopts a resource.", since: "0.5.0" },
    { name: "nuikit:host:send", dir: "local", payload: "(action: string, data: unknown)", sender: "owner", doc: "A hosted resource's message, through the host.", since: "0.5.0" },
    { name: "nuikit:host:forward", dir: "local", payload: "(resource, id, name, payload)", sender: "nuikit", doc: "A module's call, to its resource.", since: "0.5.0" },
    { name: "nuikit:host:reply", dir: "local", payload: "(id: string, result: unknown)", sender: "owner", doc: "The resource's reply, to the host.", since: "0.5.0" },
  ],
  legacy: [{ old: "NUI.hostModules", now: "nk.host.modules", removeIn: "1.0.0" }, { old: "NUI.hosted", now: "nk.host.isHosted", removeIn: "1.0.0" }],
  rules: ["Only the nuikit resource can adopt or call in (GetInvokingResource)."],
} satisfies DomainSpec;
