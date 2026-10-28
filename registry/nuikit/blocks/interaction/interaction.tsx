import * as React from "react"
import { fetchNui, Surface } from "nuikit-core/react"
import {
  BanknoteIcon,
  BoxIcon,
  BriefcaseIcon,
  CarIcon,
  DoorOpenIcon,
  EyeIcon,
  FuelIcon,
  HandIcon,
  HeartPulseIcon,
  InfoIcon,
  KeyIcon,
  LockIcon,
  type IconComponent,
  PhoneIcon,
  SearchIcon,
  ShirtIcon,
  ShoppingCartIcon,
  UnlockIcon,
  UserIcon,
  WrenchIcon,
} from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import { Chip } from "@/components/ui/chip"
import { KeyPrompt, KeyPromptStack, keyPromptPosition } from "@/components/ui/key-prompt"
import { MenuRow } from "@/components/ui/menu-row"
import { Panel, PanelBody } from "@/components/ui/panel"
import { Spinner } from "@/components/ui/spinner"

import type { InteractionAnswer, InteractionIcon, PromptsData, TargetData } from "./nui"

/**
 * Interaction — how the player uses the world: the target eye at the centre of the screen with
 * the options of whatever they aim at, and "[E] Open the fridge" key prompts near things. Lua does
 * the raycast, reads the keys and decides; the page draws. Built from the kit: Panel, MenuRow,
 * KeyPrompt (and its stack), Chip (material="hud"), Spinner.
 *
 *   <InteractionSurface />                          // wired: nk.surface('target' | 'prompts', …) in Lua
 *   <Target data={data} onSelect={…} />             // stills, or your own wiring
 *   <Prompts data={data} />
 */
function InteractionSurface() {
  return (
    <>
      <Surface name="prompts" layer="hud" input="none">
        {(data) => (data ? <Prompts data={data} /> : null)}
      </Surface>
      <Surface name="target" layer="world" input="none">
        {(data) =>
          data ? (
            <Target
              data={data}
              onSelect={(id) =>
                fetchNui("interaction:select", { id }).catch(() => ({ ok: false, error: "Nothing answered. Try again." }))
              }
            />
          ) : null
        }
      </Surface>
    </>
  )
}

const ICONS: Record<InteractionIcon, IconComponent> = {
  car: CarIcon,
  door: DoorOpenIcon,
  hand: HandIcon,
  box: BoxIcon,
  user: UserIcon,
  wrench: WrenchIcon,
  cart: ShoppingCartIcon,
  lock: LockIcon,
  unlock: UnlockIcon,
  key: KeyIcon,
  phone: PhoneIcon,
  info: InfoIcon,
  fuel: FuelIcon,
  shirt: ShirtIcon,
  money: BanknoteIcon,
  briefcase: BriefcaseIcon,
  medical: HeartPulseIcon,
  search: SearchIcon,
}

/** The lucide icon for a name Lua sent, or null for one it doesn't know. */
function interactionIcon(name?: string) {
  const Icon = name ? ICONS[name as InteractionIcon] : undefined
  return Icon ? <Icon /> : null
}

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

/**
 * The eye and the options. The eye sits at the exact centre (the middle of a three-column grid);
 * the options sit to its right. Without `picking` the options are a read-out (Lua moves `active`);
 * with it they're buttons, Up / Down / Enter included.
 */
