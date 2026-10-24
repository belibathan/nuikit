"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { ActionBar, ActionBarItem, type ActionBarItemProps } from "@/components/ui/action-bar"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Cluster } from "@/components/ui/stack"

/**
 * DialogShell — the one dialog chrome (docs/design/ink.md §3, Dialog shell): stock shadcn Dialog (or
 * AlertDialog) content on the plate recipe, with a header, a padded body and an action-bar footer.
 *
 *   <DialogShell open={open} onOpenChange={setOpen} title="Transfer" description="To another account"
 *     hints={[{ keys: ["Esc"], label: "Cancel", onClick: close }]}
 *     footer={<Button onClick={send}>Send</Button>}>
 *     <FormField … />
 *   </DialogShell>
 *   <DialogShell alert open={ask} title="Sell the car?" description="You get $12,000." footer={…} />
 *
 * Role: a modal question or form over the current surface (the surface + dim + dialog layers, never a new screen).
 * Anatomy: plate (.nk-plate) > header (title role, body-role description, a hairline) > body (--nk-gap-surface)
 *   > footer (an ActionBar of hints on the left, Buttons on the right, a hairline above).
 * Props: size (sm | md | lg), position (center | top), alert, title, description, hints, footer, onOpenChange.
 * Rules: a centred dialog animates opacity only (transforms break a centred box); a top dialog may also rise
 *   by --nk-gesture-rise. It sits on --nk-layer-dialog. One primary Button per dialog. Never restyle it locally: a theme
 *   sets --nk-plate-*.
 */

const SIZE = { sm: "max-w-[24rem]", md: "max-w-[32rem]", lg: "max-w-[40rem]" } as const

/** Which Radix primitive the parts use (Title and Description must match their root). */
const AlertContext = React.createContext(false)

type DialogShellProps = Omit<React.ComponentProps<typeof DialogContent>, "title"> & {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** An AlertDialog (no outside dismiss, role alertdialog) instead of a Dialog. */
  alert?: boolean
  size?: keyof typeof SIZE
  /** center (opacity only) or top (an upper third anchor that rises by --nk-gesture-rise). */
  position?: "center" | "top"
  title?: React.ReactNode
  description?: React.ReactNode
  /** The footer's ActionBar: hints and back / close items (keys, label, onClick). */
  hints?: ActionBarItemProps[]
  /** The footer's buttons (right-aligned): one primary. */
  footer?: React.ReactNode
}

function DialogShell({
  open,
  onOpenChange,
  alert = false,
  size = "md",
  position = "center",
  title,
  description,
  hints,
  footer,
  className,
  children,
  ...props
}: DialogShellProps) {
  const Root = alert ? AlertDialog : Dialog
  const Content = (alert ? AlertDialogContent : DialogContent) as React.ComponentType<React.ComponentProps<typeof DialogContent>>
  const extra = alert ? {} : { showCloseButton: false }
  return (
    <AlertContext.Provider value={alert}>
      <Root open={open} onOpenChange={onOpenChange}>
        <Content
          data-slot="dialog-shell"
          data-position={position}
          data-size={size}
          {...extra}
          className={cn(
            // the plate recipe instead of shadcn's card (no border, no soft shadow, the surface radius)
            "nk-plate z-(--nk-layer-dialog,60) flex w-full flex-col gap-0 overflow-hidden border-0 bg-(--nk-plate-bg) p-0 shadow-none sm:max-w-none",
            SIZE[size] ?? SIZE.md,
            // motion: opacity only when centred; a top dialog rises by --nk-gesture-rise (enter slow, exit 0.7×)
            "data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100",
            "data-[state=open]:duration-(--nk-time-slow,280ms) data-[state=open]:ease-(--nk-ease-expand)",
            "data-[state=closed]:duration-(--nk-time-exit,196ms) data-[state=closed]:ease-(--nk-ease-exit)",
            position === "top" && "top-[18vh] translate-y-0 data-[state=open]:slide-in-from-bottom-(--nk-gesture-rise)",
            className
          )}
          {...props}
        >
          {(title || description) && <DialogShellHeader title={title} description={description} />}
          {children !== undefined && children !== null && <DialogShellBody>{children}</DialogShellBody>}
          {(hints?.length || footer) && <DialogShellFooter hints={hints}>{footer}</DialogShellFooter>}
        </Content>
      </Root>
    </AlertContext.Provider>
  )
}

/** The header: a title-role title, a body-role description, a hairline under it. */
function DialogShellHeader({
  className,
  title,
  description,
  children,
  ...props
}: Omit<React.ComponentProps<"header">, "title"> & { title?: React.ReactNode; description?: React.ReactNode }) {
  const alert = React.useContext(AlertContext)
  const Title = alert ? AlertDialogTitle : DialogTitle
  const Description = alert ? AlertDialogDescription : DialogDescription
  return (
    <header
      data-slot="dialog-shell-header"
      className={cn("flex flex-col gap-(--nk-space-1) border-b border-(--nk-plate-hair) px-(--nk-gap-surface) py-(--nk-space-4)", className)}
      {...props}
    >
      <Title className="nk-title">{title}</Title>
      {description ? (
        <Description className="nk-body text-muted-foreground">{description}</Description>
      ) : (
        <Description className="sr-only">{typeof title === "string" ? title : ""}</Description>
      )}
      {children}
    </header>
  )
}

/** The body, padded by --nk-gap-surface. */
function DialogShellBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-shell-body" className={cn("nk-body min-h-0 p-(--nk-gap-surface)", className)} {...props} />
}

/** The footer: an ActionBar of hints on the left, buttons on the right. */
function DialogShellFooter({ className, hints, children, ...props }: React.ComponentProps<"footer"> & { hints?: ActionBarItemProps[] }) {
  return (
    <footer
      data-slot="dialog-shell-footer"
      className={cn("flex items-center gap-(--nk-gap-cluster) border-t border-(--nk-plate-hair) px-(--nk-gap-surface) py-(--nk-space-3)", className)}
      {...props}
    >
      {hints && hints.length > 0 && (
        <ActionBar className="-ml-(--nk-space-2) min-w-0">
          {hints.map((h, i) => (
            <ActionBarItem key={i} {...h} />
          ))}
        </ActionBar>
      )}
      <Cluster data-slot="dialog-shell-actions" className="ml-auto shrink-0">
        {children}
      </Cluster>
    </footer>
  )
}

export { DialogShell, DialogShellHeader, DialogShellBody, DialogShellFooter, type DialogShellProps }
