import { useEffect, useMemo, useRef, useState } from "react";
import { CopyIcon, DoorClosedIcon, LockIcon, LockOpenIcon, MapPinIcon, PlusIcon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { EdgeSheet, EdgeSheetBody, EdgeSheetFooter } from "@/components/ui/edge-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { NumberField, SelectField, TextField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ActionBar, ActionBarItem } from "@/components/ui/action-bar";
import { MenuRow } from "@/components/ui/menu-row";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/selection-tabs";
import { applyCopied, newDoor, toBody, toForm, type Custom, type Difficulty, type Door, type Flag, type Form } from "@/lib/door";
import { post, useMessages } from "@/lib/nui";
import { loadServerTheme } from "@/lib/theme";

/** ox_doorlock's door editor. Protocol: docs/ox-doorlock-protocol.md */

type Section = "general" | "characters" | "groups" | "items" | "lockpick" | "sound";
const SECTIONS: [Section, string][] = [
  ["general", "General"],
  ["characters", "Characters"],
  ["groups", "Groups"],
  ["items", "Items"],
  ["lockpick", "Lockpick"],
  ["sound", "Sound"],
];

const FLAGS: [Flag, string, string][] = [
  ["state", "Locked", "Locked by default"],
  ["doors", "Double door", "The door has two leaves"],
  ["auto", "Automatic", "Moves by itself: garages, gates, poles"],
  ["lockpick", "Lockpick", "Can be picked; set the skill checks in Lockpick"],
  ["hideUi", "Hide UI", "No indicator on this door"],
  ["holdOpen", "Hold open", "Stays open while unlocked"],
];

const DIFFICULTY = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "custom", label: "Custom" },
];

/** updateDoorData: every door (array or object keyed by id), one door (upsert) or an id (removed). */
function updateDoors(doors: Door[], data: unknown): Door[] {
  if (typeof data === "number") return doors.filter((d) => d.id !== data);
  if (!data || typeof data !== "object") return doors;
  if ("id" in data) {
    const door = data as Door;
    const i = doors.findIndex((d) => d.id == door.id);
    return i < 0 ? [...doors, door] : doors.map((d, j) => (j === i ? door : d));
  }
  return Object.values(data as Record<string, Door>).filter((d) => d && typeof d === "object");
}

const label = (d: { name?: unknown }) => (typeof d.name === "string" && d.name ? d.name : "Unnamed door");
const locked = (state: unknown) => state === 1 || state === true;
const clampVolume = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1);
const num = (s: string) => (s.trim() === "" || Number.isNaN(+s) ? null : +s);

/** One editable row of a list section: the controls, then a remove button. */
function Row({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2">
      {children}
      <Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground" aria-label="Remove row" onClick={onRemove}>
        <XIcon />
      </Button>
    </div>
  );
}

function AddRow({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="sm" className="-ml-2 self-start text-muted-foreground" onClick={onClick}>
      <PlusIcon />
      {children}
    </Button>
  );
}

