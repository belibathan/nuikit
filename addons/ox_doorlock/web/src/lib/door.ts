// The door as ox_doorlock sends it, the form the editor holds, and the createDoor body
// (docs/ox-doorlock-protocol.md §1 and §2.1).

export type Custom = { areaSize: number | null; speedMultiplier: number | null };
export type Difficulty = "" | "easy" | "medium" | "hard" | Custom;
export type ItemRow = { name: string | null; metadata?: string | null; remove?: boolean | null };
export type GroupRow = { name: string; grade: number | null | undefined };

/** A door from updateDoorData: the fields the editor reads; everything else is passed through. */
export type Door = {
  id: number;
  name?: string;
  zone?: string;
  state?: number | boolean;
  items?: ItemRow[];
  characters?: (string | number)[];
  groups?: Record<string, number>;
  lockpickDifficulty?: Difficulty[];
  [key: string]: unknown;
};

export type Flag = "state" | "doors" | "auto" | "lockpick" | "hideUi" | "holdOpen";

export type Form = {
  id?: number;
  name?: string | null;
  passcode?: string | null;
  autolock?: number | null;
  items: ItemRow[];
  characters: (string | number)[];
  groups: GroupRow[];
  lockpickDifficulty: Difficulty[];
  maxDistance?: number | null;
  doorRate?: number | null;
  lockSound?: string | null;
  unlockSound?: string | null;
  /** state and doors keep what Lua sent (0/1, an array) until toggled, then become booleans. */
  state?: unknown;
  doors?: unknown;
  auto?: boolean | null;
  lockpick?: boolean | null;
  hideUi?: boolean | null;
  holdOpen?: boolean | null;
  [key: string]: unknown;
};

const emptyItem = (): ItemRow => ({ name: "", metadata: "", remove: false });

/** A new door: no id, one empty row per list. */
export const newDoor = (): Form => ({
  name: "",
  passcode: "",
  autolock: 0,
  items: [emptyItem()],
  characters: [""],
  groups: [{ name: "", grade: undefined }],
  lockpickDifficulty: [""],
  maxDistance: 0,
  doorRate: 0,
  lockSound: "",
  unlockSound: "",
  auto: false,
  state: false,
  lockpick: false,
  hideUi: false,
  doors: false,
  holdOpen: false,
});

/** A received door → the form: everything kept, groups as rows, empty lists get one empty row (not groups). */
export function toForm(door: Door): Form {
  return {
    ...door,
    characters: door.characters ? [...door.characters] : [""],
    groups: Object.entries(door.groups ?? {}).map(([name, grade]) => ({ name, grade })),
    items: door.items ? door.items.map((i) => ({ ...i })) : [emptyItem()],
    lockpickDifficulty: door.lockpickDifficulty ? door.lockpickDifficulty.map((d) => (typeof d === "object" ? { ...d } : d)) : [""],
  } as Form;
}

/** Copied settings applied to the form: these fields, an empty name, nothing else (no id: a new door). */
export function applyCopied(c: Form): Form {
  return {
    name: "",
    passcode: c.passcode,
    autolock: c.autolock,
    items: c.items.map((i) => ({ ...i })),
    characters: [...c.characters],
    groups: c.groups.map((g) => ({ ...g })),
    maxDistance: c.maxDistance,
    doorRate: c.doorRate,
    lockSound: c.lockSound,
    unlockSound: c.unlockSound,
    auto: c.auto,
    state: c.state,
    lockpick: c.lockpick,
    hideUi: c.hideUi,
    doors: c.doors,
    lockpickDifficulty: c.lockpickDifficulty.map((d) => (typeof d === "object" ? { ...d } : d)),
    holdOpen: c.holdOpen,
  };
}

const isCustom = (d: Difficulty): d is Custom => typeof d === "object" && d !== null;

/** The createDoor body (protocol §2.1). */
export function toBody(form: Form): Record<string, unknown> {
  const d: Record<string, unknown> = { ...form };
  for (const k of ["name", "passcode", "lockSound", "unlockSound"]) if (d[k] === "") d[k] = null;
  d.autolock = form.autolock || null;
  d.maxDistance = form.maxDistance || 2;
  d.doorRate = form.doorRate ? form.doorRate : null;
  for (const k of ["auto", "lockpick", "hideUi", "holdOpen"]) d[k] = form[k] || null;

  if (form.items.length > 0) {
    d.items = form.items
      .filter((i) => i.name && i.name !== "")
      .map((i) => ({ ...i, ...(i.metadata === "" ? { metadata: null } : {}), remove: i.remove || null }));
  }
  if (form.characters.length > 0) {
    d.characters = form.characters
      .filter((c) => c && c !== "")
      .map((c) => (Number.isNaN(+c) ? c : +c));
  }
  if (form.groups.length > 0) {
    const groups: Record<string, number> = {};
    for (const g of form.groups) if (g.name && g.name !== "") groups[g.name] = g.grade || 0;
    d.groups = groups;
  } else d.groups = null;
  if (form.lockpickDifficulty.length > 0) {
    // a custom row is complete or it isn't sent (the stock editor can't save a half one)
    d.lockpickDifficulty = form.lockpickDifficulty.filter(
      (x) => x !== "" && (!isCustom(x) || (x.areaSize !== null && x.speedMultiplier !== null)),
    );
  }
  return d;
}
