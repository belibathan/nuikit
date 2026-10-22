// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/notice.tsx, then run pnpm sync.
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CircleCheckIcon, CircleXIcon, InfoIcon, PackageIcon, TriangleAlertIcon, XIcon } from "lucide-react"

import { flipFrom } from "nuikit-core/motion"
import { Stagger, useStaggerGroup, useStaggerItem } from "nuikit-core/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Notice — a notification on top of the game, and the stack that holds them: the default look of
 * the `notify` intent (docs/architecture.md §2). A panel with a status icon, a title, a
 * description and a hairline that empties as its time runs out.
 *
 *   const { notices, notify, dismiss } = useNotices()
 *   notify({ title: "Paid", description: "$500 from Lester", status: "success", position: "top-right" })
 *   <Notices notices={notices} onDismiss={dismiss} />
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
 * Items added or removed are the item slab (design v2 §4.5, `nk-slab`): an icon tile, the name and
 * the change. Through the queue, changes to the same item in the same direction within 1.5 s merge
 * into one slab ("+1", "+1", "+1" → "+3"):
 *
 *   notify({ item: { name: "Water bottle", count: 2, icon: <CupSodaIcon /> }, position: "center-left" })
 *   <Notice item={{ name: "Lockpick", count: -1 }} />
 */

type NoticeStatus = "info" | "success" | "warning" | "error"

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
const STATUS: Record<NoticeStatus, { icon: React.ReactNode; text: string; line: string }> = {
  info: { icon: <InfoIcon />, text: "text-(color:--info)", line: "bg-(--info)" },
  success: { icon: <CircleCheckIcon />, text: "text-(color:--success)", line: "bg-(--success)" },
  warning: { icon: <TriangleAlertIcon />, text: "text-(color:--warning)", line: "bg-(--warning)" },
  error: { icon: <CircleXIcon />, text: "text-(color:--destructive)", line: "bg-(--destructive)" },
}

/** The words other libraries use for a status (ox `inform`, QBCore `primary`, …). */
const STATUS_ALIASES: Record<string, NoticeStatus> = {
  info: "info",
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
  "nk-panel pointer-events-auto relative flex w-80 overflow-hidden px-4 py-3 text-sm leading-5",
  {
    variants: {
      iconAlign: {
        start: "items-start",
        center: "items-center",
      },
    },
  }
)

/**
 * Runs `onExpire` after the time left, pausing while `paused`. Restarts when `duration` or
 * `elapsed` change.
 */
function useNoticeTimer(duration: number, elapsed: number, paused: boolean, onExpire?: () => void) {
  const expire = React.useRef(onExpire)
  const left = React.useRef(noticeTimeLeft(duration, elapsed))
  const armed = onExpire !== undefined

  React.useEffect(() => {
    expire.current = onExpire
  })
  React.useEffect(() => {
    left.current = noticeTimeLeft(duration, elapsed)
  }, [duration, elapsed])
  React.useEffect(() => {
    if (paused || !armed || !Number.isFinite(left.current)) return
    const start = Date.now()
    const timer = setTimeout(() => expire.current?.(), left.current)
    return () => {
      clearTimeout(timer)
      left.current = Math.max(0, left.current - (Date.now() - start))
    }
  }, [duration, elapsed, paused, armed])
}

/**
 * Drains the time line with the Web Animations API (a composited transform, no stylesheet
 * keyframes to install), from `elapsed` and frozen while `paused`.
 */
function useTimeLine(ref: React.RefObject<HTMLDivElement | null>, duration: number, elapsed: number, paused: boolean, on: boolean) {
  const animation = React.useRef<Animation | null>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!on || !el || typeof el.animate !== "function") return
    const a = el.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], {
      duration,
      easing: "linear",
      fill: "forwards",
    })
    a.currentTime = Math.min(duration, Math.max(0, elapsed))
    animation.current = a
    return () => {
      a.cancel()
      animation.current = null
    }
  }, [ref, duration, elapsed, on])

  React.useEffect(() => {
    const a = animation.current
    if (!a || a.playState === "finished") return
    if (paused) a.pause()
    else a.play()
  }, [paused, duration, elapsed, on])
}

