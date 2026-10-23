// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/notice.tsx, then run pnpm sync.
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CircleCheckIcon, CircleXIcon, InfoIcon, PackageIcon, TriangleAlertIcon, XIcon } from "lucide-react"

import { flipFrom, motionLevel, token, tokenMs } from "nuikit-core/motion"
import { Stagger, useNuiEvent, useStaggerGroup, useStaggerItem } from "nuikit-core/react"

import { cn, nkLevel, nkState, nkVariant, type NkVariantProps } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Fill, fillTargets, toneVars } from "@/components/ui/fill"
import { useLinearRun } from "@/hooks/use-linear-run"

/**
 * Notice — a notification on top of the game, and the stack that holds them: the default look of
 * the `notify` intent (docs/architecture.md §2). A panel with a status icon, a title, a
 * description and a hairline that empties as its time runs out.
 *
 *   const { notices, notify, dismiss } = useNotices()
 *   notify({ title: "Paid", description: "$500 from Lester", status: "success", position: "top-right" })
 *   <Notices notices={notices} onDismiss={dismiss} />
 *
 * Or wired to Lua's NUI.notify() (the `nuikit:notify` message), mounted once:
 *
 *   <NuiNotices />
 *
 * Or by hand, every state from props (previews, screenshots, your own queue):
 *
 *   <NoticeStack position="top-right">
 *     <Notice status="warning" title="Low fuel" description="8% left" duration={5000} elapsed={2000} paused />
 *   </NoticeStack>
 *
 * The time left runs on its own (and pauses while hovered or focused); `onExpire` fires when it
 * runs out. Colours are the theme's status tokens; the time line is hidden when motion is off.
 *
 * In a stack a notice slides in from the stack's edge and, through the queue, back out toward it
 * when it ends, while the others glide into the gap (`slide={false}`: a fade in place; `animate={false}`:
 * no entrance at all). Reduced motion fades; motion off draws it still.
 *
 * Items added or removed are the item slab (design v2 §4.5, `nk-slab`): an icon tile, the name and
 * the change. Through the queue, changes to the same item in the same direction within 1.5 s merge
 * into one slab ("+1", "+1", "+1" → "+3"):
 *
 *   notify({ item: { name: "Water bottle", count: 2, icon: <CupSodaIcon /> }, position: "center-left" })
 *   <Notice item={{ name: "Lockpick", count: -1 }} />
 *
 * `tone` (1.5) is the shared tone vocabulary (neutral | info | success | warning | danger) and wins over
 * `status`, which stays as its older name (`error` = danger, neutral = info); `hue` colours it with a role.
 *
 * Role: a message on top of the game that speaks once and leaves (the notify intent), or an item change.
 * Anatomy: plate (nk-panel) > icon (a square Tile under the tile treatment; tone = status) > title (strong) over
 *   a body-role description > dismiss > time line (the duration Fill along the bottom edge).
 * Props: tone, status, hue, title, description, icon, duration, elapsed, paused, onDismiss, item, slide, leaving.
 * Level means: the time left, 1 when it appears, 0 when it expires (--level, the time line drains from it).
 * Rules: danger is data-state="alert" and role="alert"; lifetimes come from --nk-notify-ms-*; the stack sits on
 *   --nk-z-system; transform and opacity only; the time line is hidden with motion off.
 */

type NoticeStatus = "info" | "success" | "warning" | "error"

/** The shared tone vocabulary (1.5); error and destructive are accepted aliases of danger. */
type NoticeTone = "neutral" | "info" | "success" | "warning" | "danger" | "error" | "destructive"

/** A status as the shared tone (data-tone). */
const STATUS_TONE: Record<NoticeStatus, "info" | "success" | "warning" | "danger"> = { info: "info", success: "success", warning: "warning", error: "danger" }

type NoticePosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"

/** How long a notice stays when no duration is given, in ms. */
const NOTICE_DURATION = 5000

/** Item changes to the same item, in the same direction, this close together (ms) merge into one. */
const NOTICE_ITEM_MERGE_MS = 1500

