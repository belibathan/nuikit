// illenium-appearance's Lua, faked for browser development. Every callback answers with the shape the
// real handlers return (docs/illenium-appearance-protocol.md §2–4), so every control works in a browser.
// Pick a shop in the bar at the top; press ` for the nuikit devtools. URL: ?shop=barber&tab=hair
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect, useState } from "react";
import { sendMessage, setBrowserHandler } from "@/lib/nui";
import {
  FACE_FEATURES,
  HEAD_OVERLAYS,
  TATTOO_ZONES,
  type Appearance,
  type AppearanceSettings,
  type ComponentSettings,
  type HairSettings,
  type PropSettings,
  type RGB,
  type ShopConfig,
  type Tattoo,
  type Tattoos,
} from "@/lib/types";

// ── palettes (approximations generated here; in game Lua sends the real RGB values)
const hsl = (h: number, s: number, l: number): RGB => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
};
const HAIR: RGB[] = [
  ...Array.from({ length: 10 }, (_, i) => hsl(25, 30 + i * 3, 6 + i * 3.2)), // black → dark brown
  ...Array.from({ length: 10 }, (_, i) => hsl(28 + i, 45, 30 + i * 2.5)), // browns
  ...Array.from({ length: 8 }, (_, i) => hsl(40 + i * 1.5, 55, 52 + i * 4)), // blondes
  ...Array.from({ length: 6 }, (_, i) => hsl(12 + i * 2, 65, 30 + i * 5)), // auburn / ginger
  ...Array.from({ length: 6 }, (_, i) => hsl(30, 6, 45 + i * 9)), // greys → white
  ...Array.from({ length: 24 }, (_, i) => hsl((i * 15 + 280) % 360, 70, 42 + (i % 3) * 8)), // fantasy
];
const MAKEUP: RGB[] = Array.from({ length: 64 }, (_, i) =>
  i < 32 ? hsl((340 + i * 2) % 360, 55 + (i % 4) * 8, 25 + (i % 8) * 6) : hsl((i * 23) % 360, 60, 30 + (i % 5) * 9),
);

// ── content
const MODELS = [
  "mp_m_freemode_01",
  "mp_f_freemode_01",
  "a_m_y_hipster_01",
  "a_m_y_beach_01",
  "a_m_m_business_01",
  "a_f_y_hipster_02",
  "a_f_y_business_01",
  "a_f_m_beach_01",
  "s_m_y_cop_01",
  "s_f_y_cop_01",
  "s_m_m_paramedic_01",
  "s_m_y_fireman_01",
  "g_m_y_ballaorig_01",
  "g_m_y_famca_01",
  "u_m_y_imporage",
  "ig_lestercrest",
  "a_c_husky",
  "a_c_retriever",
  "a_c_cat_01",
  "a_c_chimp",
];

const WORDS = ["Koi", "Rose", "Compass", "Anchor", "Skull", "Dagger", "Lotus", "Wolf", "Raven", "Tiger", "Serpent", "Phoenix", "Mandala", "Script", "Crown", "Swallow", "Lion", "Dragon", "Moth", "Hourglass"];
const STYLES = ["Tribal", "Neo-trad", "Linework", "Blackwork", "Watercolour", "Old school"];
let seq = 0;
const tattoo = (zone: Tattoo["zone"], label: string, opts: Partial<Tattoo> = {}): Tattoo => {
  const n = String(seq++).padStart(3, "0");
  return { name: `TAT_NK_${n}`, label, hashMale: `NK_Tat_${n}_M`, hashFemale: `NK_Tat_${n}_F`, zone, collection: "mpnuikit_overlays", ...opts };
};
const TATTOOS: Tattoos = Object.fromEntries(
  TATTOO_ZONES.map((z, zi) => [
    z,
    Array.from({ length: 18 + zi * 3 }, (_, i) =>
      tattoo(z, `${STYLES[(i + zi) % STYLES.length]} ${WORDS[(i * 3 + zi) % WORDS.length]}`, {
        ...(i % 7 === 3 ? { hashFemale: "" } : {}),
        ...(i % 9 === 5 ? { hashMale: "" } : {}),
        ...(i % 5 === 1 ? { cost: 250 + i * 10 } : {}),
        ...(i === 2 ? { cost: 9999 } : {}), // too expensive: Lua answers false
      }),
    ),
  ]),
);
TATTOOS.ZONE_HAIR = ["None", "Low fade", "Mid fade", "High fade", "Taper", "Shaved sides", "Undercut", "Buzz"].map((l) => tattoo("ZONE_HAIR", l));

