// The status row (both layouts), built from the kit's VitalChip (components/ui/vital-chip): the keycap
// (its default shape: a Tile face over a plate that slides out with the label, the level as a liquid in the
// face), or a shape path per chip (/hudstyle), and a pop.
//
// Voice first, the vitals, the radio channel last (the 0.7 order and look). Each vital shows on change or
// past its threshold, then fades back (vitals.tsx useShown); a change pops a flag from the chip's side
// with its name and the difference ("Hunger +25"), so pops of vitals that change together never overlap.
// (A comms-first hierarchy was tried and shelved, see docs/design.md.)
//
// The style comes from the theme tokens (--nk-vital-chip-icon, --nk-vital-chip-display) and a player's override (/hudstyle, kept in KVP by client/style.lua and sent as
// `hud:style`). Icon + level + the critical state, never colour alone; the value is in aria-valuenow.
import { onNui } from "nuikit-core";
import { fetchNui, Stagger, usePlayer, useSlots, useStaggerItem, type NuiPlayer, type Slot } from "nuikit-core/react";
import { BriefcaseIcon, CircleIcon, MicIcon, PhoneIcon, RadioIcon, ShieldIcon, type LucideIcon } from "lucide-react";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motionLevel } from "nuikit-core/motion";
import { flipRow, FOLD_EASE, FOLD_MS, FOLDED, inlineDelay } from "./flip";
import type { HudSettings, VitalMode } from "../nui";
import { VitalChip } from "@/components/ui/vital-chip";
import { ICONS, LABELS, useShown, vitalCritical, type Tone } from "./vitals";
import { restDelay } from "./situation";

type PopMode = false | "change" | "threshold";

interface VitalProps {
  tone: Tone;
  value: number | undefined;
  mode: VitalMode;
  low: number;
  high: number;
  linger: number;
  pop: PopMode;
  force: { by: number; nonce: number } | null;
  /** how the chip draws (Config.styles vitals.display): icons, value, pill (label + value) or expand */
  display?: VitalDisplay;
}

export type VitalDisplay = "icons" | "value" | "pill" | "expand";

// Roles (tokens 1.4): the wrapper carries data-hue="<vital>", and kit.css gives it --hue-solid from
// --role-<vital>; --vital-<tone> only for a page without the 1.4 kit.
const roleColour = (tone: Tone) => ({ "--vital": `var(--hue-solid, var(--vital-${tone}))` }) as CSSProperties;

/** One vital: the icon in a chip whose level shows the value; a pop when it changes. Memoised: a change to
 *  one vital (or the money) re-renders that chip only. */
