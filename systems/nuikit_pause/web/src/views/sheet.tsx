// The pause menu's one surface: shadcn's Sheet (Radix Dialog, non-modal) on the left edge, flush to
// the top, left and bottom, the same model as the ox_lib context menu. It slides in once when the menu
// opens; going to a sub-page (Map, Key bindings, Info, Help) or back swaps the column inside it with a
// short fade instead of closing and reopening it. The rows of the first page rise in one after another.
import { ChevronLeftIcon } from "lucide-react";
import { useSurfaceOpen } from "nuikit-core/react";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** The sheet's width; the open area (the focus camera's frame, the map) starts here. */
export const SHEET_W = "36rem";

/**
 * Radix's dismissable layer handles Escape on the document (capture) and marks it handled, which would
 * hide it from nuikit's own Escape (the surface stack: sub-page → Home → close). So the sheet hands
 * every Escape that isn't typed in a field back to the window, where the pause menu and nuikit see it.
 */
function passEscape(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  const handled = e.defaultPrevented; // the pause menu already took it (a sub-page went back)
  e.preventDefault(); // Radix's dismiss stays off: the sheet never closes itself
  if (handled) return;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
}

export function PauseSheet({ page, first, children }: { page: string; first: boolean; children: ReactNode }) {
  return (
    // closes with the surface: nuikit keeps it drawn for the slide-out (useSurfaceOpen)
    <Sheet open={useSurfaceOpen()} modal={false}>
      <SheetContent
        side="left"
        showCloseButton={false}
        aria-describedby={undefined}
        onEscapeKeyDown={passEscape}
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="pause-sheet z-50 gap-0 p-0 sm:max-w-none"
        style={{ width: SHEET_W }}
      >
        {/* each page is its own column: a new one fades in (the sheet itself only slides on open) */}
        <div key={page} className={cn("flex h-full min-h-0 flex-col", !first && "nk-enter")}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * A sub-page: a back row and the page's title, then one scrolling column of sections separated by
 * hairlines (no cards inside the sheet).
 */
export function SheetPage({
  title,
  description,
  onBack,
  actions,
  children,
  footer,
}: {
  title: ReactNode;
  description?: ReactNode;
  onBack: () => void;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const back = useRef<HTMLButtonElement>(null);
  // keyboard and controller land on the way back first
  useEffect(() => {
    back.current?.focus({ preventScroll: true });
  }, []);
  // the same column as Home: 28rem, right-aligned in the sheet, so every page lines up
  return (
    <div className="flex h-full min-h-0 justify-end">
      <div className="flex h-full min-h-0 w-full max-w-[28rem] flex-col">
      <header className="flex flex-col gap-4 pt-12 pr-12 pb-6 pl-6">
        <Button ref={back} variant="ghost" size="sm" className="-ml-3 w-fit text-muted-foreground" onClick={onBack}>
          <ChevronLeftIcon />
          Back
          <Kbd className="ml-1">Esc</Kbd>
        </Button>
        <div className="flex items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <SheetTitle asChild>
              <h1 className="pause-page-title nk-title truncate">{title}</h1>
            </SheetTitle>
            {description ? <p className="nk-label truncate text-muted-foreground">{description}</p> : null}
          </div>
          {actions}
        </div>
      </header>
      <ScrollArea className="mr-12 ml-6 min-h-0 flex-1 border-t border-border">
        <div className="flex flex-col py-6">{children}</div>
      </ScrollArea>
      {footer ? <footer className="border-t border-border py-6 pr-12 pl-6">{footer}</footer> : null}
      </div>
    </div>
  );
}

/** A section in a sheet page: a caption and its rows, a hairline above the next one. */
export function SheetSection({ label, meta, children, className }: { label?: ReactNode; meta?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0", className)}>
      {label ? (
        <div className="flex items-center gap-2 pb-2">
          <p className="nk-caption flex-1 text-muted-foreground">{label}</p>
          {meta ? <span className="nk-label nk-num text-muted-foreground">{meta}</span> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** The first five rows of the first page rise in, one after another (design.md, motion 7). */
export function rise(i: number | undefined): { className?: string; style?: CSSProperties } {
  if (i === undefined) return {};
  return { className: "nk-rise nk-stagger", style: { "--i": Math.min(i, 5) } as CSSProperties };
}