export default function App() {
  const [visible, setVisible] = useState(false);
  const [doors, setDoors] = useState<Door[]>([]);
  const [sounds, setSounds] = useState<string[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [section, setSection] = useState<Section>("general");
  const [clipboard, setClipboard] = useState<Form | null>(null);
  const [confirm, setConfirm] = useState<{ id: number; name: string; back: boolean } | null>(null);
  const [query, setQuery] = useState("");

  const doorsRef = useRef(doors);
  doorsRef.current = doors;

  useMessages((action, data) => {
    switch (action) {
      case "updateDoorData":
        setDoors((d) => updateDoors(d, data));
        break;
      case "setSoundFiles":
        if (Array.isArray(data)) setSounds(data.filter((s): s is string => typeof s === "string" && s !== ""));
        break;
      case "setVisible": {
        const door = typeof data === "number" ? doorsRef.current.find((d) => d.id === data) : undefined;
        setForm(door ? toForm(door) : null);
        setSection("general");
        setConfirm(null);
        setVisible(true);
        break;
      }
      case "playSound": {
        const s = data as { sound?: unknown; volume?: unknown } | null;
        if (!s || typeof s.sound !== "string") break;
        const audio = new Audio(`./sounds/${s.sound}.ogg`);
        audio.volume = clampVolume(s.volume);
        void audio.play().catch(() => {});
        break;
      }
    }
  });

  /** Hide, then tell Lua (exit releases focus; createDoor and teleportToDoor release it too). */
  const leave = (name: "exit" | "createDoor" | "teleportToDoor", body?: unknown) => {
    setVisible(false);
    setConfirm(null);
    void post(name, body);
  };

  // Escape: a dialog or an open select closes first (no POST); otherwise the editor closes (exit).
  const popupOnKeydown = useRef(false);
  const state = useRef({ visible, confirm });
  state.current = { visible, confirm };
  useEffect(() => {
    void loadServerTheme();
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") popupOnKeydown.current = !!document.querySelector('[data-slot="select-content"]');
    };
    const up = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !state.current.visible) return;
      if (popupOnKeydown.current) return void (popupOnKeydown.current = false);
      if (state.current.confirm) return setConfirm(null);
      leave("exit");
    };
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doors;
    return doors.filter((d) => [d.name, d.zone].some((v) => typeof v === "string" && v.toLowerCase().includes(q)));
  }, [doors, query]);

  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const toggle = (k: Flag) => setForm((f) => (f ? { ...f, [k]: !f[k] } : f));
  const open = (door: Door) => {
    setForm(toForm(door));
    setSection("general");
  };
  const copy = (door: Door) => {
    setClipboard(toForm(door));
    void post("notify", "Settings copied");
  };
  const remove = () => {
    if (!confirm) return;
    void post("deleteDoor", confirm.id);
    if (confirm.back) setForm(null);
    setConfirm(null);
  };

  const editing = form !== null;
  const lockpickOff = !form?.lockpick;
  const tab: Section = section === "lockpick" && lockpickOff ? "general" : section;

  return (
    <>
      <EdgeSheet
        open={visible}
        side="right"
        width="38rem"
        page={editing ? `door-${form.id ?? "new"}` : "list"}
        icon={<DoorClosedIcon />}
        title={editing ? (form.id === undefined ? "New door" : label(form)) : "Doors"}
        description={
          editing
            ? form.id === undefined
              ? "Confirm, then aim at the door and click it"
              : [`#${form.id}`, typeof form.zone === "string" ? form.zone : ""].filter(Boolean).join(" · ")
            : `${doors.length} ${doors.length === 1 ? "door" : "doors"}`
        }
        onBack={editing ? () => setForm(null) : undefined}
        actions={
          !editing && (
            <Button
              size="sm"
              onClick={() => {
                setForm(newDoor());
                setSection("general");
              }}
            >
              <PlusIcon />
              New door
            </Button>
          )
        }
      >
        {!editing ? (
          <>
            <div className="relative pt-4">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 mt-2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name or zone" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <EdgeSheetBody scroll>
              {shown.length === 0 ? (
                <EmptyState
                  title={doors.length === 0 ? "No doors yet" : "No doors match"}
                  description={doors.length === 0 ? "Add one with New door, then aim at it in the world." : "Try another name or zone."}
                />
              ) : (
                <div className="flex flex-col">
                  {shown.map((door) => (
                    <MenuRow
                      key={door.id}
                      icon={locked(door.state) ? <LockIcon /> : <LockOpenIcon />}
                      description={typeof door.zone === "string" ? door.zone : undefined}
                      meta={`#${door.id}`}
                      onClick={() => open(door)}
                      actions={
                        <>
                          <Button variant="ghost" size="icon-sm" aria-label="Copy settings" title="Copy settings" onClick={() => copy(door)}>
                            <CopyIcon />
                          </Button>
                          <Button variant="ghost" size="icon-sm" aria-label="Teleport to door" title="Teleport to door" onClick={() => leave("teleportToDoor", door.id)}>
                            <MapPinIcon />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Delete door"
                            title="Delete door"
                            onClick={() => setConfirm({ id: door.id, name: label(door), back: false })}
                          >
                            <Trash2Icon />
                          </Button>
                        </>
                      }
                    >
                      {label(door)}
                    </MenuRow>
                  ))}
                </div>
              )}
            </EdgeSheetBody>
            <EdgeSheetFooter className="justify-end">
              <ActionBar>
                <ActionBarItem keys={["Esc"]} label="Close" onClick={() => leave("exit")} />
              </ActionBar>
            </EdgeSheetFooter>
          </>
        ) : (
          <>
            <Tabs value={tab} onValueChange={(v) => setSection(v as Section)} className="pt-4">
              <TabsList className="w-full justify-start">
                {SECTIONS.map(([value, name]) => (
                  <TabsTrigger key={value} value={value} disabled={value === "lockpick" && lockpickOff} className="flex-none">
                    {name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <EdgeSheetBody scroll key={tab}>
              {tab === "general" && (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <TextField label="Name" value={form.name ?? ""} onValueChange={(name) => set({ name })} />
                    <TextField label="Passcode" hint="Optional" value={form.passcode ?? ""} onValueChange={(passcode) => set({ passcode })} />
                    <NumberField label="Autolock" hint="Seconds" min={0} step={1} stepper={false} value={form.autolock || null} onValueChange={(autolock) => set({ autolock })} />
                    <NumberField
                      label="Interact distance"
                      hint="Metres"
                      min={0}
                      step={0.1}
                      precision={1}
                      stepper={false}
                      placeholder="2"
                      value={form.maxDistance || null}
                      onValueChange={(maxDistance) => set({ maxDistance })}
                    />
                    <NumberField
                      className="col-span-2"
                      label="Door rate"
                      hint="Automatic doors"
                      description="How fast an automatic door moves."
                      min={0}
                      step={0.1}
                      precision={1}
                      stepper={false}
                      value={form.doorRate || null}
                      onValueChange={(doorRate) => set({ doorRate })}
                    />
                  </div>
                  <div className="flex flex-col">
                    {FLAGS.map(([key, name, description]) => (
                      <MenuRow key={key} description={description} checked={!!form[key]} onCheckedChange={() => toggle(key)}>
                        {name}
                      </MenuRow>
                    ))}
                  </div>
                </div>
              )}

              {tab === "characters" && (
                <div className="flex flex-col gap-2">
                  <p className="nk-body text-muted-foreground">Characters who can always use this door.</p>
                  {form.characters.map((c, i) => (
                    <Row key={i} onRemove={() => set({ characters: form.characters.filter((_, j) => j !== i) })}>
                      <Input
                        placeholder="Character id"
                        value={String(c ?? "")}
                        onChange={(e) => set({ characters: form.characters.map((x, j) => (j === i ? e.target.value : x)) })}
                      />
                    </Row>
                  ))}
                  <AddRow onClick={() => set({ characters: [...form.characters, ""] })}>Add character</AddRow>
                </div>
              )}

              {tab === "groups" && (
                <div className="flex flex-col gap-2">
                  <p className="nk-body text-muted-foreground">Jobs or gangs that can use it, from a minimum grade.</p>
                  {form.groups.map((g, i) => (
                    <Row key={i} onRemove={() => set({ groups: form.groups.filter((_, j) => j !== i) })}>
                      <Input
                        placeholder="Group"
                        value={g.name}
                        onChange={(e) => set({ groups: form.groups.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                      />
                      <Input
                        className="w-28 shrink-0"
                        type="number"
                        min={0}
                        placeholder="Grade"
                        value={g.grade ?? ""}
                        onChange={(e) => set({ groups: form.groups.map((x, j) => (j === i ? { ...x, grade: num(e.target.value) } : x)) })}
                      />
                    </Row>
                  ))}
                  <AddRow onClick={() => set({ groups: [...form.groups, { name: "", grade: undefined }] })}>Add group</AddRow>
                </div>
              )}

              {tab === "items" && (
                <div className="flex flex-col gap-2">
                  <p className="nk-body text-muted-foreground">Items that open it. Metadata type narrows it to keys of one kind.</p>
                  {form.items.map((it, i) => {
                    const patch = (p: Partial<typeof it>) => set({ items: form.items.map((x, j) => (j === i ? { ...x, ...p } : x)) });
                    return (
                      <Row key={i} onRemove={() => set({ items: form.items.filter((_, j) => j !== i) })}>
                        <Input placeholder="Item" value={it.name ?? ""} onChange={(e) => patch({ name: e.target.value })} />
                        <Input placeholder="Metadata type" value={it.metadata ?? ""} onChange={(e) => patch({ metadata: e.target.value })} />
                        <label className="flex shrink-0 items-center gap-2 pl-1 text-sm text-muted-foreground">
                          <Switch checked={!!it.remove} onCheckedChange={(remove) => patch({ remove })} />
                          Remove
                        </label>
                      </Row>
                    );
                  })}
                  <AddRow onClick={() => set({ items: [...form.items, { name: "", metadata: "", remove: false }] })}>Add item</AddRow>
                </div>
              )}

              {tab === "lockpick" && (
                <div className="flex flex-col gap-2">
                  <p className="nk-body text-muted-foreground">The skill checks a lockpick runs, in order. None: the server's default.</p>
                  {form.lockpickDifficulty.map((d, i) => {
                    const put = (v: Difficulty) => set({ lockpickDifficulty: form.lockpickDifficulty.map((x, j) => (j === i ? v : x)) });
                    const custom = typeof d === "object" ? (d as Custom) : null;
                    return (
                      <Row key={i} onRemove={() => set({ lockpickDifficulty: form.lockpickDifficulty.filter((_, j) => j !== i) })}>
                        <Select
                          value={custom ? "custom" : (d as string) || undefined}
                          onValueChange={(v) => put(v === "custom" ? (custom ?? { areaSize: null, speedMultiplier: null }) : (v as Difficulty))}
                        >
                          <SelectTrigger className="w-36 shrink-0">
                            <SelectValue placeholder="Difficulty" />
                          </SelectTrigger>
                          <SelectContent>
                            {DIFFICULTY.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {custom && (
                          <>
                            <Input
                              type="number"
                              min={0}
                              max={360}
                              placeholder="Area (°)"
                              title="Skill check area size in degrees"
                              value={custom.areaSize ?? ""}
                              onChange={(e) => put({ ...custom, areaSize: num(e.target.value) })}
                            />
                            <Input
                              type="number"
                              step={0.05}
                              placeholder="Speed ×"
                              title="Indicator speed multiplier"
                              value={custom.speedMultiplier ?? ""}
                              onChange={(e) => put({ ...custom, speedMultiplier: num(e.target.value) })}
                            />
                          </>
                        )}
                        {!custom && <div className="flex-1" />}
                      </Row>
                    );
                  })}
                  <AddRow onClick={() => set({ lockpickDifficulty: [...form.lockpickDifficulty, ""] })}>Add skill check</AddRow>
                </div>
              )}

              {tab === "sound" && (
                <div className="flex flex-col gap-4">
                  <SelectField
                    label="Lock sound"
                    placeholder="Default"
                    clearable
                    options={sounds.map((s) => ({ value: s }))}
                    value={form.lockSound || null}
                    onValueChange={(lockSound) => set({ lockSound })}
                  />
                  <SelectField
                    label="Unlock sound"
                    placeholder="Default"
                    clearable
                    options={sounds.map((s) => ({ value: s }))}
                    value={form.unlockSound || null}
                    onValueChange={(unlockSound) => set({ unlockSound })}
                  />
                </div>
              )}
            </EdgeSheetBody>
            <EdgeSheetFooter>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                aria-label="Delete door"
                title="Delete door"
                disabled={form.id === undefined}
                onClick={() => form.id !== undefined && setConfirm({ id: form.id, name: label(form), back: true })}
              >
                <Trash2Icon />
              </Button>
              <Button
                variant="outline"
                disabled={!clipboard}
                title={clipboard ? "Apply copied settings (as a new door)" : "No door settings copied"}
                onClick={() => {
                  if (!clipboard) return;
                  setForm(applyCopied(clipboard));
                  void post("notify", "Settings applied");
                }}
              >
                <CopyIcon />
                Paste settings
              </Button>
              <Button size="lg" className="ml-auto" onClick={() => leave("createDoor", toBody(form))}>
                {form.id === undefined ? "Place door" : "Save door"}
              </Button>
            </EdgeSheetFooter>
          </>
        )}
      </EdgeSheet>

      {visible && confirm && (
        <div className="fixed inset-0 z-50">
          <Confirm
            tone="destructive"
            title={`Delete ${confirm.name}?`}
            description="It unlocks and its settings are gone for every player. This can't be undone."
            confirmLabel="Delete"
            onConfirm={remove}
            onCancel={() => setConfirm(null)}
          />
        </div>
      )}
    </>
  );
}
