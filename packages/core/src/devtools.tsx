import { useEffect, useState, type ReactNode } from "react";
import {
  closeSurface,
  emit,
  getSurfaces,
  onSurfaces,
  openSurface,
  setSurfaceState,
  getVisible,
  isBrowser,
  mockNui,
  onAnyNui,
  onNuiCall,
  onVisible,
  setVisible,
  type CallbackName,
  type CallbackReq,
  type CallbackRes,
  type EventData,
  type EventName,
} from "./index";

/** Payload presets per event. An array gives you several one-click variants. */
export type EventPresets = { [K in EventName]?: EventData<K> | EventData<K>[] };
export type CallbackMocks = {
  [K in CallbackName]?: CallbackRes<K> | ((data: CallbackReq<K>) => CallbackRes<K> | Promise<CallbackRes<K>>);
};

export interface NuiDevtoolsProps {
  /** Events you can fire from the panel, with example payloads. */
  events?: EventPresets;
  /** Browser responses for fetchNui callbacks. */
  callbacks?: CallbackMocks;
  /** Backdrop behind your UI so you can judge contrast. Default "night". */
  scene?: SceneName | (string & {});
  /** Start with the panel open. */
  defaultOpen?: boolean;
  /** Render even inside the game (you almost never want this). */
  force?: boolean;
  /** Example data per surface for the Surfaces tab's Open button. */
  surfaces?: Record<string, unknown>;
  /** Client-wide states to toggle in the Surfaces tab (as NUI.state would), e.g. ["dead", "cuffed"]. */
  states?: string[];
}

export type SceneName = "none" | "day" | "dusk" | "night" | "grid";

/** Typed helper so presets autocomplete against your NuiEvents / NuiCallbacks. */
export function defineMocks<E extends EventPresets, C extends CallbackMocks>(mocks: { events?: E; callbacks?: C }) {
  return mocks;
}

const SCENES: Record<SceneName, string> = {
  none: "transparent",
  day: "radial-gradient(120% 80% at 70% 0%, #fff8e7 0%, #bfe3ff 28%, #7fb4e6 55%, #6b7f8f 78%, #3d4a52 100%)",
  dusk: "radial-gradient(120% 90% at 30% 100%, #ff9b5e 0%, #c2557a 28%, #4b2e6b 58%, #141029 100%)",
  night:
    "radial-gradient(2px 2px at 12% 72%, #ffd58a 50%, transparent 51%), radial-gradient(2px 2px at 64% 80%, #9fd3ff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 38% 76%, #ffb3d1 50%, transparent 51%), radial-gradient(2px 2px at 82% 70%, #ffd58a 50%, transparent 51%), radial-gradient(140% 70% at 50% 110%, #1d2b4a 0%, #0b1020 55%, #05070d 100%)",
  grid: "linear-gradient(#ffffff0d 1px, transparent 1px) 0 0/40px 40px, linear-gradient(90deg, #ffffff0d 1px, transparent 1px) 0 0/40px 40px, #0a0d14",
};

type LogEntry = { id: number; t: number; kind: "event" | "call"; name: string; data: unknown; response?: unknown };

