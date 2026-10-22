import * as React from "react"

import { cn } from "@/lib/utils"
import { Fill } from "@/components/ui/fill"
import { Kbd } from "@/components/ui/tile"

/**
 * ActionBar — the one hint, close and back pattern (docs/design/ink.md §3): an optional plate, then items
 * --nk-gap-items apart. An item holds keys (Tile sm) or an icon, plus a label, and is a <button> when it acts.
 * kit.css draws it (`.nk-action-bar` and the action-bar-* slots); a theme sets tokens.
 *
 *   <ActionBar plate>
 *     <ActionBarItem keys={["Tab"]} label="Choose" />
 *     <ActionBarItem keys={["Enter"]} label="Confirm" />
 *     <ActionBarItem keys={["Esc"]} label="Back" onClick={back} />
 *     <ActionBarSep />
 *     <ActionBarItem icon={<MoveHorizontalIcon />} label="Drag to look around" />
 *   </ActionBar>
 *
 * `level` (0–1) shows a hold filling under the item; `state` is the shared data-state.
 */
function ActionBar({ className, plate = false, ...props }: React.ComponentProps<"div"> & { plate?: boolean }) {
  return <div data-slot="action-bar" data-plate={plate || undefined} className={cn("nk-action-bar", className)} {...props} />
}

type ActionBarItemProps = Omit<React.ComponentProps<"button">, "children"> & {
  keys?: React.ReactNode[]
  icon?: React.ReactNode
  label?: React.ReactNode
  /** Hold progress, 0–1. */
  level?: number
  state?: "rest" | "focus" | "hold" | "confirm" | "alert" | "disabled"
  children?: React.ReactNode
}

function ActionBarItem({ className, keys, icon, label, level, state, onClick, children, disabled, ...props }: ActionBarItemProps) {
  const body = (
    <>
      {keys && keys.length > 0 && (
        <span data-slot="action-bar-keys">
          {keys.map((k, i) => (
            <Kbd key={i} state={state === "hold" || state === "confirm" ? state : undefined}>
              {k}
            </Kbd>
          ))}
        </span>
      )}
      {!keys?.length && icon}
      {label !== undefined && <ActionBarLabel>{label}</ActionBarLabel>}
      {children}
      {level !== undefined && <Fill level={level} />}
    </>
  )
  const st = disabled ? "disabled" : state && state !== "rest" ? state : undefined
  if (onClick) {
    return (
      <button type="button" data-slot="action-bar-item" data-state={st} disabled={disabled} onClick={onClick} className={cn(className)} {...props}>
        {body}
      </button>
    )
  }
  return (
    <span data-slot="action-bar-item" data-state={st} className={cn(className)} {...(props as React.ComponentProps<"span">)}>
      {body}
    </span>
  )
}

function ActionBarLabel({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="action-bar-label" className={cn(className)} {...props} />
}

function ActionBarSep({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="action-bar-sep" aria-hidden className={cn(className)} {...props} />
}

export { ActionBar, ActionBarItem, ActionBarLabel, ActionBarSep, type ActionBarItemProps }
