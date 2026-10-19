import { ChevronRight, Eye } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/lib/icon";
import { post, useTargetMessages } from "@/lib/nui";
import { selectPayload, toGroups, type Group, type Row } from "@/lib/options";
import { loadServerTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Rows by content, so an identical `setTarget` (Lua resends on every hide flip) changes nothing. */
const signature = (groups: Group[]) => JSON.stringify(groups.map((g) => g.rows.map((r) => [r.key, r.option.label, r.option.icon, r.option.iconColor])));

export default function App() {
  const [visible, setVisible] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  // Bumped each time the list appears from empty, so it animates in once, not on every update.
  const [session, setSession] = useState(0);
  // After a click Lua usually drops focus, and CEF never sends the mouse-leave: the clicked row
  // would keep its hover style. Ignore the pointer until the mouse really moves again.
  const [inert, setInert] = useState(false);
  const last = useRef("[]");

  useEffect(() => {
    void loadServerTheme();
  }, []);

  useEffect(() => {
    if (!inert) return;
    const wake = () => setInert(false);
    // A click can be followed by a sub-pixel move in the same gesture; wait a beat before listening.
    const t = setTimeout(() => window.addEventListener("mousemove", wake, { once: true }), 150);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousemove", wake);
    };
  }, [inert]);

  const show = (next: Group[]) => {
    const sig = signature(next);
    if (sig === last.current) return;
    if (last.current === "[]" && sig !== "[]") setSession((s) => s + 1);
    last.current = sig;
    setGroups(next);
  };

  useTargetMessages((msg) => {
    switch (msg.event) {
      case "visible":
        setVisible(msg.state === true);
        setInert(false);
        show([]);
        return;
      case "leftTarget":
        show([]);
        return;
      case "setTarget":
        show(toGroups(msg.options, msg.zones));
        return;
    }
  });

  const select = (row: Row) => {
    setInert(true);
    void post("select", selectPayload(row));
  };

  if (!visible) return null;
  const active = groups.length > 0;

  return (
    <div className="pointer-events-none fixed inset-0 select-none">
      <div
        aria-hidden
        className={cn(
          "absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-md transition-all duration-150",
          active
            ? "scale-110 border-primary bg-primary text-primary-foreground ring-4 ring-primary/30"
            : "border-border bg-popover/80 text-muted-foreground",
        )}
      >
        <Eye className="size-[18px]" strokeWidth={2.25} />
      </div>

      {active && (
        <div
          key={session}
          role="menu"
          className={cn(
            "absolute top-1/2 left-1/2 ml-8 -mt-5 flex w-max max-w-80 min-w-52 flex-col rounded-lg border bg-popover/95 p-1 text-popover-foreground shadow-xl",
            "animate-in fade-in-0 slide-in-from-left-2 duration-150",
            inert ? "pointer-events-none" : "pointer-events-auto",
          )}
        >
          {groups.map((group, gi) => (
            <Fragment key={group.key}>
              {gi > 0 && <Separator className="my-1" />}
              {group.rows.map((row) => (
                <Button
                  key={row.key}
                  role="menuitem"
                  variant="ghost"
                  size="sm"
                  // Full-strength accent on hover (stock ghost uses accent/50 in dark mode, too faint
                  // over a bright game scene). While inert, hover styles are switched off outright:
                  // CEF can keep :hover matching after focus is gone.
                  className={cn(
                    "group/row w-full justify-start gap-2.5 px-2 font-normal",
                    inert
                      ? "hover:bg-transparent hover:text-foreground dark:hover:bg-transparent"
                      : "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent",
                    row.back && "text-muted-foreground hover:text-muted-foreground",
                    row.back && !inert && "hover:text-accent-foreground",
                  )}
                  onClick={() => select(row)}
                >
                  <span className={cn("flex w-4 shrink-0 justify-center text-muted-foreground", !inert && "group-hover/row:text-accent-foreground")}>
                    <Icon icon={row.option.icon} color={row.option.iconColor} />
                  </span>
                  <span className="truncate">{String(row.option.label ?? "")}</span>
                  {/* Wrapped so Button's :has(>svg) padding tweak (absent in Chromium 103) never applies. */}
                  {row.submenu && (
                    <span className={cn("ml-auto flex pl-2 text-muted-foreground", !inert && "group-hover/row:text-accent-foreground")}>
                      <ChevronRight />
                    </span>
                  )}
                </Button>
              ))}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