const css = `
.nkdt{position:fixed;right:16px;bottom:16px;z-index:2147483646;font:12px/1.4 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#e7e9ee;letter-spacing:0}
.nkdt *{box-sizing:border-box}
.nkdt-fab{display:flex;align-items:center;gap:8px;height:34px;padding:0 14px 0 10px;border-radius:999px;border:1px solid #ffffff1f;background:#0a0a0ae6;backdrop-filter:blur(12px);color:inherit;cursor:pointer;box-shadow:0 8px 30px #0008}
.nkdt-fab:hover{border-color:#ffffff40}
.nkdt-gem{width:8px;height:8px;border-radius:2px;background:#fafafa}
.nkdt-panel{width:380px;max-height:min(560px,calc(100vh - 32px));display:flex;flex-direction:column;border-radius:14px;border:1px solid #ffffff1a;background:#0a0a0af2;backdrop-filter:blur(16px);box-shadow:0 20px 60px #000a;overflow:hidden}
.nkdt-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #ffffff12}
.nkdt-title{font-weight:600;flex:1}
.nkdt-title small{color:#8b93a7;font-weight:400;margin-left:6px}
.nkdt-tabs{display:flex;gap:2px;padding:6px;border-bottom:1px solid #ffffff12}
.nkdt-tab{flex:1;height:26px;border:0;border-radius:7px;background:transparent;color:#8b93a7;cursor:pointer;font:inherit}
.nkdt-tab[aria-selected=true]{background:#ffffff12;color:#fff}
.nkdt-body{overflow:auto;padding:10px;display:flex;flex-direction:column;gap:8px}
.nkdt-card{border:1px solid #ffffff12;border-radius:10px;background:#ffffff06;padding:8px}
.nkdt-row{display:flex;align-items:center;gap:6px}
.nkdt-name{font:500 12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#e5e5e5;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nkdt-btn{height:24px;padding:0 10px;border-radius:7px;border:1px solid #ffffff1f;background:#ffffff0d;color:#e7e9ee;cursor:pointer;font:inherit}
.nkdt-btn:hover{background:#ffffff1a}
.nkdt-btn.p{border:0;background:#fafafa;color:#0a0a0a;font-weight:600}
.nkdt-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.nkdt-chip{height:20px;padding:0 8px;border-radius:999px;border:1px solid #ffffff1a;background:transparent;color:#aab2c5;cursor:pointer;font:inherit;font-size:11px}
.nkdt-chip:hover{color:#fff;border-color:#ffffff40}
.nkdt-ta{width:100%;min-height:64px;margin-top:6px;resize:vertical;border-radius:8px;border:1px solid #ffffff14;background:#050505;color:#d6dbe6;padding:6px 8px;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;outline:none}
.nkdt-ta:focus{border-color:#ffffff40}
.nkdt-err{color:#fda4af;font-size:11px;margin-top:4px}
.nkdt-log{font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;display:flex;flex-direction:column;gap:4px}
.nkdt-log div{padding:6px 8px;border-radius:8px;background:#ffffff06;border:1px solid #ffffff0d;word-break:break-word}
.nkdt-k{display:inline-block;min-width:34px;font-weight:600}
.nkdt-k.e{color:#67e8f9}.nkdt-k.c{color:#f0abfc}
.nkdt-dim{color:#6b7385}
.nkdt-scenes{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.nkdt-scene{aspect-ratio:16/10;border-radius:8px;border:1px solid #ffffff1a;cursor:pointer;position:relative}
.nkdt-scene[aria-pressed=true]{outline:2px solid #fafafa;outline-offset:1px}
.nkdt-scene span{position:absolute;left:5px;bottom:3px;font-size:10px;color:#fff;text-shadow:0 1px 2px #000}
.nkdt-toggle{display:flex;align-items:center;justify-content:space-between}
.nkdt-switch{width:34px;height:20px;border-radius:999px;border:0;background:#ffffff1f;position:relative;cursor:pointer}
.nkdt-switch::after{content:"";position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .15s}
.nkdt-switch[aria-checked=true]{background:#fafafa}.nkdt-switch[aria-checked=true]::after{background:#0a0a0a}
.nkdt-switch[aria-checked=true]::after{transform:translateX(14px)}
.nkdt-kbd{font:10px ui-monospace,monospace;color:#8b93a7;border:1px solid #ffffff1f;border-radius:4px;padding:0 4px}
.nkdt-scene-bg{position:fixed;inset:0;z-index:-1;pointer-events:none}
`;

let seq = 0;

/**
 * Browser-only devtools: fire Lua events, mock callbacks, watch traffic, swap backdrops.
 * Renders nothing inside the game, so it's safe to leave mounted.
 *
 *   <NuiDevtools events={{ "hud:vitals": [{ health: 100 }, { health: 12 }] }} />
 */
