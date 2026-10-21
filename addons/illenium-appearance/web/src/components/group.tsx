import { createContext, useContext, useEffect, type ReactNode } from "react";
import { MenuRow } from "@/components/ui/menu-row";
import { TextRoll } from "@/components/ui/text-roll";

/**
 * Which group of the open section is shown as its own page (null: the section's list of groups).
 * The editor owns it, so the sheet's title and back button follow it.
 */
export const GroupNav = createContext<{ open: string | null; setOpen: (v: string | null) => void; setTitle: (t: ReactNode) => void }>({
  open: null,
  setOpen: () => {},
  setTitle: () => {},
});

/**
 * A section's groups, the ox_lib context sheet's way: a list of 48px rows with hairlines between,
 * and a chosen group swaps in place of the list as its own page (the sheet's back row returns).
 * `open` (the groups an accordion used to open first) is accepted and ignored.
 */
export function Groups({ children }: { children: ReactNode; open?: string[] }) {
  const { open } = useContext(GroupNav);
  return (
    <div data-slot="ia-groups" data-mode={open ? "page" : "list"} className="ia-groups">
      {children}
    </div>
  );
}

/** One group: a row in the list (title, current value, a changed dot, a chevron), or its controls as the page. */
export function Group({ value, title, meta, changed, children }: { value: string; title: ReactNode; meta?: ReactNode; changed?: boolean; children: ReactNode }) {
  const { open, setOpen, setTitle } = useContext(GroupNav);
  const isOpen = open === value;
  useEffect(() => {
    if (isOpen) setTitle(title);
  }, [isOpen, title, setTitle]);

  if (open && !isOpen) return null;
  if (isOpen) return <div className="flex flex-col gap-5 pt-2">{children}</div>;
  return (
    <MenuRow
      className="min-h-12 text-base"
      onClick={() => setOpen(value)}
      chevron
      meta={
        <span className="flex items-center gap-2">
          {changed && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Changed" />}
          {meta !== undefined && (typeof meta === "string" || typeof meta === "number" ? <TextRoll value={String(meta)} className="text-sm" /> : meta)}
        </span>
      }
    >
      {title}
    </MenuRow>
  );
}
