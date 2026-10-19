/** English fallbacks: mm_radio's locales/en.json `ui` block, plus labels nuikit adds (ui.nuikit_*). */
const FALLBACK: Record<string, string> = {
  header: "IN RADIO",
  frequency: "Frequency",
  disconnect: "DISCONNECT",
  notconnected: "NOT CONNECTED",
  settings: "Settings",
  channels: "Channels",
  radio: "Radio",
  members: "Members",
  favorites: "Favorites",
  recommended: "Recommended",
  clear: "CLEAR",
  hide_overlay: "HIDE OVERLAY",
  show_overlay: "SHOW OVERLAY",
  save: "SAVE",
  radio_settings: "Radio Settings",
  move_radio: "Move Radio",
  allow_move: "Allow Move",
  overlay_settings: "Overlay Settings",
  enableClicks: "Radio Sound",
  nuikit_name: "Call sign",
  nuikit_size: "Size",
  nuikit_overlay_size: "Overlay size",
  nuikit_volume: "Volume",
  nuikit_no_charge: "No charge",
  nuikit_empty: "Nothing here yet",
  nuikit_jammed: "Jammed",
  nuikit_back: "Back",
  nuikit_join: "Join",
};

/** Look up `ui.<key>`: ox_lib flattens it ("ui.header"); a nested `ui` table works too. */
export function makeT(locale: Record<string, unknown> | undefined) {
  const nested = locale?.ui && typeof locale.ui === "object" ? (locale.ui as Record<string, unknown>) : undefined;
  return (key: string): string => {
    const v = locale?.[`ui.${key}`] ?? nested?.[key];
    return typeof v === "string" ? v : (FALLBACK[key] ?? key);
  };
}

export type T = ReturnType<typeof makeT>;

/** Sentence case for the stock ALL-CAPS labels ("DISCONNECT" → "Disconnect"); other strings untouched. */
export function soft(s: string) {
  return s.length > 1 && s === s.toUpperCase() && /[A-Z]/.test(s) ? s.charAt(0) + s.slice(1).toLowerCase() : s;
}

/** "<label> [<ch> MHz]" when a label matches the exact channel or "<int>.%", else "<ch> MHz". */
export function channelLabel(channel: number | string, names: Record<string, string> | undefined): { label?: string; mhz: string } {
  const text = String(channel);
  const [int, dec] = text.split(".");
  const label = names?.[text] ?? (dec ? names?.[`${int}.%`] : undefined);
  return { label, mhz: `${text} MHz` };
}
