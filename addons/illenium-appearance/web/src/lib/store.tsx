// All appearance state and every callback, in one place (docs/illenium-appearance-protocol.md §2, §6).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FALLBACK, mergeLocale, type Locale } from "./locale";
import { post, useAppearanceMessage } from "./nui";
import type {
  Appearance,
  AppearanceSettings,
  CameraKey,
  ClothesKey,
  ComponentSettings,
  FaceFeature,
  Hair,
  HairSettings,
  HeadBlendKey,
  HeadOverlay,
  OverlayValue,
  PropSettings,
  ShopConfig,
  Tattoo,
  Tattoos,
  TattooZone,
} from "./types";

const FREEMODE = ["mp_m_freemode_01", "mp_f_freemode_01"];

// Lua tables with holes arrive as objects, empty ones as []. Normalise once at the edge.
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : []) as T[];
function normTattoos(t: unknown): Tattoos {
  if (!t || typeof t !== "object" || Array.isArray(t)) return {};
  const out: Tattoos = {};
  for (const [zone, items] of Object.entries(t)) out[zone as TattooZone] = list<Tattoo>(items);
  return out;
}
function normAppearance(a: Appearance): Appearance {
  return { ...a, components: list(a.components), props: list(a.props), tattoos: normTattoos(a.tattoos) };
}
function normSettings(s: AppearanceSettings): AppearanceSettings {
  return {
    ...s,
    ped: { model: { items: list<string>(s.ped?.model?.items) } },
    components: list(s.components),
    props: list(s.props),
    tattoos: { ...s.tattoos, items: normTattoos(s.tattoos?.items) },
  };
}
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

type Flags = { head: boolean; body: boolean; bottom: boolean };
const NO_FLAGS: Flags = { head: false, body: false, bottom: false };
const NO_ROTATE = { left: false, right: false };
const NO_VIEW = { camera: NO_FLAGS, rotate: NO_ROTATE, clothes: NO_FLAGS };

