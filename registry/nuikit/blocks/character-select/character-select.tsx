import * as React from "react"
import { fetchNui, Surface } from "nuikit-core/react"
import {
  BuildingIcon,
  Building2Icon,
  HistoryIcon,
  HospitalIcon,
  HotelIcon,
  HouseIcon,
  type LucideIcon,
  MapPinIcon,
  PalmtreeIcon,
  PlaneIcon,
  PlusIcon,
  ShieldIcon,
  TrainFrontIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Confirm } from "@/components/ui/confirm"
import { DateField, SelectField, TextField } from "@/components/ui/form-field"
import { MenuRow } from "@/components/ui/menu-row"
import { Money } from "@/components/ui/money"
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel"
import { PlayerCard, initials } from "@/components/ui/player-card"
import { Spinner } from "@/components/ui/spinner"

import type { CharacterAnswer, CharacterSelectData, CharacterSummary, NewCharacter, SpawnIcon } from "./nui"

/**
 * CharacterSelect — who to play: the player's characters in their slots (empty ones offer
 * Create), the chosen one as a PlayerCard with Play and Delete (behind a destructive Confirm), the
 * spawn points after Play, and a create form. Lua and the server decide every step. Built from
 * the kit: Panel, MenuRow, PlayerCard, Money, Confirm, TextField / DateField / SelectField (from
 * form-field), with stock Avatar, Button and Spinner.
 *
 *   <CharacterSelectSurface />                          // wired: nk.surface('character-select', …)
 *   <CharacterSelect data={data} onPlay={…} />          // a still, or your own wiring
 *
 * It's the whole screen at join (Escape does nothing: there's nowhere to go back to), so Escape
 * steps back inside it: from the confirm, the spawn list or the form to the characters.
 */
function CharacterSelectSurface() {
  const fail = (): CharacterAnswer => ({ ok: false, error: "The server didn't answer. Try again." })
  const back = React.useRef<() => void>(() => {})
  return (
    <Surface name="character-select" layer="modal" exclusive escape="back" onBack={() => back.current()}>
      {(data) =>
        data ? (
          <CharacterSelect
            data={data}
            onBack={(fn) => (back.current = fn)}
            onPlay={(id, spawn) => fetchNui("character:play", { id, spawn }).catch(fail)}
            onCreate={(c) => fetchNui("character:create", c).catch(fail)}
            onDelete={(id) => fetchNui("character:delete", { id }).catch(fail)}
          />
        ) : null
      }
    </Surface>
  )
}

const SPAWN_ICONS: Record<SpawnIcon, LucideIcon> = {
  last: HistoryIcon,
  house: HouseIcon,
  apartment: Building2Icon,
  hotel: HotelIcon,
  airport: PlaneIcon,
  station: TrainFrontIcon,
  police: ShieldIcon,
  hospital: HospitalIcon,
  beach: PalmtreeIcon,
  city: BuildingIcon,
}

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

const fullName = (c: Pick<CharacterSummary, "firstName" | "lastName">) => `${c.firstName} ${c.lastName}`

const NAME = /^[\p{L}][\p{L}' -]*$/u

/** A date `years` years before `today`, as "YYYY-MM-DD". */
function yearsAgo(today: Date, years: number) {
  const d = new Date(Date.UTC(today.getUTCFullYear() - years, today.getUTCMonth(), today.getUTCDate()))
  return d.toISOString().slice(0, 10)
}

/**
 * What's wrong with a new character, per field (the same rules the template's server checks):
 * names of 2–20 letters (spaces, hyphens and apostrophes inside), an age from 18 to 100, a gender
 * from the list.
 */
function newCharacterErrors(c: Partial<NewCharacter>, genders: readonly string[], today = new Date()) {
  const errors: Partial<Record<keyof NewCharacter, string>> = {}
  for (const key of ["firstName", "lastName"] as const) {
    const v = (c[key] ?? "").trim()
    if (!v) errors[key] = "Enter a name."
    else if (v.length < 2 || v.length > 20) errors[key] = "Use 2 to 20 letters."
    else if (!NAME.test(v)) errors[key] = "Use letters, spaces, hyphens and apostrophes."
  }
  const b = c.birthdate ?? ""
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b) || Number.isNaN(Date.parse(b))) errors.birthdate = "Enter a date of birth."
  else if (b > yearsAgo(today, 18)) errors.birthdate = "Characters are 18 or older."
  else if (b < yearsAgo(today, 100)) errors.birthdate = "Characters are 100 or younger."
  if (!c.gender || !genders.includes(c.gender)) errors.gender = "Pick one."
  return errors
}

type Step = "characters" | "spawn" | "create"