export function NuiDevtools({
  events = {},
  callbacks = {},
  scene: initialScene = "night",
  defaultOpen = false,
  force,
  surfaces: surfaceData = {},
  states: stateNames = ["dead"],
}: NuiDevtoolsProps) {
  const enabled = force || isBrowser();
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<"events" | "surfaces" | "log" | "scene">("events");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [scene, setScene] = useState<string>(() => {
    try {
      return localStorage.getItem("nuikit:scene") ?? initialScene;
    } catch {
      return initialScene;
    }
  });
  const [visible, setVis] = useState(getVisible());

  useEffect(() => {
    if (!enabled) return;
    const offs = Object.entries(callbacks).map(([name, res]) => mockNui(name, res as never));
    return () => offs.forEach((o) => o());
  }, [enabled, callbacks]);

  useEffect(() => {
    if (!enabled) return;
    const push = (e: Omit<LogEntry, "id" | "t">) => setLog((l) => [{ ...e, id: ++seq, t: Date.now() }, ...l].slice(0, 100));
    const a = onAnyNui((m) => push({ kind: "event", name: m.action, data: m.data }));
    const b = onNuiCall((c) => push({ kind: "call", name: c.name, data: c.data, response: c.response }));
    const c = onVisible(setVis);
    return () => {
      a();
      b();
      c();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.key === "`") setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);

  useEffect(() => {
    try {
      localStorage.setItem("nuikit:scene", scene);
    } catch {
      /* private mode */
    }
  }, [scene]);

  if (!enabled) return null;

  const background = (SCENES as Record<string, string>)[scene] ?? `center/cover no-repeat url(${JSON.stringify(scene)})`;

  return (
    <>
      <style>{css}</style>
      {scene !== "none" && <div className="nkdt-scene-bg" style={{ background }} aria-hidden />}
      <div className="nkdt" data-nuikit-devtools="">
        {!open ? (
          <button className="nkdt-fab" onClick={() => setOpen(true)} title="nuikit devtools (`)">
            <span className="nkdt-gem" />
            nuikit
            <span className="nkdt-kbd">`</span>
          </button>
        ) : (
          <div className="nkdt-panel" role="dialog" aria-label="nuikit devtools">
            <div className="nkdt-head">
              <span className="nkdt-gem" />
              <span className="nkdt-title">
                nuikit<small>browser mode</small>
              </span>
              <button className="nkdt-btn" onClick={() => setOpen(false)} aria-label="Close devtools">
                ✕
              </button>
            </div>
            <div className="nkdt-tabs" role="tablist">
              {(["events", "surfaces", "log", "scene"] as const).map((t) => (
                <button key={t} className="nkdt-tab" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                  {t === "events" ? "Events" : t === "surfaces" ? "Surfaces" : t === "log" ? `Log${log.length ? ` · ${log.length}` : ""}` : "Scene"}
                </button>
              ))}
            </div>
            <div className="nkdt-body">
              {tab === "events" && (
                <>
                  <Toggle label="UI visible (NUI.open / NUI.close)" checked={visible} onChange={setVisible} />
                  {Object.keys(events).length === 0 && (
                    <p className="nkdt-dim">
                      Pass <code>events</code> to {"<NuiDevtools />"} to get one-click payloads here.
                    </p>
                  )}
                  {Object.entries(events).map(([name, preset]) => (
                    <EventCard key={name} name={name} presets={Array.isArray(preset) ? preset : [preset]} />
                  ))}
                  <CustomEvent />
                </>
              )}
              {tab === "surfaces" && <SurfacesTab data={surfaceData} stateNames={stateNames} />}
              {tab === "log" && (
                <div className="nkdt-log">
                  {log.length === 0 && <span className="nkdt-dim">Nothing yet. Fire an event or call fetchNui.</span>}
                  {log.map((e) => (
                    <div key={e.id}>
                      <span className={`nkdt-k ${e.kind === "event" ? "e" : "c"}`}>{e.kind === "event" ? "LUA→" : "→LUA"}</span>{" "}
                      {e.name} <span className="nkdt-dim">{short(e.data)}</span>
                      {e.kind === "call" && <span className="nkdt-dim"> ⇐ {short(e.response)}</span>}
                    </div>
                  ))}
                  {log.length > 0 && (
                    <button className="nkdt-btn" onClick={() => setLog([])}>
                      Clear
                    </button>
                  )}
                </div>
              )}
              {tab === "scene" && (
                <>
                  <div className="nkdt-scenes">
                    {(Object.keys(SCENES) as SceneName[]).map((s) => (
                      <button
                        key={s}
                        className="nkdt-scene"
                        aria-pressed={scene === s}
                        style={{ background: s === "none" ? "repeating-conic-gradient(#222 0 25%, #333 0 50%) 0 0/10px 10px" : SCENES[s] }}
                        onClick={() => setScene(s)}
                      >
                        <span>{s}</span>
                      </button>
                    ))}
                  </div>
                  <p className="nkdt-dim">Check your UI against a bright sky and a dark street. Pass any image URL as the <code>scene</code> prop to use a real screenshot.</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function SurfacesTab({ data, stateNames }: { data: Record<string, unknown>; stateNames: string[] }) {
  const [snap, setSnap] = useState(getSurfaces());
  useEffect(() => onSurfaces(() => setSnap(getSurfaces())), []);
  const entries = Object.entries(snap.surfaces).sort(([, a], [, b]) => (b.z ?? 0) - (a.z ?? 0) || (a.open === b.open ? 0 : a.open ? -1 : 1));
  const names = [...new Set([...stateNames, ...Object.keys(snap.states)])];
  return (
    <>
      {entries.length === 0 && (
        <p className="nkdt-dim">
          No surfaces yet. Render a {"<Surface name=…>"} or call defineSurface(); Lua declares them with NUI.surface().
        </p>
      )}
      {entries.map(([name, s]) => (
        <div className="nkdt-card" key={name}>
          <div className="nkdt-row">
            <span className="nkdt-name">
              {name} <span className="nkdt-dim">{s.layer}</span>
            </span>
            <button className={`nkdt-btn${s.open ? "" : " p"}`} onClick={() => (s.open ? closeSurface(name) : openSurface(name, data[name] as never))}>
              {s.open ? "Close" : "Open"}
            </button>
          </div>
          {s.open && (
            <div className="nkdt-chips">
              <span className="nkdt-chip" style={{ cursor: "default" }}>z {s.z}</span>
              {s.focused && <span className="nkdt-chip" style={{ cursor: "default", color: "#fff" }}>focus</span>}
              {!s.visible && <span className="nkdt-chip" style={{ cursor: "default" }}>hidden</span>}
            </div>
          )}
        </div>
      ))}
      <div className="nkdt-card">
        <span className="nkdt-dim">States (NUI.state)</span>
        {names.map((n) => (
          <Toggle key={n} label={n} checked={Boolean(snap.states[n])} onChange={(v) => setSurfaceState(n, v)} />
        ))}
      </div>
      <p className="nkdt-dim">Escape closes the top surface that takes input, like in game.</p>
    </>
  );
}

function EventCard({ name, presets }: { name: string; presets: unknown[] }) {
  const [text, setText] = useState(() => pretty(presets[0]));
  const [error, setError] = useState<string | null>(null);
  const fire = (payload?: unknown) => {
    try {
      const data = payload !== undefined ? payload : JSON.parse(text || "null");
      emit(name, data as never);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="nkdt-card">
      <div className="nkdt-row">
        <span className="nkdt-name">{name}</span>
        <button className="nkdt-btn p" onClick={() => fire()}>
          Send
        </button>
      </div>
      {presets.length > 1 && (
        <div className="nkdt-chips">
          {presets.map((p, i) => (
            <button
              key={i}
              className="nkdt-chip"
              onClick={() => {
                setText(pretty(p));
                fire(p);
              }}
            >
              {label(p, i)}
            </button>
          ))}
        </div>
      )}
      <textarea className="nkdt-ta" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} />
      {error && <div className="nkdt-err">{error}</div>}
    </div>
  );
}

function CustomEvent() {
  const [name, setName] = useState("");
  return (
    <div className="nkdt-card">
      <div className="nkdt-row">
        <input
          className="nkdt-ta"
          style={{ minHeight: 0, height: 26, margin: 0 }}
          placeholder="any:event"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {name && <EventCard key={name} name={name} presets={[{}]} />}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="nkdt-toggle">
      <span>{label}</span>
      <button className="nkdt-switch" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} />
    </div>
  );
}

const pretty = (v: unknown) => JSON.stringify(v, null, 2) ?? "";
const short = (v: unknown) => {
  const s = JSON.stringify(v);
  return s === undefined ? "" : s.length > 80 ? s.slice(0, 77) + "…" : s;
};
function label(p: unknown, i: number) {
  if (p && typeof p === "object") {
    const first = Object.entries(p as object)[0];
    if (first) return `${first[0]}: ${typeof first[1] === "object" ? "…" : String(first[1])}`;
  }
  return p === undefined ? `#${i + 1}` : String(p);
}

export default NuiDevtools;

