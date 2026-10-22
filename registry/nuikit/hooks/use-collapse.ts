import * as React from "react"
import { tokenMs } from "nuikit-core/motion"

/**
 * The collapse engine (Foundation 2, wave 3) for clustered indicators: vitals, voice, anything that sits in a
 * row of icons. At rest only the icons show; a change opens that key's chip for --nk-rest-delay; changes that
 * come within the batch window of each other join one stack and close together; the stack shows critical
 * keys first, then the biggest change; at most `max` open, the rest counted as "+N". Keys can opt out (never
 * open).
 *
 *   const c = useCollapse({ max: 3 })
 *   useEffect(() => c.report("hunger", hunger, { critical: hunger < 20 }), [hunger])
 *   c.isOpen("hunger") · c.rank("hunger") · c.overflow
 *
 * The state functions are pure (collapseReport, collapseExpire, collapseOrder), so any UI or a test can drive
 * them with its own clock.
 */

export type CollapseEntry = {
  key: string
  /** the change since the chip opened (adds up while it stays open) */
  delta: number
  critical: boolean
  /** the batch it last joined; a batch closes together */
  batch: number
  /** when it closes (ms, the caller's clock) */
  until: number
}

export type CollapseState = {
  /** the last value seen per key (the first report only records it) */
  last: Record<string, number>
  open: CollapseEntry[]
  batch: number
  /** when the current batch started */
  batchAt: number
}

export type CollapseOptions = {
  /** how long a chip stays open after the last change of its batch (ms) */
  restDelay: number
  /** changes this close together (ms) join one batch */
  batchMs: number
  /** a change smaller than this doesn't open a chip (regeneration ticks), unless critical */
  min?: number
  /** keys that never open */
  optOut?: readonly string[]
}

export const COLLAPSE_BATCH_MS = 400

export const collapseInit = (): CollapseState => ({ last: {}, open: [], batch: 0, batchAt: -Infinity })

/** A new value for `key` at `now`: opens (or keeps open) its chip, joining the current batch if it's recent. */
export function collapseReport(
  state: CollapseState,
  key: string,
  value: number,
  now: number,
  opts: CollapseOptions,
  critical = false
): CollapseState {
  const prev = state.last[key]
  const last = { ...state.last, [key]: value }
  if (prev === undefined || !Number.isFinite(value)) return { ...state, last }
  const delta = value - prev
  const wasOpen = state.open.find((e) => e.key === key)
  const crossed = critical && !wasOpen?.critical
  if (opts.optOut?.includes(key) || (delta === 0 && !crossed) || (Math.abs(delta) < (opts.min ?? 0) && !critical)) return { ...state, last }
  const join = state.open.length > 0 && now - state.batchAt <= opts.batchMs
  const batch = join ? state.batch : state.batch + 1
  const batchAt = join ? state.batchAt : now
  const until = now + opts.restDelay
  const entry: CollapseEntry = { key, delta: (wasOpen?.delta ?? 0) + delta, critical, batch, until }
  // everything in this batch closes together
  const open = [...state.open.filter((e) => e.key !== key), entry].map((e) => (e.batch === batch ? { ...e, until } : e))
  return { last, open, batch, batchAt }
}

/** Close what's due at `now`. */
export function collapseExpire(state: CollapseState, now: number): CollapseState {
  const open = state.open.filter((e) => e.until > now)
  return open.length === state.open.length ? state : { ...state, open }
}

/** The open chips in order (critical first, then the biggest change, then the newest batch), at most `max`. */
export function collapseOrder(open: readonly CollapseEntry[], max: number): { shown: CollapseEntry[]; overflow: number } {
  const sorted = [...open].sort(
    (a, b) => Number(b.critical) - Number(a.critical) || Math.abs(b.delta) - Math.abs(a.delta) || b.batch - a.batch || a.key.localeCompare(b.key)
  )
  const n = Math.max(0, max)
  return { shown: sorted.slice(0, n), overflow: Math.max(0, sorted.length - n) }
}

export type UseCollapseOptions = Partial<CollapseOptions> & {
  /** at most this many open; the rest are "+N" */
  max?: number
}

/** The engine with timers: reports, the ordered open keys, and the overflow count. */
export function useCollapse({ max = 3, restDelay, batchMs = COLLAPSE_BATCH_MS, min = 0, optOut }: UseCollapseOptions = {}) {
  // the last values live in a ref: a report that opens nothing (most ticks) re-renders nothing; only a change
  // of the open set does
  const state = React.useRef(collapseInit())
  const [open, setOpen] = React.useState<CollapseEntry[]>([])
  const commit = React.useCallback((next: CollapseState) => {
    const was = state.current.open
    state.current = next
    if (next.open !== was) setOpen(next.open)
  }, [])
  const opts = React.useRef<CollapseOptions>({ restDelay: 2500, batchMs, min, optOut })
  // --nk-rest-delay is 0 (never) by default: a chip that opens on a change still closes, after 2.5 s
  opts.current = { restDelay: restDelay ?? (tokenMs("--nk-rest-delay", 0) || 2500), batchMs, min, optOut }

  const report = React.useCallback((key: string, value: number, o: { critical?: boolean } = {}) => {
    commit(collapseReport(state.current, key, value, Date.now(), opts.current, !!o.critical))
  }, [commit])

  // close the next one when it's due
  const next = open.length ? Math.min(...open.map((e) => e.until)) : null
  React.useEffect(() => {
    if (next === null) return
    const t = setTimeout(() => commit(collapseExpire(state.current, Date.now())), Math.max(0, next - Date.now()))
    return () => clearTimeout(t)
  }, [next, commit])

  // one object per open-set change, so consumers that memo on it re-render only then
  return React.useMemo(() => {
    const { shown, overflow } = collapseOrder(open, max)
    const order = shown.map((e) => e.key)
    return {
      report,
      /** the open keys, in order */
      open: order,
      overflow,
      isOpen: (key: string) => order.includes(key),
      /** a key's place in the stack (0 first), or -1 at rest */
      rank: (key: string) => order.indexOf(key),
      /** the change a key's chip shows */
      delta: (key: string) => shown.find((e) => e.key === key)?.delta ?? 0,
    }
  }, [open, max, report])
}