function CharacterSelect({
  data,
  onPlay,
  onCreate,
  onDelete,
  onBack,
  autoFocus = true,
  defaultSelected,
  defaultStep = "characters",
  confirming: confirmingProp,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children" | "onPlay"> & {
  data: CharacterSelectData
  /** Play this character (at this spawn point, when there are some). */
  onPlay?: (id: string, spawn?: string) => Promise<CharacterAnswer> | void
  onCreate?: (character: NewCharacter) => Promise<CharacterAnswer> | void
  onDelete?: (id: string) => Promise<CharacterAnswer> | void
  /** Gives the surface what Escape should do now (step back inside the screen). */
  onBack?: (fn: () => void) => void
  /** Focus the first character when it opens (off for stills next to other content). */
  autoFocus?: boolean
  /** Stills: the character, the step, and the delete confirm to start on. */
  defaultSelected?: string
  defaultStep?: Step
  confirming?: boolean
}) {
  const characters = list(data.characters)
  const spawns = list(data.spawns)
  const genders = list(data.genders).length ? list(data.genders) : ["Male", "Female", "Other"]
  const [selectedId, setSelectedId] = React.useState(defaultSelected ?? characters[0]?.id)
  const [step, setStep] = React.useState<Step>(defaultStep)
  const [spawn, setSpawn] = React.useState(spawns[0]?.id)
  const [confirming, setConfirming] = React.useState(!!confirmingProp)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<Partial<NewCharacter>>({})
  const [tried, setTried] = React.useState(false)
  const root = React.useRef<HTMLDivElement>(null)

  const selected = characters.find((c) => c.id === selectedId)
  const free = Math.max(0, data.slots - characters.length)
  const errors = newCharacterErrors(form, genders)
  const formOk = Object.keys(errors).length === 0

  // A character that's gone (deleted, or a fresh snapshot without it): pick the first again.
  React.useEffect(() => {
    if (selectedId && !characters.some((c) => c.id === selectedId)) setSelectedId(characters[0]?.id)
  }, [characters, selectedId])

  // Escape steps back inside the screen.
  React.useEffect(() => {
    onBack?.(() => {
      if (busy) return
      if (confirming) setConfirming(false)
      else if (step !== "characters") setStep("characters")
    })
  }, [busy, confirming, step, onBack])

  React.useEffect(() => {
    if (!autoFocus) return
    const t = setTimeout(() => root.current?.querySelector<HTMLElement>("[data-step] [data-slot=menu-row], [data-step] input")?.focus(), 0)
    return () => clearTimeout(t)
  }, [autoFocus, step])

  const ask = (key: string, call: Promise<CharacterAnswer> | void, then?: () => void) => {
    setBusy(key)
    setError(null)
    void Promise.resolve(call)
      .then((answer) => {
        if (answer && !answer.ok) setError(answer.error ?? "That didn't work.")
        else then?.()
      })
      .finally(() => {
        setBusy(null)
        setConfirming(false)
      })
  }

  const play = () => {
    if (!selected || !onPlay) return
    if (spawns.length && step !== "spawn") {
      setStep("spawn")
      setError(null)
      return
    }
    ask("play", onPlay(selected.id, spawns.length ? spawn : undefined))
  }

  const create = () => {
    setTried(true)
    if (!formOk || !onCreate) return
    const c: NewCharacter = { firstName: form.firstName!.trim(), lastName: form.lastName!.trim(), birthdate: form.birthdate!, gender: form.gender! }
    ask("create", onCreate(c), () => {
      setForm({})
      setTried(false)
      setStep("characters")
    })
  }

  const errorLine = error && (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  )

  return (
    <div ref={root} data-slot="character-select" className={cn("nk-edge absolute inset-0", className)} {...props}>
      <div className="nk-anchor-l flex items-start gap-4">
        <Panel size="auto" className="nk-enter w-80" data-step={step === "characters" ? "" : undefined}>
          <PanelHeader
            icon={<UsersIcon />}
            title={data.title ?? "Characters"}
            actions={
              <span className="nk-num text-sm text-muted-foreground">
                {characters.length} / {data.slots}
              </span>
            }
          />
          <PanelBody scroll className="max-h-[30rem]">
            {characters.map((c) => (
              <MenuRow
                key={c.id}
                image={
                  <Avatar aria-hidden className="size-full rounded-none">
                    {c.avatar && <AvatarImage src={c.avatar} alt="" className="object-cover" />}
                    <AvatarFallback className="rounded-none text-xs font-medium">{initials(fullName(c))}</AvatarFallback>
                  </Avatar>
                }
                description={[c.job, c.lastPlayed].filter(Boolean).join(", ") || undefined}
                active={c.id === selectedId}
                disabled={!!busy}
                onClick={() => {
                  setSelectedId(c.id)
                  setStep("characters")
                  setError(null)
                }}
              >
                {fullName(c)}
              </MenuRow>
            ))}
            {data.canCreate !== false &&
              Array.from({ length: free }, (_, i) => (
                <MenuRow
                  key={`free-${i}`}
                  icon={<PlusIcon />}
                  description="Empty slot"
                  className="text-muted-foreground"
                  active={step === "create" && i === 0}
                  disabled={!!busy}
                  onClick={() => {
                    setStep("create")
                    setError(null)
                  }}
                >
                  Create a character
                </MenuRow>
              ))}
          </PanelBody>
        </Panel>

        {step === "characters" && selected && (
          <div className="nk-enter flex w-96 flex-col gap-3">
            <PlayerCard
              name={fullName(selected)}
              avatar={selected.avatar}
              job={selected.job}
              grade={selected.grade}
              columns={2}
              stats={[
                ...(selected.cash !== undefined ? [{ label: "Cash", value: <Money amount={selected.cash} /> }] : []),
                ...(selected.bank !== undefined ? [{ label: "Bank", value: <Money amount={selected.bank} /> }] : []),
                ...(selected.birthdate ? [{ label: "Born", value: selected.birthdate, mono: true }] : []),
                ...(selected.gender ? [{ label: "Gender", value: selected.gender }] : []),
                ...(selected.lastLocation ? [{ label: "Last seen", value: selected.lastLocation }] : []),
                { label: "Citizen ID", value: selected.id, mono: true },
              ]}
            />
            {errorLine}
            <div className="flex gap-2">
              {data.canDelete !== false && (
                <Button variant="ghost" className="text-destructive hover:text-destructive" disabled={!!busy} onClick={() => setConfirming(true)}>
                  <Trash2Icon />
                  Delete
                </Button>
              )}
              <Button className="flex-1" disabled={!!busy} onClick={play}>
                {busy === "play" && <Spinner />}
                Play as {selected.firstName}
              </Button>
            </div>
          </div>
        )}

        {step === "spawn" && selected && (
          <Panel size="auto" className="nk-enter w-80" data-step="">
            <PanelHeader icon={<MapPinIcon />} title="Where to?" description={`${fullName(selected)} wakes up…`} />
            <PanelBody scroll className="max-h-[24rem]">
              <div
                role="listbox"
                aria-label="Spawn points"
                onKeyDown={(e) => {
                  const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0
                  if (!dir) return
                  const all = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("[data-slot=menu-row]")]
                  const next = all[all.indexOf(document.activeElement as HTMLButtonElement) + dir]
                  if (!next) return
                  e.preventDefault()
                  next.focus()
                  next.click()
                }}
              >
                {spawns.map((s) => {
                  const Icon = SPAWN_ICONS[s.icon as SpawnIcon] ?? MapPinIcon
                  return (
                    <MenuRow
                      key={s.id}
                      role="option"
                      aria-selected={s.id === spawn}
                      icon={<Icon />}
                      description={s.description}
                      active={s.id === spawn}
                      disabled={!!busy}
                      onClick={() => setSpawn(s.id)}
                      onDoubleClick={play}
                    >
                      {s.label}
                    </MenuRow>
                  )
                })}
              </div>
            </PanelBody>
            <PanelFooter className="flex flex-col items-stretch gap-2">
              {errorLine}
              <div className="flex gap-2">
                <Button variant="ghost" disabled={!!busy} onClick={() => setStep("characters")}>
                  Back
                </Button>
                <Button className="flex-1" disabled={!spawn || !!busy} onClick={play}>
                  {busy === "play" && <Spinner />}
                  Spawn here
                </Button>
              </div>
            </PanelFooter>
          </Panel>
        )}

        {step === "create" && (
          <Panel size="auto" className="nk-enter w-96" data-step="">
            <PanelHeader icon={<PlusIcon />} title="New character" description="You can't change the name or date of birth later." />
            <PanelBody variant="form">
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="First name"
                  required
                  maxLength={20}
                  showCount={false}
                  value={form.firstName ?? ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, firstName: v }))}
                  error={tried ? errors.firstName : undefined}
                />
                <TextField
                  label="Last name"
                  required
                  maxLength={20}
                  showCount={false}
                  value={form.lastName ?? ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, lastName: v }))}
                  error={tried ? errors.lastName : undefined}
                />
              </div>
              <DateField
                label="Date of birth"
                required
                min={yearsAgo(new Date(), 100)}
                max={yearsAgo(new Date(), 18)}
                value={form.birthdate ?? null}
                onValueChange={(v) => setForm((f) => ({ ...f, birthdate: v ?? undefined }))}
                error={tried ? errors.birthdate : undefined}
              />
              <SelectField
                label="Gender"
                required
                placeholder="Pick one"
                options={genders.map((g) => ({ value: g }))}
                value={form.gender ?? null}
                onValueChange={(v) => setForm((f) => ({ ...f, gender: v ?? undefined }))}
                error={tried ? errors.gender : undefined}
              />
            </PanelBody>
            <PanelFooter className="flex flex-col items-stretch gap-2">
              {errorLine}
              <div className="flex gap-2">
                <Button variant="ghost" disabled={!!busy} onClick={() => setStep("characters")}>
                  Cancel
                </Button>
                <Button className="flex-1" disabled={!!busy || (tried && !formOk)} onClick={create}>
                  {busy === "create" && <Spinner />}
                  Create
                </Button>
              </div>
            </PanelFooter>
          </Panel>
        )}
      </div>

      {confirming && selected && (
        <Confirm
          tone="destructive"
          title={`Delete ${fullName(selected)}?`}
          description="Their money, things and progress go with them. This can't be undone."
          confirmLabel="Delete"
          initialFocus="cancel"
          loading={busy === "delete"}
          onConfirm={() => onDelete && ask("delete", onDelete(selected.id))}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}

export { CharacterSelect, CharacterSelectSurface, newCharacterErrors, yearsAgo }