// ── shop presets (what client/*.lua passes to startPlayerCustomization)
const BASE: ShopConfig = {
  ped: false,
  headBlend: false,
  faceFeatures: false,
  headOverlays: false,
  components: false,
  props: false,
  tattoos: false,
  componentConfig: { masks: true, upperBody: true, lowerBody: true, bags: true, shoes: true, scarfAndChains: true, bodyArmor: true, shirts: true, decals: true, jackets: true },
  propConfig: { hats: true, glasses: true, ear: true, watches: true, bracelets: true },
  enableExit: true,
  hasTracker: false,
  automaticFade: false,
};
const ALL = { ped: true, headBlend: true, faceFeatures: true, headOverlays: true, components: true, props: true, tattoos: true };
const SHOPS: Record<string, { label: string; config: ShopConfig }> = {
  pedmenu: { label: "Ped menu", config: { ...BASE, ...ALL } },
  newchar: { label: "New character", config: { ...BASE, ...ALL, enableExit: false } },
  clothing: { label: "Clothing", config: { ...BASE, components: true, props: true } },
  barber: { label: "Barber", config: { ...BASE, headOverlays: true } },
  tattoo: { label: "Tattoo", config: { ...BASE, tattoos: true } },
  surgeon: { label: "Surgeon", config: { ...BASE, headBlend: true, faceFeatures: true } },
  tracker: { label: "Clothing (tracker)", config: { ...BASE, components: true, props: true, hasTracker: true, componentConfig: { ...BASE.componentConfig, bodyArmor: false } } },
};

// ── a fake ped
const COMPONENTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const PROPS = [0, 1, 2, 6, 7];
const isFree = (m: string) => m === "mp_m_freemode_01" || m === "mp_f_freemode_01";
const hash = (...n: number[]) => n.reduce((h, x) => (h * 31 + x + 7) % 9973, 17);
const drawables = (model: string, id: number) => (isFree(model) ? [1, 190, 76, 196, 147, 110, 101, 152, 189, 56, 128, 412][id]! : [3, 1, 2, 4, 3, 1, 2, 1, 2, 1, 1, 1][id]!);
const textures = (id: number, d: number) => (d < 0 ? 0 : 1 + (hash(id, d) % 9));
const propDrawables = (model: string, id: number) => (isFree(model) ? ({ 0: 160, 1: 46, 2: 40, 6: 41, 7: 19 } as Record<number, number>)[id]! : 2);

function defaults(model: string): Appearance {
  const female = model === "mp_f_freemode_01";
  const comp = female ? [0, 0, 4, 15, 15, 0, 35, 0, 14, 0, 0, 15] : [0, 0, 2, 15, 61, 0, 34, 0, 15, 0, 0, 252];
  return {
    model,
    headBlend: female
      ? { shapeFirst: 45, shapeSecond: 21, shapeThird: 0, skinFirst: 20, skinSecond: 15, skinThird: 0, shapeMix: 0.3, skinMix: 0.1, thirdMix: 0 }
      : { shapeFirst: 4, shapeSecond: 25, shapeThird: 0, skinFirst: 4, skinSecond: 25, skinThird: 0, shapeMix: 0.6, skinMix: 0.4, thirdMix: 0 },
    faceFeatures: Object.fromEntries(FACE_FEATURES.map((f, i) => [f, i % 5 === 0 ? 0.2 : 0])) as Appearance["faceFeatures"],
    headOverlays: Object.fromEntries(
      HEAD_OVERLAYS.map((o) => [o, o === "eyebrows" ? { style: 6, opacity: 1, color: 2, secondColor: 0 } : o === "beard" && !female ? { style: 10, opacity: 0.8, color: 2, secondColor: 0 } : { style: 0, opacity: 0, color: 0, secondColor: 0 }]),
    ) as Appearance["headOverlays"],
    components: COMPONENTS.map((id) => ({ component_id: id, drawable: isFree(model) ? Math.min(comp[id]!, drawables(model, id) - 1) : 0, texture: 0 })),
    props: PROPS.map((id) => ({ prop_id: id, drawable: id === 1 && !female ? 5 : -1, texture: 0 })),
    hair: { style: female ? 4 : 18, color: 3, highlight: 9, texture: 0 },
    tattoos: model === "mp_m_freemode_01" ? { ZONE_LEFT_ARM: [{ ...TATTOOS.ZONE_LEFT_ARM![0]!, opacity: 0.8 }] } : {},
    eyeColor: 5,
  };
}