function Notice({
  className,
  status = "info",
  title,
  description,
  icon,
  iconAlign,
  duration = NOTICE_DURATION,
  elapsed = 0,
  showDuration = true,
  paused = false,
  pauseOnHover = true,
  animate = true,
  onExpire,
  onDismiss,
  children,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  item,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof noticeVariants> & {
    status?: NoticeStatus
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
    /** Fade in with nk-enter when it mounts. */
    animate?: boolean
    /** Called once when the time runs out. */
    onExpire?: () => void
    /** Shows a close button that calls this. */
    onDismiss?: () => void
    /** An item added or removed: draws the item slab (icon tile + name + change) instead of a panel. */
    item?: NoticeItem
  }) {
  const [held, setHeld] = React.useState(false)
  const line = React.useRef<HTMLDivElement>(null)
  const s = STATUS[status] ?? STATUS.info
  const timed = Number.isFinite(noticeTimeLeft(duration, elapsed))
  const inGroup = useStaggerGroup() !== null
  const staggerRef = useStaggerItem<HTMLDivElement>(undefined, { appear: true, animate: inGroup && animate ? "rise" : false })
  const frozen = paused || (pauseOnHover && held)
  const iconEl = icon === undefined ? s.icon : icon

  useNoticeTimer(duration, elapsed, frozen, onExpire)
  useTimeLine(line, duration, elapsed, frozen, !item && timed && showDuration)

  if (item) {
    const down = item.count < 0
    return (
      <div
        data-slot="notice"
        data-variant="item"
        data-delta={down ? "down" : "up"}
        role="status"
        className={cn("nk-slab pointer-events-auto max-w-80", animate && "nk-enter", className)}
        {...props}
      >
        <span data-slot="notice-item-tile" className="nk-slab-tile">
          {item.image ? <img src={item.image} alt="" draggable={false} className="size-full object-contain p-0.5" /> : (item.icon ?? <PackageIcon />)}
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
      ref={staggerRef}
      data-slot="notice"
      data-status={status}
      data-paused={frozen || undefined}
      role={status === "error" ? "alert" : "status"}
      className={cn(
        noticeVariants({ iconAlign: iconAlign ?? (title && description ? "start" : "center") }),
        "gap-[calc(var(--nk-space)*3)]",
        animate && !inGroup && "nk-enter",
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
    >
      {iconEl !== null && iconEl !== false && (
        <span
          data-slot="notice-icon"
          className={cn("flex h-5 shrink-0 items-center [&_svg:not([class*='size-'])]:size-4", s.text)}
        >
          {iconEl}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 break-words">
        {title && (
          <p data-slot="notice-title" className="[font-weight:var(--nk-weight-strong,600)]">
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
          className="-my-0.5 -mr-1.5 shrink-0 text-muted-foreground"
          onClick={onDismiss}
        >
          <XIcon />
        </Button>
      )}
      {timed && showDuration && (
        <div
          ref={line}
          aria-hidden
          data-slot="notice-time"
          className={cn(
            "absolute inset-x-0 bottom-0 h-(--nk-slab-line-height) origin-left motion-reduce:hidden [html[data-nk-motion=off]_&]:hidden",
            s.line
          )}
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
  ...props
}: React.ComponentProps<"div"> & { position?: NoticePosition }) {
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
    <div
      ref={stack}
      data-slot="notice-stack"
      data-position={position}
      aria-label="Notifications"
      className={cn("pointer-events-none z-50 flex flex-col gap-2", STACK[position] ?? STACK["top-right"], className)}
      {...props}
    >
      {/* notices that arrive together come in one after another */}
      <Stagger budget={240}>{children}</Stagger>
    </div>
  )
}

/** What a script asks for: the `notify` intent's fields. */
type NoticeData = {
  /** A notice with the same id updates in place and restarts its time. */
  id?: string | number
  title?: React.ReactNode
  description?: React.ReactNode
  status?: NoticeStatus
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
}

type NoticeAction =
  | { type: "show"; key: string; at: number; notice: NoticeData; max?: number }
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
      const { notice, key, at, max = 5 } = action
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
      const drop = new Set(there.slice(0, Math.max(0, there.length + 1 - Math.max(1, max))))
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

/** A notice queue (at most `max` per position): `notify` returns the notice's key, for `dismiss`. */
function useNotices({ max = 5 }: { max?: number } = {}) {
  const [notices, dispatch] = React.useReducer(noticeReducer, [])
  const notify = React.useCallback(
    (notice: NoticeData) => {
      const key = notice.id !== undefined && notice.id !== null ? `id:${notice.id}` : `n:${++seq}`
      dispatch({ type: "show", key, at: Date.now(), notice, max })
      return key
    },
    [max]
  )
  const dismiss = React.useCallback((key: string) => dispatch({ type: "dismiss", key }), [])
  const clear = React.useCallback(() => dispatch({ type: "clear" }), [])
  return { notices, notify, dismiss, clear }
}

/**
 * Every notice of a queue, in one stack per position, each dismissed when its time runs out.
 * `closable` adds a close button to each.
 */
function Notices({
  notices,
  onDismiss,
  closable = false,
  className,
}: {
  notices: readonly NoticeEntry[]
  onDismiss: (key: string) => void
  closable?: boolean
  className?: string
}) {
  return (
    <>
      {groupNotices(notices).map(([position, list]) => (
        <NoticeStack key={position} position={position} className={className}>
          {list.map(({ key, at, id: _id, position: _position, merged, ...n }) => (
            // Keyed on `at` too: an update restarts the time (and fades in again, unless it is a
            // merged item change: that one just updates its count).
            <Notice
              key={`${key}:${at}`}
              {...n}
              animate={!merged}
              onExpire={() => onDismiss(key)}
              onDismiss={closable ? () => onDismiss(key) : undefined}
            />
          ))}
        </NoticeStack>
      ))}
    </>
  )
}

export {
  Notice,
  NoticeStack,
  Notices,
  useNotices,
  noticeVariants,
  noticeReducer,
  noticeStatus,
  noticePosition,
  noticeTimeLeft,
  noticeItemKey,
  formatItemDelta,
  groupNotices,
  NOTICE_DURATION,
  NOTICE_ITEM_MERGE_MS,
  NOTICE_POSITIONS,
  type NoticeItem,
  type NoticeStatus,
  type NoticePosition,
  type NoticeData,
  type NoticeEntry,
  type NoticeAction,
}