export const VitalItem = memo(function VitalItem({ tone, value, mode, low, high, linger, pop, force, display = "icons" }: VitalProps) {
  const v = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  // value and pill keep their label open; expand opens it on a change and settles after the theme's
  // --nk-behavior-rest (the vitals' linger when that is 0); those three show the change there, not as a pop
  const expanded = useExpanded(`${v}:${force?.nonce ?? 0}`, linger);
  // one variant: a tag tucks out from behind the keycap on a change (or stays out for pill / value)
  const open = display === "value" || display === "pill" || expanded;
  void pop;
  const critical = value !== undefined && vitalCritical(tone, v, low, high);
  const shownByRule = useShown(value === undefined ? undefined : v, mode, critical, linger);
  // a pop keeps the chip on screen while it shows (a test pop on a hidden vital included)
  const shown = (shownByRule || open) && mode !== false && value !== undefined;
  // in sequence with the vitals that come or go with it (the row is a <Stagger>)
  const stagger = useStaggerItem<HTMLDivElement>(shown);
  const box = useRef<HTMLDivElement | null>(null);
  const ref = useCallback(
    (n: HTMLDivElement | null) => {
      box.current = n;
      stagger(n);
    },
    [stagger],
  );
  useFold(box, shown);
  return (
    <VitalChip.Root ref={ref} data-slot="hud-vital" data-tone={tone} data-shown={shown || undefined} value={v} tone={tone} alert={critical} open={open} display="auto" className="hud-vchip" aria-hidden={!shown} role="meter" aria-label={`${LABELS[tone]} ${v}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} style={critical ? undefined : roleColour(tone)}>
      <VitalChip.Shape>
        <VitalChip.Icon>{ICONS[tone]}</VitalChip.Icon>
        <VitalChip.Label>{LABELS[tone]}</VitalChip.Label>
      </VitalChip.Shape>
    </VitalChip.Root>
  );
});

/** Voice: the primary key, always there; lit while talking; the range name slides out when it changes. */
function VoiceChip({ voice, linger }: { voice: NuiPlayer["voice"]; linger: number }) {
  const range = voice.mode ?? (voice.range === undefined ? undefined : `${Math.round(voice.range * 10) / 10} m`);
  const expanded = useExpanded(range, linger);
  if (range === undefined) return null;
  return (
    <VitalChip.Root data-slot="hud-voice" data-shown active={voice.talking === true} open={expanded} display="auto" className="hud-vchip" aria-label={voice.talking ? `Talking, ${range}` : `Voice range ${range}`}>
      <VitalChip.Shape>
        <VitalChip.Icon>
          <MicIcon />
        </VitalChip.Icon>
        <VitalChip.Label>{range}</VitalChip.Label>
      </VitalChip.Shape>
    </VitalChip.Root>
  );
}

/** The radio channel, while on one: the plate stays out with the channel. */
function RadioChip({ radio }: { radio: number | string }) {
  return (
    <VitalChip.Root data-slot="hud-radio" data-shown open display="auto" className="hud-vchip" aria-label={`Radio ${radio} MHz`}>
      <VitalChip.Shape>
        <VitalChip.Icon>
          <RadioIcon />
        </VitalChip.Icon>
        <VitalChip.Label>
          <span className="nk-num">{String(radio)}</span>
        </VitalChip.Label>
      </VitalChip.Shape>
    </VitalChip.Root>
  );
}

/** A player's style override (/hudstyle): the token set on <html>, so every chip reads them. */
const TOKENS = { icon: "--nk-vital-chip-icon" } as const;
type StyleOverride = Partial<Record<keyof typeof TOKENS, string>> | null;
function applyStyle(s: StyleOverride) {
  const root = document.documentElement.style;
  for (const [k, token] of Object.entries(TOKENS)) {
    const v = s?.[k as keyof typeof TOKENS];
    if (v) root.setProperty(token, v);
    else root.removeProperty(token);
  }
}

/** Overrides from Lua: the stored one when the page loads, then every /hudstyle. Test pops (/hudpop). */
function useHudStyle() {
  const [force, setForce] = useState<Partial<Record<Tone, { by: number; nonce: number }>>>({});
  useEffect(() => {
    void fetchNui("hud:style:get" as never)
      .then((r: unknown) => applyStyle((r as { style?: StyleOverride } | null)?.style ?? null))
      .catch(() => {});
    const offStyle = onNui("hud:style" as never, (s: unknown) => applyStyle(s as StyleOverride));
    const offPop = onNui("hud:pop" as never, (p: unknown) => {
      const { tone, by } = (p ?? {}) as { tone?: Tone; by?: number };
      if (!tone || !Number.isFinite(by)) return;
      setForce((f) => ({ ...f, [tone]: { by: Number(by), nonce: (f[tone]?.nonce ?? 0) + 1 } }));
    });
    return () => {
      offStyle();
      offPop();
    };
  }, []);
  return force;
}

/** The status row: voice, the vitals, the radio channel. */
export function VitalsRow({ settings, layout }: { settings: HudSettings; layout: "compact" | "classic" }) {
  // its own subscription: a vital changing re-renders this row (and only the chips that changed), not the HUD
  const player = usePlayer();
  const force = useHudStyle();
  // other resources' chips in this cluster (docs/slots.md: nuikit_voice's range, radio and call, a job's indicator)
  const slots = useSlots("vitals");
  const cfg = settings.vitals ?? {};
  if (cfg.enabled === false) return null;
  const low = cfg.low ?? 25;
  const high = cfg.high ?? 60;
  const linger = cfg.linger ?? 5000;
  const pop: PopMode = cfg.pop === undefined ? "change" : cfg.pop;
  const needs = settings.needs !== false;
  // the player's visibility (styles vitals.visibility): "always" wins over every rule that hides a vital (its
  // auto mode and linger, the voice tuck, a situation's retract); only a vital the server turned off stays off
  const visibility = (settings.styles?.["vitals.visibility"] as string | undefined) ?? "always";
  const mode = (m: VitalMode | undefined): VitalMode => (m === false ? false : visibility === "always" ? "always" : (m ?? "auto"));
  // nuikit_voice draws voice as slots: then the HUD's own voice and radio chips step aside, so voice shows once
  const voiceSlots = slots.some((s) => s.resource === VOICE_RESOURCE);
  const voice = settings.voice !== false && !voiceSlots ? player.voice : undefined;
  const talking = player.voice?.talking === true;
  // styles (Config.styles, /hud edit): how the chips draw, and whether they tuck behind voice while talking
  const display = (settings.styles?.["vitals.display"] as VitalDisplay | undefined) ?? "icons";
  const collapse = visibility === "voice" && talking;
  const common = { low, high, linger, pop };
  const item = (tone: Tone, value: number | undefined, m: VitalMode | undefined, extra?: Partial<VitalProps>) => (
    <VitalItem tone={tone} value={value} mode={mode(m)} {...common} force={force[tone] ?? null} display={display} {...extra} />
  );
  return (
    <Stagger step={45} budget={300}>
    <div data-slot="hud-vitals" data-layout={layout} data-display={display} data-collapsed={collapse || undefined} className="hud-vitals-row" style={{} as CSSProperties}>
      {voice && <VoiceChip voice={voice} linger={linger} />}
      {item("health", player.health, cfg.health)}
      {item("armor", player.armor, cfg.armor, { low: -1 })}
      {needs && item("hunger", player.hunger, cfg.hunger)}
      {needs && item("thirst", player.thirst, cfg.thirst)}
      {needs && item("stress", player.stress, cfg.stress)}
      {voice?.radio !== undefined && <RadioChip radio={voice.radio} />}
      {slots.map((s) => (
        <SlotChip key={`${s.resource}:${s.key}`} slot={s} display={display} linger={linger} />
      ))}
    </div>
    </Stagger>
  );
}

/** The compact preset's vitals (bottom left, or beside a map in that corner). */
export function VitalsCompact({ settings }: { settings: HudSettings }) {
  return <VitalsRow settings={settings} layout="compact" />;
}

/** At most this many tags are out at once; the rest wait their turn (a change still shows once a slot frees). */
const MAX_TAGS = 2;
const tagWaiting: (() => void)[] = [];
let tagsOut = 0;
const tagRelease = () => {
  tagsOut = Math.max(0, tagsOut - 1);
  tagWaiting.shift()?.();
};

/** A tag is out for a while after the value changes (not on the first value), within the MAX_TAGS budget. */
function useExpanded(value: number | string | undefined, linger: number) {
  const [on, setOn] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (value === undefined) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const ms = restDelay();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let holding = false;
    let dead = false;
    const start = () => {
      if (dead) return;
      holding = true;
      tagsOut++;
      setOn(true);
      timer = setTimeout(() => {
        holding = false;
        setOn(false);
        tagRelease();
      }, Number.isFinite(ms) ? ms : linger);
    };
    if (tagsOut < MAX_TAGS) start();
    else tagWaiting.push(start);
    return () => {
      dead = true;
      clearTimeout(timer);
      const i = tagWaiting.indexOf(start);
      if (i >= 0) tagWaiting.splice(i, 1);
      if (holding) tagRelease();
    };
  }, [value, linger]);
  return on;
}

/** The resource whose slots carry voice (nuikit_voice: pma-voice's range, radio, call). */
const VOICE_RESOURCE = "nuikit_voice";

/** A slot's `icon` name → the glyph; an unknown name draws a dot. */
const SLOT_ICONS: Record<string, LucideIcon> = { mic: MicIcon, radio: RadioIcon, phone: PhoneIcon, briefcase: BriefcaseIcon, job: BriefcaseIcon, shield: ShieldIcon };

/**
 * A chip another resource put in the vitals cluster (NUI.slot('vitals', …)): drawn and folded by the
 * same rules as a vital (the display style, the voice collapse), coloured by its `hue` role, its
 * `level` (0–1) as the chip's level and its `value` (or label) where a vital shows its number.
 */
const SlotChip = memo(function SlotChip({ slot, display, linger }: { slot: Slot; display: VitalDisplay; linger: number }) {
  const Icon = (slot.icon && SLOT_ICONS[slot.icon]) || CircleIcon;
  const value = slot.value !== undefined && slot.value !== "" ? String(slot.value) : undefined;
  // a voice range opens on a change, like a vital; a channel or a call keeps its plate out
  const expanded = useExpanded(value, linger);
  const open = !!value && (slot.key === "range" ? expanded : true);
  void display;
  const level = typeof slot.level === "number" ? Math.max(0, Math.min(1, slot.level)) : undefined;
  return (
    <VitalChip.Root
      data-slot="hud-slot"
      data-key={`${slot.resource}:${slot.key}`}
      data-voice={slot.resource === VOICE_RESOURCE || undefined}
      data-shown
      value={level === undefined ? undefined : level * 100}
      tone={slot.hue}
      active={slot.active === true}
      alert={slot.alert === true}
      open={open}
      display="auto"
      className="hud-vchip"
      aria-label={[slot.label, value].filter(Boolean).join(" ")}
      style={{ "--vital": "var(--hue-solid, currentColor)" } as CSSProperties}
    >
      <VitalChip.Shape>
        <VitalChip.Icon>
          <Icon />
        </VitalChip.Icon>
        {value !== undefined && (
          <VitalChip.Label>
            <span className="nk-num">{value}</span>
          </VitalChip.Label>
        )}
      </VitalChip.Shape>
    </VitalChip.Root>
  );
});

/**
 * A chip folds away and back with transform and opacity only (hud.css); it leaves the row's layout
 * (data-gone) once folded, and joins it again before unfolding, each time with its neighbours sliding
 * over by FLIP (flip.ts). The row's width never animates, so nothing lays out per frame.
 */
function useFold(box: { current: HTMLElement | null }, shown: boolean) {
  const first = useRef(true);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    if (first.current) {
      first.current = false;
      if (!shown) el.dataset.gone = "";
      return;
    }
    if (shown) {
      if (el.dataset.gone === undefined) return;
      flipRow(el.parentElement, () => delete el.dataset.gone);
      // out of display: none a CSS transition has nothing to start from: the unfold is animated here
      if (motionLevel(el) !== "off") el.animate([{ opacity: 0, transform: FOLDED }, { opacity: 1, transform: "none" }], { duration: FOLD_MS, delay: inlineDelay(el), easing: FOLD_EASE, fill: "backwards" });
      return;
    }
    const t = setTimeout(() => flipRow(el.parentElement, () => (el.dataset.gone = "")), FOLD_MS + inlineDelay(el));
    return () => clearTimeout(t);
  }, [shown, box]);
}