let ped = defaults("mp_m_freemode_01");
let shop = "pedmenu";

const componentSettings = (id: number): ComponentSettings => {
  const d = ped.components.find((c) => c.component_id === id)?.drawable ?? 0;
  const free = isFree(ped.model);
  return {
    component_id: id,
    drawable: { min: 0, max: drawables(ped.model, id) - 1 },
    texture: { min: 0, max: textures(id, d) - 1 },
    blacklist: free && id === 11 ? { drawables: [3, 4, 9], textures: d === 0 ? [1] : [] } : { drawables: [], textures: [] },
  };
};
const propSettings = (id: number): PropSettings => {
  const d = ped.props.find((p) => p.prop_id === id)?.drawable ?? -1;
  return {
    prop_id: id,
    drawable: { min: -1, max: propDrawables(ped.model, id) - 1 },
    texture: { min: -1, max: textures(id + 20, d) - 1 },
    blacklist: isFree(ped.model) && id === 0 ? { drawables: [2], textures: [] } : { drawables: [], textures: [] },
  };
};
const hairSettings = (): HairSettings => ({
  style: { min: 0, max: isFree(ped.model) ? (ped.model === "mp_f_freemode_01" ? 80 : 76) : 2 },
  texture: { min: 0, max: hash(ped.hair.style) % 4 },
  color: { items: HAIR },
  highlight: { items: HAIR },
  blacklist: isFree(ped.model) ? { drawables: [23], textures: [] } : { drawables: [], textures: [] },
});
function settings(): AppearanceSettings {
  const male = ped.model === "mp_m_freemode_01" || (!isFree(ped.model) && !ped.model.startsWith("a_f") && !ped.model.startsWith("s_f"));
  const items = Object.fromEntries(Object.entries(TATTOOS).map(([z, list]) => [z, list!.filter((t) => (male ? t.hashMale : t.hashFemale) !== "")]));
  const overlayMax: Record<string, number> = { blemishes: 23, beard: 28, eyebrows: 33, ageing: 14, makeUp: 74, blush: 6, complexion: 11, sunDamage: 10, lipstick: 9, moleAndFreckles: 17, chestHair: 16, bodyBlemishes: 11 };
  const colored: Record<string, RGB[]> = { beard: HAIR, eyebrows: HAIR, chestHair: HAIR, makeUp: MAKEUP, blush: MAKEUP, lipstick: MAKEUP };
  const r = (max: number) => ({ min: 0, max });
  return {
    ped: { model: { items: MODELS } },
    components: COMPONENTS.map(componentSettings),
    props: PROPS.map(propSettings),
    headBlend: {
      shapeFirst: r(45),
      shapeSecond: r(45),
      shapeThird: r(45),
      skinFirst: r(45),
      skinSecond: r(45),
      skinThird: r(45),
      shapeMix: { min: 0, max: 1, factor: 0.1 },
      skinMix: { min: 0, max: 1, factor: 0.1 },
      thirdMix: { min: 0, max: 1, factor: 0.1 },
    },
    faceFeatures: Object.fromEntries(FACE_FEATURES.map((f) => [f, { min: -1, max: 1, factor: 0.1 }])) as AppearanceSettings["faceFeatures"],
    headOverlays: Object.fromEntries(
      HEAD_OVERLAYS.map((o) => [o, { style: r(overlayMax[o]!), opacity: { min: 0, max: 1, factor: 0.1 }, ...(colored[o] ? { color: { items: colored[o] } } : {}) }]),
    ) as AppearanceSettings["headOverlays"],
    hair: hairSettings(),
    eyeColor: r(30),
    tattoos: { items, opacity: { min: 0.1, max: 1, factor: 0.1 } },
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let stored = structuredClone(ped);

async function lua(name: string, body: any): Promise<unknown> {
  switch (name) {
    case "appearance_get_locales":
      return { modal: { accept: "Yes, continue", decline: "Go back" } }; // partial on purpose: the rest falls back
    case "appearance_get_settings":
      return { appearanceSettings: settings() };
    case "appearance_get_data":
      await wait(250);
      stored = structuredClone(ped);
      return { config: SHOPS[shop]!.config, appearanceData: structuredClone(ped) };
    case "appearance_change_model":
      await wait(150);
      ped = defaults(String(body));
      return { appearanceSettings: settings(), appearanceData: structuredClone(ped) };
    case "appearance_change_component":
      ped.components = ped.components.map((c) => (c.component_id === body.component_id ? body : c));
      return componentSettings(body.component_id);
    case "appearance_change_prop":
      ped.props = ped.props.map((p) => (p.prop_id === body.prop_id ? body : p));
      return propSettings(body.prop_id);
    case "appearance_change_hair":
      ped.hair = body;
      return hairSettings();
    case "appearance_change_head_blend":
      ped.headBlend = body;
      return 1;
    case "appearance_change_face_feature":
      ped.faceFeatures = body;
      return 1;
    case "appearance_change_head_overlay":
      ped.headOverlays = body;
      return 1;
    case "appearance_change_eye_color":
      ped.eyeColor = body;
      return 1;
    case "appearance_apply_tattoo": {
      await wait(200);
      if (body?.tattoo && (body.tattoo.cost ?? 100) > 5000) return false; // server: not enough cash
      ped.tattoos = body?.updatedTattoos ?? body;
      return true;
    }
    case "appearance_delete_tattoo":
      ped.tattoos = body;
      return 1;
    case "appearance_save":
      ped = structuredClone(body);
      setTimeout(() => sendMessage("appearance_hide"), 300);
      return 1;
    case "appearance_exit":
      ped = structuredClone(stored);
      setTimeout(() => sendMessage("appearance_hide"), 300);
      return 1;
    default:
      return 1; // set_camera, rotate_camera, turn_around, rotate_left/right, wear/remove_clothes, preview_tattoo
  }
}

declare global {
  interface Window {
    __posts?: { name: string; body: unknown }[];
    __openShop?: (id: string) => void;
  }
}

const mocks = defineMocks({ events: { appearance_display: [{ asynchronous: false }, { asynchronous: true }], appearance_hide: [{}] } as never });

let started = false;

function open(id: string) {
  shop = SHOPS[id] ? id : "pedmenu";
  if (id === "newchar") ped = defaults("mp_f_freemode_01");
  sendMessage("appearance_hide");
  setTimeout(() => sendMessage("appearance_display", { asynchronous: false }), 30);
}

export default function Dev() {
  const [current, setCurrent] = useState(shop);
  useEffect(() => {
    window.__posts = [];
    const onPost = (e: Event) => window.__posts!.push((e as CustomEvent).detail);
    window.addEventListener("appearance:post", onPost);
    setBrowserHandler(lua);
    window.__openShop = (id) => {
      setCurrent(id);
      open(id);
    };
    if (!started) {
      started = true; // StrictMode mounts effects twice; open once
      window.__openShop(new URLSearchParams(location.search).get("shop") ?? "pedmenu");
    }
    return () => {
      window.removeEventListener("appearance:post", onPost);
      setBrowserHandler(undefined);
    };
  }, []);

  return (
    <>
      <div className="fixed top-3 left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-lg border bg-background/80 p-1 text-xs shadow backdrop-blur" data-dev-bar="">
        {Object.entries(SHOPS).map(([id, s]) => (
          <button
            key={id}
            onClick={() => window.__openShop!(id)}
            className={`rounded-md px-2 py-1 ${current === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <NuiDevtools events={mocks.events} scene="dusk" />
    </>
  );
}