function useAppearanceState() {
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>(FALLBACK);
  const [config, setConfig] = useState<ShopConfig>();
  const [settings, setSettingsState] = useState<AppearanceSettings>();
  const [stored, setStored] = useState<Appearance>();
  const [current, setCurrentState] = useState<Appearance>();
  // Camera, rotate and clothes toggles (§6). Kept in a ref too, so posts never run inside a state updater.
  const [viewState, setViewState] = useState(NO_VIEW);
  const view = useRef(NO_VIEW);
  const setView = useCallback((v: typeof NO_VIEW) => {
    view.current = v;
    setViewState(v);
  }, []);
  const { camera, rotate, clothes } = viewState;

  // Refs so fast slider drags always build on the newest state, not a stale render.
  const cur = useRef<Appearance | undefined>(undefined);
  const set = useRef<AppearanceSettings | undefined>(undefined);
  const setCurrent = useCallback((a: Appearance | undefined) => {
    cur.current = a;
    setCurrentState(a);
  }, []);
  const setSettings = useCallback((s: AppearanceSettings | undefined) => {
    set.current = s;
    setSettingsState(s);
  }, []);

  // Locales: once from Lua. Asked again on open until an answer has arrived (Lua answers any time).
  const localeLoaded = useRef(false);
  const loadLocale = useCallback(() => {
    void post<unknown>("appearance_get_locales").then((l) => {
      if (!l || typeof l !== "object") return;
      localeLoaded.current = true;
      setLocale(mergeLocale(FALLBACK, l));
    });
  }, []);
  useEffect(loadLocale, [loadLocale]);

  const session = useRef(0);
  useAppearanceMessage<{ asynchronous?: boolean }>("appearance_display", (payload) => {
    const id = ++session.current;
    if (!localeLoaded.current) loadLocale();
    setOpen(true);
    setView({ camera: NO_FLAGS, rotate: NO_ROTATE, clothes: NO_FLAGS });
    const getSettings = () =>
      post<{ appearanceSettings: AppearanceSettings }>("appearance_get_settings").then((r) => {
        if (id === session.current && r?.appearanceSettings) setSettings(normSettings(r.appearanceSettings));
      });
    const getData = () =>
      post<{ config: ShopConfig; appearanceData: Appearance }>("appearance_get_data").then((r) => {
        if (id !== session.current || !r?.appearanceData) return;
        const data = normAppearance(r.appearanceData);
        setConfig(r.config);
        setStored(data);
        setCurrent(clone(data));
      });
    if (payload?.asynchronous) void getSettings().then(getData);
    else void Promise.all([getSettings(), getData()]);
  });

  useAppearanceMessage("appearance_hide", () => {
    session.current++;
    setOpen(false);
    setConfig(undefined);
    setSettings(undefined);
    setStored(undefined);
    setCurrent(undefined);
    setView({ camera: NO_FLAGS, rotate: NO_ROTATE, clothes: NO_FLAGS });
  });

  const isFreemode = !!current && FREEMODE.includes(current.model);
  const isMale = current?.model === "mp_m_freemode_01";

  const actions = useMemo(() => {
    const patch = (fn: (a: Appearance) => Appearance) => {
      if (!cur.current) return undefined;
      const next = fn(cur.current);
      setCurrent(next);
      return next;
    };

    return {
      async changeModel(model: string) {
        const r = await post<{ appearanceSettings: AppearanceSettings; appearanceData: Appearance }>("appearance_change_model", model);
        if (r?.appearanceSettings) setSettings(normSettings(r.appearanceSettings));
        if (r?.appearanceData) setCurrent(normAppearance(r.appearanceData));
      },
      headBlend(key: HeadBlendKey, value: number) {
        const next = patch((a) => ({ ...a, headBlend: { ...a.headBlend, [key]: value } }));
        if (next) void post("appearance_change_head_blend", next.headBlend);
      },
      faceFeature(key: FaceFeature, value: number) {
        const next = patch((a) => ({ ...a, faceFeatures: { ...a.faceFeatures, [key]: value } }));
        if (next) void post("appearance_change_face_feature", next.faceFeatures);
      },
      headOverlay(overlay: HeadOverlay, key: keyof OverlayValue, value: number) {
        const next = patch((a) => ({ ...a, headOverlays: { ...a.headOverlays, [overlay]: { ...a.headOverlays[overlay], [key]: value } } }));
        if (next) void post("appearance_change_head_overlay", next.headOverlays);
      },
      async hair(key: keyof Hair, value: number) {
        const next = patch((a) => ({ ...a, hair: { ...a.hair, [key]: value, ...(key === "style" ? { texture: 0 } : {}) } }));
        if (!next) return;
        const hs = await post<HairSettings>("appearance_change_hair", next.hair);
        if (hs && typeof hs === "object" && set.current) setSettings({ ...set.current, hair: hs });
      },
      eyeColor(value: number) {
        if (patch((a) => ({ ...a, eyeColor: value }))) void post("appearance_change_eye_color", value);
      },
      async component(id: number, key: "drawable" | "texture", value: number) {
        const base = cur.current?.components.find((c) => c.component_id === id);
        if (!base) return;
        const item = key === "drawable" ? { ...base, drawable: value, texture: 0 } : { ...base, texture: value };
        patch((a) => ({ ...a, components: a.components.map((c) => (c.component_id === id ? item : c)) }));
        const cs = await post<ComponentSettings>("appearance_change_component", item);
        if (cs && typeof cs === "object" && set.current) {
          setSettings({ ...set.current, components: set.current.components.map((c) => (c.component_id === id ? cs : c)) });
        }
      },
      async prop(id: number, key: "drawable" | "texture", value: number) {
        const base = cur.current?.props.find((p) => p.prop_id === id);
        if (!base) return;
        const item = key === "drawable" ? { ...base, drawable: value, texture: 0 } : { ...base, texture: value };
        patch((a) => ({ ...a, props: a.props.map((p) => (p.prop_id === id ? item : p)) }));
        const ps = await post<PropSettings>("appearance_change_prop", item);
        if (ps && typeof ps === "object" && set.current) {
          setSettings({ ...set.current, props: set.current.props.map((p) => (p.prop_id === id ? ps : p)) });
        }
      },
      async fade(index: number) {
        const fade = set.current?.tattoos.items.ZONE_HAIR?.[index];
        if (!fade || !cur.current) return;
        const tattoos: Tattoos = { ...cur.current.tattoos, ZONE_HAIR: [fade] };
        await post("appearance_apply_tattoo", tattoos);
        patch((a) => ({ ...a, tattoos }));
      },
      previewTattoo(tattoo: Tattoo, opacity: number) {
        if (!cur.current) return;
        void post("appearance_preview_tattoo", { data: cur.current.tattoos, tattoo: { ...tattoo, opacity } });
      },
      async applyTattoo(tattoo: Tattoo, opacity: number): Promise<boolean> {
        if (!cur.current) return false;
        const t = { ...tattoo, opacity };
        const updatedTattoos = clone(cur.current.tattoos);
        (updatedTattoos[t.zone] ??= []).push(t);
        const ok = await post<boolean>("appearance_apply_tattoo", { tattoo: t, updatedTattoos });
        if (ok === true) patch((a) => ({ ...a, tattoos: updatedTattoos }));
        return ok === true;
      },
      async deleteTattoo(tattoo: Tattoo) {
        if (!cur.current) return;
        const tattoos = clone(cur.current.tattoos);
        tattoos[tattoo.zone] = (tattoos[tattoo.zone] ?? []).filter((t) => t.name !== tattoo.name);
        await post("appearance_delete_tattoo", tattoos);
        patch((a) => ({ ...a, tattoos }));
      },
      async clearTattoos() {
        if (!cur.current) return;
        const tattoos: Tattoos = {};
        for (const [zone, items] of Object.entries(cur.current.tattoos)) tattoos[zone as TattooZone] = zone === "ZONE_HAIR" ? items : [];
        await post("appearance_delete_tattoo", tattoos);
        patch((a) => ({ ...a, tattoos }));
      },
      setCamera(key: CameraKey) {
        const wasActive = view.current.camera[key];
        void post("appearance_set_camera", wasActive ? "default" : key);
        setView({ ...view.current, camera: wasActive ? NO_FLAGS : { ...NO_FLAGS, [key]: true }, rotate: NO_ROTATE });
      },
      rotate(side: "left" | "right") {
        const wasActive = view.current.rotate[side];
        if (wasActive) void post("appearance_set_camera", "current");
        else void post("appearance_rotate_camera", side);
        setView({ ...view.current, rotate: wasActive ? NO_ROTATE : { ...NO_ROTATE, [side]: true } });
      },
      turnAround() {
        void post("appearance_turn_around");
      },
      toggleClothes(key: ClothesKey) {
        const removed = view.current.clothes[key];
        if (removed) void post("appearance_wear_clothes", { data: cur.current, key });
        else void post("appearance_remove_clothes", key);
        setView({ ...view.current, clothes: { ...view.current.clothes, [key]: !removed } });
      },
      turnPed(side: "left" | "right") {
        void post(side === "left" ? "rotate_left" : "rotate_right");
      },
      save() {
        if (cur.current) void post("appearance_save", cur.current);
      },
      exit() {
        void post("appearance_exit");
      },
    };
  }, [setCurrent, setSettings, setView]);

  const ready = open && !!config && !!settings && !!current && !!stored;
  // What "changed" / "revert" compare against: the opening look, unless the model has changed since
  // (a different ped has different drawables, so comparing would mean nothing).
  const baseline = current && stored && current.model === stored.model ? stored : current;
  return { open, ready, locale, config, settings, current, stored, baseline, camera, rotate, clothes, isFreemode, isMale, actions };
}

export type AppearanceState = ReturnType<typeof useAppearanceState>;
export type Actions = AppearanceState["actions"];
const Ctx = createContext<AppearanceState | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const state = useAppearanceState();
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useAppearance() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useAppearance outside AppearanceProvider");
  return s;
}

/** State once loaded: every field present. Only call inside the ready panel. */
export function useLoaded() {
  const s = useAppearance();
  return s as AppearanceState & { config: ShopConfig; settings: AppearanceSettings; current: Appearance; stored: Appearance; baseline: Appearance };
}