/** An item added (count > 0) or removed (count < 0): the item slab. */
type NoticeItem = {
  name: React.ReactNode
  /** The change: 2 for two added, -1 for one removed. */
  count: number
  /** The tile: an icon, or `image` (a URL: the inventory's own item image). */
  icon?: React.ReactNode
  image?: string
  /** What makes two changes the same item, for merging. Default: the name, when it is a string. */
  id?: string | number
}

/** "+2", "−1" (a true minus sign), "0". */
function formatItemDelta(count: number) {
  const n = Number.isFinite(count) ? count : 0
  if (n > 0) return `+${n.toLocaleString()}`
  if (n < 0) return `\u2212${Math.abs(n).toLocaleString()}`
  return "0"
}

/** The merge key of an item change, or undefined when it can't be merged. */
function noticeItemKey(item?: NoticeItem | null) {
  if (!item) return undefined
  if (item.id !== undefined && item.id !== null) return `id:${item.id}`
  return typeof item.name === "string" || typeof item.name === "number" ? `name:${item.name}` : undefined
}

const NOTICE_POSITIONS: readonly NoticePosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
]

/**
 * Literal class names, so Tailwind finds them. The status tokens are read as variables
 * (docs/tokens.md), so they work in any project that defines them, mapped into @theme or not.
 */
const STATUS: Record<NoticeStatus, { icon: React.ReactNode; text: string }> = {
  info: { icon: <InfoIcon />, text: "text-(color:--info)" },
  success: { icon: <CircleCheckIcon />, text: "text-(color:--success)" },
  warning: { icon: <TriangleAlertIcon />, text: "text-(color:--warning)" },
  error: { icon: <CircleXIcon />, text: "text-(color:--destructive)" },
}

/** The words other libraries use for a status (ox `inform`, QBCore `primary`, …). */
const STATUS_ALIASES: Record<string, NoticeStatus> = {
  info: "info",
  neutral: "info",
  inform: "info",
  primary: "info",
  default: "info",
  success: "success",
  warning: "warning",
  warn: "warning",
  error: "error",
  danger: "error",
  destructive: "error",
}

/** Any status word to one of the four; unknown words are `info`. */
function noticeStatus(value?: string | null): NoticeStatus {
  return (value && STATUS_ALIASES[value.toLowerCase()]) || "info"
}

/** Any position word to one of the eight (`top` and `bottom` are centred); unknown is `top-right`. */
function noticePosition(value?: string | null): NoticePosition {
  if (value === "top") return "top-center"
  if (value === "bottom") return "bottom-center"
  return NOTICE_POSITIONS.includes(value as NoticePosition) ? (value as NoticePosition) : "top-right"
}

/**
 * Time left in ms for a notice of `duration` that has run for `elapsed`. A duration of 0, a
 * negative one or Infinity means it stays until dismissed: Infinity.
 */
function noticeTimeLeft(duration: number = NOTICE_DURATION, elapsed = 0) {
  if (!Number.isFinite(duration) || duration <= 0) return Infinity
  return Math.max(0, duration - Math.max(0, Number.isFinite(elapsed) ? elapsed : 0))
}