function Target({
  data,
  onSelect,
  autoFocus = true,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children" | "onSelect"> & {
  data: TargetData
  /** While picking, the first option takes the keyboard (off for stills next to other content). */
  autoFocus?: boolean
  /** The player chose an option (only while `picking`). Resolve with Lua's answer. */
  onSelect?: (id: string) => Promise<InteractionAnswer> | void
}) {
  const options = list(data.options)
  const live = options.length > 0
  const [busy, setBusy] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const rows = React.useRef<HTMLDivElement>(null)

  // A new target clears the last answer.
  const key = options.map((o) => o.id).join("|")
  React.useEffect(() => setError(null), [key])

  // Picking: the first enabled option takes the keyboard.
  React.useEffect(() => {
    if (!data.picking || !autoFocus) return
    const t = setTimeout(() => rows.current?.querySelector<HTMLElement>("[data-slot=menu-row]:not(:disabled)")?.focus(), 0)
    return () => clearTimeout(t)
  }, [data.picking, key, autoFocus])

  const choose = (id: string) => {
    if (!onSelect || busy) return
    setBusy(id)
    setError(null)
    void Promise.resolve(onSelect(id))
      .then((answer) => {
        if (answer && !answer.ok) setError(answer.error ?? "That didn't work.")
      })
      .finally(() => setBusy(null))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0
    if (!dir || !rows.current) return
    const all = [...rows.current.querySelectorAll<HTMLButtonElement>("[data-slot=menu-row]")].filter((b) => !b.disabled)
    if (!all.length) return
    e.preventDefault()
    const i = all.indexOf(document.activeElement as HTMLButtonElement)
    all[(i + dir + all.length) % all.length]?.focus()
  }

  return (
    <div
      data-slot="interaction-target"
      data-live={live || undefined}
      className={cn("absolute inset-0 grid grid-cols-[1fr_auto_1fr] items-center", className)}
      {...props}
    >
      <div />
      <div
        data-slot="interaction-eye"
        aria-hidden
        className={cn(
          // a Lua-driven state (live): it changes on the kit's base time, never Tailwind's default
          "nk-hud nk-shadow flex size-10 items-center justify-center rounded-(--nk-radius-control) [&_svg]:size-5",
          live ? "text-primary" : "opacity-60"
        )}
      >
        <EyeIcon />
      </div>
      {live ? (
        <div className="justify-self-start pl-4">
          <Panel size="sm" className={cn(!data.picking && "pointer-events-none")}>
            <PanelBody ref={rows} role="menu" aria-label={data.label ?? "Options"} onKeyDown={onKeyDown}>
            {data.label && <p className="nk-caption truncate px-(--nk-space-3) pt-1 pb-(--nk-space-2)">{data.label}</p>}
            {options.map((o, i) => (
              <MenuRow
                key={o.id}
                icon={interactionIcon(o.icon)}
                description={o.description}
                active={!data.picking && data.active === i}
                disabled={o.disabled}
                tabIndex={data.picking ? undefined : -1}
                meta={busy === o.id ? <Spinner /> : undefined}
                onClick={() => choose(o.id)}
              >
                {o.label}
              </MenuRow>
            ))}
            {error && (
              <p role="alert" className="nk-label px-(--nk-space-3) pt-(--nk-space-2) pb-1 text-destructive">
                {error}
              </p>
            )}
            </PanelBody>
          </Panel>
          {data.hint && <Chip material="hud" className="mt-2 opacity-80">{data.hint}</Chip>}
        </div>
      ) : (
        <div />
      )}
    </div>
  )
}

/** The key prompts, in a stack at one of eight places. Display only: Lua reads the keys. */
function Prompts({ data, className, ...props }: Omit<React.ComponentProps<"div">, "children"> & { data: PromptsData }) {
  const prompts = list(data.prompts)
  if (!prompts.length) return null
  return (
    <div data-slot="interaction-prompts" className={cn("nk-edge absolute inset-0", className)} {...props}>
      <KeyPromptStack position={keyPromptPosition(data.position)}>
        {prompts.map((p) => (
          <KeyPrompt
            key={p.id}
            keys={p.keys}
            label={p.label}
            description={p.description}
            icon={interactionIcon(p.icon)}
            hold={p.hold}
            progress={p.hold !== undefined ? (p.progress ?? 0) : undefined}
            active={p.active}
            disabled={p.disabled}
          />
        ))}
      </KeyPromptStack>
    </div>
  )
}

export { InteractionSurface, Prompts, Target, interactionIcon }
