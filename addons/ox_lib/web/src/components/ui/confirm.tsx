// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/confirm.tsx, then run pnpm sync.
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, nkVariant, type NkVariantProps } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel"
import { Spinner } from "@/components/ui/spinner"

/**
 * Confirm — "are you sure?" over the game: a title, a body, cancel and one action that is either
 * the surface's primary or destructive. The default look of the `confirm` intent
 * (docs/architecture.md §2).
 *
 *   <Surface name="sell-car" layer="modal" escape="back" onBack={cancel}>
 *     <Confirm
 *       title="Sell your Zentorno?"
 *       description="You get $412,000. This can't be undone."
 *       tone="destructive"
 *       confirmLabel="Sell"
 *       onConfirm={sell}
 *       onCancel={cancel}
 *     />
 *   </Surface>
 *
 * Keys, with no private Escape or Enter handler (protocol §3.5):
 * - Escape goes through surfaces like any other: nuikit:escape → Lua → nuikit:back → the
 *   surface's onBack, which you point at onCancel. (Radix dialogs swallow Escape before nuikit
 *   sees it, which is why this isn't an AlertDialog.)
 * - Enter presses the focused button. The action has focus when it opens, so Enter confirms;
 *   `initialFocus="cancel"` starts on cancel instead. Tab stays inside the dialog.
 *
 * `ConfirmPanel` is the panel alone, every state from props, for previews or your own layout.
 *
 * Role: A decision before something that can't be undone.
 * Anatomy: confirm-root + scrim > confirm (icon, title, description) > cancel, action
 * Props: title, description, tone, confirmLabel, cancelLabel, loading, scrim, initialFocus, density, shape,
 *   motion.
 * Rules: Focus starts on the action; Escape and Cancel go back. Destructive actions say so in the label.
 */

const confirmVariants = cva("", {
  variants: {
    size: {
      sm: "w-80",
      default: "w-96",
      lg: "w-[28rem]",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

type ConfirmTone = "primary" | "destructive"

type ConfirmPanelProps = Omit<React.ComponentProps<"section">, "title"> &
  VariantProps<typeof confirmVariants> & {
    title: React.ReactNode
    /** The body: what happens, in a sentence or two. */
    description?: React.ReactNode
    icon?: React.ReactNode
    /** primary: the surface's main action. destructive: it loses something (sell, delete, leave). */
    tone?: ConfirmTone
    confirmLabel?: React.ReactNode
    cancelLabel?: React.ReactNode
    /** false: only the action (a notice the player must acknowledge). */
    showCancel?: boolean
    /** The action is running: a spinner, and both buttons wait. */
    loading?: boolean
    onConfirm?: () => void
    onCancel?: () => void
    /** Which button has focus when it opens (Enter presses it). */
    initialFocus?: "confirm" | "cancel" | "none"
  }

function ConfirmPanel({
  className,
  size,
  title,
  description,
  icon,
  tone = "primary",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  showCancel = true,
  loading = false,
  onConfirm,
  onCancel,
  initialFocus = "none",
  children,
  density,
  shape,
  motion,
  ...props
}: NkVariantProps & ConfirmPanelProps) {
  const id = React.useId()
  const confirmRef = React.useRef<HTMLButtonElement>(null)
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    const el = initialFocus === "cancel" && showCancel ? cancelRef.current : initialFocus !== "none" ? confirmRef.current : null
    el?.focus()
    // On open only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Panel
      {...nkVariant({ density, shape, motion })}
      data-slot="confirm"
      data-tone={tone}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      aria-busy={loading || undefined}
      className={cn(confirmVariants({ size }), className)}
      {...props}
    >
      <PanelHeader
        icon={
          icon && (
            <span data-slot="confirm-icon" className={cn("flex", tone === "destructive" && "text-destructive")}>
              {icon}
            </span>
          )
        }
        title={<span id={`${id}-title`}>{title}</span>}
      />
      {(description || children) && (
        <PanelBody variant="form" className="gap-3">
          {description && (
            <div id={`${id}-description`} data-slot="confirm-description" className="text-(length:--nk-text-label) leading-5 text-pretty text-muted-foreground">
              {description}
            </div>
          )}
          {children}
        </PanelBody>
      )}
      <PanelFooter>
        {showCancel && (
          <Button ref={cancelRef} type="button" variant="outline" size="sm" disabled={loading} onClick={onCancel} data-slot="confirm-cancel">
            {cancelLabel}
          </Button>
        )}
        <Button
          ref={confirmRef}
          type="button"
          size="sm"
          variant={tone === "destructive" ? "destructive" : "default"}
          disabled={loading}
          onClick={onConfirm}
          data-slot="confirm-action"
          className="ml-auto"
        >
          {loading && <Spinner />}
          {confirmLabel}
        </Button>
      </PanelFooter>
    </Panel>
  )
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Where Tab goes from `index` in a list of `count` focusables: wraps at both ends. */
function wrapFocus(index: number, count: number, backwards: boolean) {
  if (count <= 0) return -1
  if (index < 0) return backwards ? count - 1 : 0
  return (index + (backwards ? -1 : 1) + count) % count
}

/**
 * The modal: a scrim over the game and the panel centred on it. It fills its container
 * (position: absolute), so put it inside a full-screen root: a nuikit Surface.
 */
function Confirm({
  scrim = true,
  initialFocus = "confirm",
  className,
  ...props
}: NkVariantProps & ConfirmPanelProps & {
  /** Darken the game behind it. */
  scrim?: boolean
}) {
  const root = React.useRef<HTMLDivElement>(null)

  // Give focus back to whatever had it when the dialog goes. Read on the first render: by the
  // time an effect here runs, the panel's own effect has already moved focus to the action.
  const [opener] = React.useState(() => (typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null)))
  React.useEffect(() => () => opener?.focus?.(), [opener])

  return (
    <div
      ref={root}
      data-slot="confirm-root"
      className="absolute inset-0 z-50 grid place-items-center p-6"
      onKeyDown={(e) => {
        // Focus containment only: Escape and Enter are left to the surface and the buttons.
        if (e.key !== "Tab") return
        const items = [...(root.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
        if (!items.length) return
        e.preventDefault()
        items[wrapFocus(items.indexOf(document.activeElement as HTMLElement), items.length, e.shiftKey)]?.focus()
      }}
    >
      {scrim && (
        // nk-enter ends at opacity 1 (fill both), so the 50% lives on the layer inside it.
        <div aria-hidden data-slot="confirm-scrim" className="nk-enter absolute inset-0">
          <div className="size-full bg-(--scrim) opacity-50" />
        </div>
      )}
      <ConfirmPanel role="alertdialog" aria-modal="true" initialFocus={initialFocus} className={cn("relative", className)} {...props} />
    </div>
  )
}

export { Confirm, ConfirmPanel, confirmVariants, wrapFocus, type ConfirmTone, type ConfirmPanelProps }