const noticeVariants = cva(
  // baseline (1.6): the row's rhythm (space-4 all round, the icon tile a row-gap from the text)
  "nk-panel pointer-events-auto relative flex overflow-hidden p-(--nk-space-4) text-(length:--nk-text-label) leading-5",
  {
    variants: {
      size: {
        sm: "w-72",
        default: "w-80",
        lg: "w-96",
      },
      iconAlign: {
        start: "items-start",
        center: "items-center",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

/** How long a leaving notice stays drawn for its exit (the slide out takes at most 200 ms). */
const NOTICE_EXIT_MS = 220

/** The position of the stack a notice is in: the edge it slides from. */
const NoticeStackContext = React.createContext<NoticePosition | null>(null)

/** How far a notice in a stack at `position` travels (x, y): in from that edge, out toward it. */
function noticeOffset(position: NoticePosition | null): [string, string] {
  if (position?.endsWith("right")) return ["1.5rem", "0rem"]
  if (position?.endsWith("left")) return ["-1.5rem", "0rem"]
  if (position === "top-center") return ["0rem", "-0.75rem"]
  if (position === "bottom-center") return ["0rem", "0.75rem"]
  return ["0rem", "0rem"]
}

/**
 * The edge motion, on the sheets' ladder: in from the stack's edge with a fade (--nk-time x 2.2, at
 * most 360 ms, ease-out) after the stack's stagger delay; while `leaving`, back out toward it (x 1.4,
 * at most 200 ms, ease-in). Web Animations on the notice itself (the queue's flip moves its wrapper,
 * so the two transforms never fight), so there is no stylesheet to install.
 */
function useEdgeMotion(ref: React.RefObject<HTMLDivElement | null>, on: boolean, leaving: boolean) {
  const position = React.useContext(NoticeStackContext)
  React.useLayoutEffect(() => {
    const el = ref.current
    const level = motionLevel(el)
    if (!on || !el?.animate || level === "off") return
    const [x, y] = level === "reduced" ? ["0rem", "0rem"] : noticeOffset(position)
    const away = { opacity: 0, transform: `translate3d(${x}, ${y}, 0) scale(0.98)` }
    const here = { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }
    const time = tokenMs("--nk-time", 160)
    const anim = leaving
      ? el.animate([here, away], { duration: Math.min(time * 1.4, 200), easing: token("--nk-ease-in") || "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" })
      : el.animate([away, here], { duration: Math.min(time * 2.2, 360), easing: token("--nk-ease-out") || "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" })
    // notices that arrive together come in one after another: the stack's stagger sets this one's
    // delay in a microtask queued before this one
    if (!leaving) queueMicrotask(() => anim.effect?.updateTiming({ delay: parseFloat(el.style.getPropertyValue("--nk-stagger-delay")) || 0 }))
    return () => anim.cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, leaving])
}

function Notice({
  className,
  status: statusProp = "info",
  tone,
  hue,
  title,
  description,
  icon,
  iconAlign,
  size,
  duration = NOTICE_DURATION,
  elapsed = 0,
  showDuration = true,
  paused = false,
  pauseOnHover = true,
  animate = true,
  slide = true,
  leaving = false,
  onExpire,
  onDismiss,
  children,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  item,
  density,
  shape,
  motion,
  ...props
}: NkVariantProps & Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof noticeVariants> & {
    /** The older name of `tone` (error = danger). */
    status?: NoticeStatus
    /** The tone (1.5): neutral | info | success | warning | danger. Wins over `status`. */
    tone?: NoticeTone
    /** A role (health, police…) for the icon and line colour. */
    hue?: string
    title?: React.ReactNode
    description?: React.ReactNode
    /** Replaces the status icon; `null` or `false` for none. The status colour still applies. */
    icon?: React.ReactNode
    /** ms on screen. 0, negative or Infinity: stays until dismissed (no time line). */
    duration?: number
    /** ms already run: start part-way (a preview, or a notice restored after a reload). */
    elapsed?: number
    /** Draw the time-left line. */
    showDuration?: boolean
    /** Freeze the time left (line and `onExpire`). */
    paused?: boolean
    /** Freeze it while the pointer is over the notice or focus is inside it. */
    pauseOnHover?: boolean
    /** Play an entrance when it mounts (and an exit while `leaving`). */
    animate?: boolean
    /** The entrance slides in from the stack's edge, the exit back toward it; false: a fade in place. */
    slide?: boolean
    /** It has ended and is on its way out: plays the exit, freezes its time, ignores the pointer. */
    leaving?: boolean
    /** Called once when the time runs out. */
    onExpire?: () => void
    /** Shows a close button that calls this. */
    onDismiss?: () => void
    /** An item added or removed: draws the item slab (icon tile + name + change) instead of a panel. */
    item?: NoticeItem
  }) {
  const status = tone ? noticeStatus(tone) : statusProp
  const [held, setHeld] = React.useState(false)
  const s = STATUS[status] ?? STATUS.info
  const timed = Number.isFinite(noticeTimeLeft(duration, elapsed))
  const inGroup = useStaggerGroup() !== null
  const staggerRef = useStaggerItem<HTMLDivElement>(undefined, { appear: true, animate: inGroup && animate && !slide ? "rise" : false })
  const root = React.useRef<HTMLDivElement>(null)
  const setRoot = React.useCallback(
    (node: HTMLDivElement | null) => {
      root.current = node
      staggerRef(node)
    },
    [staggerRef]
  )
  const frozen = paused || leaving || (pauseOnHover && held)
  const iconEl = icon === undefined ? s.icon : icon

  // Motion: the time line drains on the compositor and onExpire fires when the time left runs out; both hold
  // while frozen (hover, focus, paused, leaving) and resume with what they had left
  useLinearRun(root, {
    duration: timed ? duration : undefined,
    elapsed,
    paused: frozen,
    onComplete: onExpire,
    deps: [!item && showDuration],
    targets: (el) => (!item && showDuration ? fillTargets(el.querySelector("[data-slot=notice-time]"), 1, 0) : []),
  })
  useEdgeMotion(root, slide && (animate || leaving), leaving)

  if (item) {
    const down = item.count < 0
    return (
      <div
        ref={setRoot}
        {...nkVariant({ density, shape, motion })}
        data-slot="notice"
        data-variant="item"
        data-delta={down ? "down" : "up"}
        data-leaving={leaving || undefined}
        role="status"
        className={cn("nk-slab pointer-events-auto max-w-80", animate && !slide && "nk-enter", leaving && "pointer-events-none", className)}
        {...props}
      >
        <span data-slot="notice-item-tile" className="nk-slab-tile">
          {item.image ? <img src={item.image} alt="" draggable={false} className="size-full object-contain p-(--nk-space-1)" /> : (item.icon ?? <PackageIcon />)}
        </span>
        <span data-slot="notice-item-name" className="min-w-0 truncate">
          {item.name}
        </span>
        <span data-slot="notice-item-delta" className="nk-slab-delta" data-delta={down ? "down" : undefined}>
          {formatItemDelta(item.count)}
        </span>
        {children}
      </div>
    )
  }

  return (
    <div
      ref={setRoot}
      {...nkVariant({ density, shape, motion })}
      data-slot="notice"
      data-status={status}
      {...toneVars({ tone: STATUS_TONE[status] ?? "info", hue })}
      data-leaving={leaving || undefined}
      data-paused={frozen || undefined}
      data-state={nkState({ alert: status === "error", focus: held })}
      role={status === "error" ? "alert" : "status"}
      className={cn(
        noticeVariants({ size, iconAlign: iconAlign ?? (title && description ? "start" : "center") }),
        "gap-(--nk-row-gap)",
        animate && !slide && !inGroup && "nk-enter",
        leaving && "pointer-events-none",
        className
      )}
      onMouseEnter={(e) => {
        setHeld(true)
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        setHeld(false)
        onMouseLeave?.(e)
      }}
      onFocus={(e) => {
        setHeld(true)
        onFocus?.(e)
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false)
        onBlur?.(e)
      }}
      {...props}
      // the level contract: the time left (1 → 0); the time line drains on the compositor from here
      style={{ ...nkLevel(timed ? 1 - Math.min(elapsed, duration) / duration : 1), ...props.style }}
    >
      {iconEl !== null && iconEl !== false && (
        <span
          data-slot="notice-icon"
          className={cn("shrink-0", hue ? "text-(--hue-solid)" : s.text)}
        >
          {iconEl}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 self-stretch break-words">
        {title && (
          <p data-slot="notice-title">
            {title}
          </p>
        )}
        {description && (
          <div data-slot="notice-description" className={cn("text-pretty", title && "text-muted-foreground")}>
            {description}
          </div>
        )}
        {children}
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Dismiss"
          className="-my-(--nk-space-1) -mr-(--nk-space-2) shrink-0 text-muted-foreground"
          onClick={onDismiss}
        >
          <XIcon />
        </Button>
      )}
      {timed && showDuration && (
        // the duration Fill along the bottom edge, in the status tone (or the hue), on no track
        <Fill
          data-slot="notice-time"
          level={timed ? 1 - Math.min(elapsed, duration) / duration : 1}
          tween={false}
          tone={STATUS_TONE[status] ?? "info"}
          hue={hue}
          className="absolute inset-x-0 bottom-0 h-0.5 rounded-none bg-transparent motion-reduce:hidden [[data-nk-motion=off]_&]:hidden"
        />
      )}
    </div>
  )
}

/** Literal class names, so Tailwind finds them. Bottom stacks grow upwards. */
const STACK: Record<NoticePosition, string> = {
  "top-left": "nk-anchor-tl items-start",
  "top-center": "nk-anchor-t items-center",
  "top-right": "nk-anchor-tr items-end",
  "center-left": "nk-anchor-l items-start",
  "center-right": "nk-anchor-r items-end",
  "bottom-left": "nk-anchor-bl items-start flex-col-reverse",
  "bottom-center": "nk-anchor-b items-center flex-col-reverse",
  "bottom-right": "nk-anchor-br items-end flex-col-reverse",
}

/**
 * A column of notices pinned `--nk-edge` from a corner or edge of the full-screen root. Children
 * newest first: the newest sits nearest the edge. Clicks pass through to the game around them.
 */
function NoticeStack({
  className,
  position = "top-right",
  children,
  density,
  shape,
  motion,
  ...props
}: NkVariantProps & React.ComponentProps<"div"> & { position?: NoticePosition }) {
  // when a notice leaves (or arrives), the others slide into their new places instead of jumping:
  // a spring per notice (nuikit-core flip), staggered from the gap outward
  const stack = React.useRef<HTMLDivElement>(null)
  const places = React.useRef(new WeakMap<Element, [number, number]>())
  React.useLayoutEffect(() => {
    const el = stack.current
    if (!el) return
    const kids = Array.from(el.children) as HTMLElement[]
    const before = new Set(kids.flatMap((k) => k.getAnimations?.() ?? []))
    flipFrom(kids, places.current, "move")
    let k = 0
    for (const kid of kids) {
      const slide = kid.getAnimations?.().find((a) => !before.has(a) && !(a instanceof CSSAnimation))
      if (slide) slide.effect?.updateTiming({ delay: k++ * 35, fill: "backwards" })
    }
  })
  return (
    <NoticeStackContext.Provider value={position}>
      <div
        ref={stack}
        {...nkVariant({ density, shape, motion })}
        data-slot="notice-stack"
        data-position={position}
        aria-label="Notifications"
        className={cn("pointer-events-none z-50 flex flex-col gap-2", STACK[position] ?? STACK["top-right"], className)}
        {...props}
      >
        {/* notices that arrive together come in one after another */}
        <Stagger budget={240}>{children}</Stagger>
      </div>
    </NoticeStackContext.Provider>
  )
}

/** What a script asks for: the `notify` intent's fields. */
type NoticeData = {
  /** A notice with the same id updates in place and restarts its time. */
  id?: string | number
  title?: React.ReactNode
  description?: React.ReactNode
  status?: NoticeStatus
  /** The tone (1.5); wins over status. */
  tone?: NoticeTone
  hue?: string
  icon?: React.ReactNode
  /** ms; 0 or Infinity stays until dismissed. Default 5000. */
  duration?: number
  showDuration?: boolean
  position?: NoticePosition
  /** An item added or removed (the item slab); merges with the same item's recent change. */
  item?: NoticeItem
}

type NoticeEntry = NoticeData & {
  key: string
  /** When it was shown or last updated (ms). */
  at: number
  /** How many later changes were merged into it (item notices). */
  merged?: number
  /** shown with its time scaled by this (the queue policy's hurry while others wait) */
  dwell?: number
}

type NoticeAction =
  | { type: "show"; key: string; at: number; notice: NoticeData; max?: number; queue?: number }
  | { type: "dismiss"; key: string }
  | { type: "clear" }

/**
 * The queue: show (a notice with a key already on screen is replaced in place), dismiss, clear.
 * At most `max` (default 5) stay in each position; the oldest there go first. A notice with
 * neither title, description nor item is ignored. An item change with no id merges into the same
 * item's change in the same position and direction when that was shown or updated at most
 * NOTICE_ITEM_MERGE_MS before: the counts add up and its time restarts.
 */
function noticeReducer(state: NoticeEntry[], action: NoticeAction): NoticeEntry[] {
  switch (action.type) {
    case "show": {
      const { notice, key, at, max = 5, queue = 0 } = action
      if (!notice.title && !notice.description && !notice.item) return state
      const itemKey = notice.id === undefined || notice.id === null ? noticeItemKey(notice.item) : undefined
      if (itemKey && notice.item) {
        const sign = Math.sign(notice.item.count)
        const position = noticePosition(notice.position)
        const j = state.findIndex(
          (n) =>
            !!n.item &&
            noticeItemKey(n.item) === itemKey &&
            Math.sign(n.item.count) === sign &&
            noticePosition(n.position) === position &&
            at - n.at >= 0 &&
            at - n.at <= NOTICE_ITEM_MERGE_MS
        )
        if (j >= 0) {
          const prev = state[j]!
          const merged: NoticeEntry = {
            ...prev,
            ...notice,
            item: { ...prev.item!, ...notice.item, count: prev.item!.count + notice.item.count },
            key: prev.key,
            at,
            merged: (prev.merged ?? 0) + 1,
          }
          return state.map((n, i) => (i === j ? merged : n))
        }
      }
      const next: NoticeEntry = { ...notice, key, at }
      const i = state.findIndex((n) => n.key === key)
      if (i >= 0) return state.map((n, j) => (j === i ? next : n))
      const position = noticePosition(next.position)
      const there = state.filter((n) => noticePosition(n.position) === position)
      // past the shown (max) and the waiting (queue): the oldest waiting goes, or with no queue the oldest shown
      const shown = Math.max(1, max)
      const overflow = Math.max(0, there.length + 1 - shown - Math.max(0, queue))
      const drop = new Set((queue > 0 ? there.slice(shown) : there).slice(0, overflow))
      return [...state.filter((n) => !drop.has(n)), next]
    }
    case "dismiss":
      return state.filter((n) => n.key !== action.key)
    case "clear":
      return state.length ? [] : state
  }
}

/** Notices grouped by position (in order of first appearance), newest first in each group. */
function groupNotices(notices: readonly NoticeEntry[]) {
  const groups = new Map<NoticePosition, NoticeEntry[]>()
  for (const n of notices) {
    const p = noticePosition(n.position)
    groups.set(p, [n, ...(groups.get(p) ?? [])])
  }
  return [...groups]
}

let seq = 0

/**
 * The queue policy (wave 3): stack (several per position, the default) or one (one at a time); how many may
 * wait (`queue`; the oldest waiting goes past it); and `hurry`, the time a shown notice keeps while others
 * wait (0.5: half).
 */
type NoticeQueuePolicy = {
  policy?: "stack" | "one"
  /** shown per position (stack); one shows 1. Default 5. */
  max?: number
  /** how many may wait per position beyond those shown. Default: 0 for stack (the oldest shown goes), 5 for one. */
  queue?: number
  /** the shown notices' time while others wait, as a fraction. Default 0.5. */
  hurry?: number
}

/**
 * The notices shown now (arrival order: the first ones stay, the rest wait), each with its `dwell`: `hurry`
 * when others wait in its position, else 1.
 */
function noticeShown(entries: readonly NoticeEntry[], shown: number, hurry: number): NoticeEntry[] {
  const count = new Map<NoticePosition, number>()
  const waiting = new Set<NoticePosition>()
  const out: NoticeEntry[] = []
  for (const n of entries) {
    const p = noticePosition(n.position)
    const c = count.get(p) ?? 0
    count.set(p, c + 1)
    if (c < shown) out.push(n)
    else waiting.add(p)
  }
  return out.map((n) => (waiting.has(noticePosition(n.position)) ? { ...n, dwell: hurry } : n))
}

/** A notice queue, by its policy: `notify` returns the notice's key, for `dismiss`; `waiting` counts the queued. */
function useNotices({ policy = "stack", max = 5, queue, hurry = 0.5 }: NoticeQueuePolicy = {}) {
  const [all, dispatch] = React.useReducer(noticeReducer, [])
  const shown = policy === "one" ? 1 : Math.max(1, max)
  const waitFor = queue ?? (policy === "one" ? 5 : 0)
  const notify = React.useCallback(
    (notice: NoticeData) => {
      const key = notice.id !== undefined && notice.id !== null ? `id:${notice.id}` : `n:${++seq}`
      dispatch({ type: "show", key, at: Date.now(), notice, max: shown, queue: waitFor })
      return key
    },
    [shown, waitFor]
  )
  const dismiss = React.useCallback((key: string) => dispatch({ type: "dismiss", key }), [])
  const clear = React.useCallback(() => dispatch({ type: "clear" }), [])
  const notices = React.useMemo(() => noticeShown(all, shown, hurry), [all, shown, hurry])
  return { notices, notify, dismiss, clear, waiting: all.length - notices.length }
}

/**
 * Every notice of a queue, in one stack per position, each dismissed when its time runs out.
 * `closable` adds a close button to each. A notice that leaves the queue stays drawn for its exit
 * (NOTICE_EXIT_MS), sliding back toward its edge, and the others glide into the gap.
 */
function Notices({
  notices,
  onDismiss,
  closable = false,
  className,
  ...variant
}: NkVariantProps & {
  notices: readonly NoticeEntry[]
  onDismiss: (key: string) => void
  closable?: boolean
  className?: string
}) {
  // Notices that left the queue, still drawn for their exit. Worked out while rendering (not in an
  // effect), so a leaving notice is never unmounted for a frame.
  const [shown, setShown] = React.useState({ notices, leaving: [] as NoticeEntry[] })
  let leaving = shown.leaving
  if (shown.notices !== notices) {
    const live = new Set(notices.map((n) => n.key))
    const gone = shown.notices.filter((n) => !live.has(n.key))
    leaving = [...leaving.filter((n) => !live.has(n.key)), ...gone]
    setShown({ notices, leaving })
  }
  React.useEffect(() => {
    if (!leaving.length) return
    // not cleared when more leave: each exit always ends
    const done = leaving
    setTimeout(() => setShown((s) => ({ ...s, leaving: s.leaving.filter((n) => !done.includes(n)) })), NOTICE_EXIT_MS)
  }, [leaving])
  const out = new Set(leaving)
  const all = [...notices, ...leaving].sort((a, b) => a.at - b.at)
  return (
    <>
      {groupNotices(all).map(([position, list]) => (
        <NoticeStack key={position} position={position} className={className} {...variant}>
          {list.map(({ key, at, id: _id, position: _position, merged, dwell, ...n }, i) => (
            // The wrapper is what the stack's flip moves; the notice inside slides in and out. Keyed on
            // `at` too: an update restarts the time (and comes in again, unless it is a merged item
            // change: that one just updates its count).
            <div key={key} data-slot="notice-item">
              <Notice
                key={`${key}:${at}`}
                {...n}
                duration={dwell && dwell !== 1 ? Math.round((n.duration ?? NOTICE_DURATION) * dwell) : n.duration}
                animate={!merged}
                leaving={out.has(list[i]!)}
                onExpire={() => onDismiss(key)}
                onDismiss={closable ? () => onDismiss(key) : undefined}
              />
            </div>
          ))}
        </NoticeStack>
      ))}
    </>
  )
}

/** What Lua's NUI.notify() sends. `type` is the older name of `status` ("default" is info). */
type NuiNotify = NoticeData & { type?: NoticeStatus | "default" }

declare module "nuikit-core" {
  interface NuiEvents {
    "nuikit:notify": NuiNotify
  }
}

/** A notice queue wired to Lua's NUI.notify() (`nuikit:notify`). Mount it once. */
function NuiNotices({ max, policy, queue, hurry, ...props }: Omit<React.ComponentProps<typeof Notices>, "notices" | "onDismiss"> & NoticeQueuePolicy) {
  const { notices, notify, dismiss } = useNotices({ max, policy, queue, hurry })
  useNuiEvent("nuikit:notify", ({ type, status, ...n }) => {
    notify({ ...n, status: status ?? (type === "default" ? undefined : type) })
  })
  return <Notices notices={notices} onDismiss={dismiss} {...props} />
}

export {
  Notice,
  NoticeStack,
  Notices,
  NuiNotices,
  useNotices,
  noticeVariants,
  noticeReducer,
  noticeShown,
  noticeStatus,
  noticePosition,
  noticeTimeLeft,
  noticeItemKey,
  formatItemDelta,
  groupNotices,
  NOTICE_DURATION,
  NOTICE_ITEM_MERGE_MS,
  NOTICE_EXIT_MS,
  type NoticeItem,
  type NoticeStatus,
  type NoticeTone,
  type NoticePosition,
  type NoticeData,
  type NoticeEntry,
  type NoticeAction,
  type NoticeQueuePolicy,
  type NuiNotify,
}
