import * as React from "react"

import { cn } from "@/lib/utils"
import { Fill } from "@/components/ui/fill"
import { Kbd } from "@/components/ui/glyph"

/**
 * ActionBar — the one hint, close and back pattern (docs/design.md §3): an optional plate, then items
 * --nk-gap-items apart. An item holds keys (Glyph sm) or an icon, plus a label, and is a <button> when it acts.
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
 *
 * One action, one place (`dedupe`, default true): when a key hint and a button in the bar name the same
 * action (the same label, or the same key), the bar renders one item that does both: the hint's keys, the
 * action's label and onClick. A `<Button>` child whose text matches a hint folds into the hint the same way.
 * `dedupe={false}` keeps every child as written.
 *
 * Role: Key hints, back and close: one bar.
 * Anatomy: plate (optional) > item: keys (Kbd Tiles) or icon, label, hold (a Fill) > separator
 * Props: plate, dedupe, keys, icon, label, onClick, level, state.
 * Rules: An item that acts is a button. Keys are Tiles, never a styled span. One action is one item.
 */
function ActionBar({ className, plate = false, dedupe = true, children, ...props }: React.ComponentProps<"div"> & { plate?: boolean; dedupe?: boolean }) {
  return (
    <div data-slot="action-bar" data-plate={plate || undefined} className={cn("nk-action-bar", className)} {...props}>
      {dedupe ? dedupeItems(children) : children}
    </div>
  )
}

/** The plain text of a node (labels, keys, a Button's children), lower-cased and trimmed; "" if none. */
function textOf(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(textOf).join("")
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children)
  return ""
}
const norm = (s: string) => s.trim().toLowerCase()

type ItemEl = React.ReactElement<ActionBarItemProps>
const isItem = (n: React.ReactNode): n is ItemEl => React.isValidElement(n) && n.type === ActionBarItem

/**
 * Hints and actions that name one action become one item: the first of a pair keeps its place; the keys
 * come from whichever has them, the label and onClick from whichever acts. A foreign element (a Button)
 * that reads like a hint's label folds into that hint, lending it its onClick.
 */
function dedupeItems(children: React.ReactNode): React.ReactNode {
  const list = React.Children.toArray(children)
  const out: (React.ReactNode | null)[] = [...list]
  const nameOf = (n: React.ReactNode) => (isItem(n) ? norm(textOf(n.props.label)) : React.isValidElement(n) ? norm(textOf(n)) : "")
  const keysOf = (n: React.ReactNode) => (isItem(n) ? (n.props.keys ?? []).map((k) => norm(textOf(k))).filter(Boolean) : [])
  for (let i = 0; i < list.length; i++) {
    const a = out[i]
    if (!isItem(a)) continue
    const an = nameOf(a)
    const ak = keysOf(a)
    for (let j = i + 1; j < list.length; j++) {
      const b = out[j]
      if (b === null || !React.isValidElement(b)) continue
      const bn = nameOf(b)
      const sameName = an !== "" && an === bn
      const sameKey = isItem(b) && ak.some((k) => keysOf(b).includes(k))
      if (!sameName && !sameKey) continue
      const bp = (isItem(b) ? b.props : (b.props as { onClick?: ActionBarItemProps["onClick"]; disabled?: boolean })) as ActionBarItemProps
      const act = a.props.onClick ? a.props : bp.onClick ? bp : a.props
      const merged: ActionBarItemProps = {
        ...a.props,
        keys: a.props.keys?.length ? a.props.keys : isItem(b) ? b.props.keys : undefined,
        label: a.props.label ?? (isItem(b) ? b.props.label : undefined),
        onClick: act.onClick,
        disabled: a.props.disabled || bp.disabled,
      }
      out[i] = React.cloneElement(a, merged)
      out[j] = null
    }
  }
  return out.filter((n) => n !== null)
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
