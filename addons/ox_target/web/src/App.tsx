import { Eye } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { MenuRow } from "@/components/ui/menu-row";
import { Panel, PanelBody } from "@/components/ui/panel";
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
      {/* The eye: a HUD mark on the game (rule 8). Turns primary while something is targetable. */}
      <div
        aria-hidden
        className={cn(
          "absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-colors duration-150",
          active ? "bg-primary text-primary-foreground" : "tgt-hud",
        )}
      >
        <Eye className="size-4" />
      </div>

      {active && (
        // The `target` intent's renderer: a Panel of MenuRows beside the eye (16px gap), its first
        // row centred on it (nk-first-row). While inert, the rows' own `inert` switches every hover
        // style off: CEF can keep :hover matching after a click drops focus.
        <Panel
          key={session}
          size="auto"
          role="menu"
          className={cn("nk-first-row absolute top-1/2 left-1/2 ml-8 max-w-80 min-w-56", inert ? "pointer-events-none" : "pointer-events-auto")}
        >
          <PanelBody className="gap-0">
            {groups.map((group, gi) => (
              <Fragment key={group.key}>
                {gi > 0 && <Separator className="my-1" />}
                {group.rows.map((row) => (
                  <MenuRow
                    key={row.key}
                    role="menuitem"
                    inert={inert}
                    className={cn(row.back && "text-muted-foreground")}
                    // Always an icon slot, so labels stay aligned when an option has no (or an unknown) icon.
                    icon={
                      <span className="flex w-4 justify-center">
                        <Icon icon={row.option.icon} color={row.option.iconColor} />
                      </span>
                    }
                    chevron={row.submenu}
                    onClick={() => select(row)}
                  >
                    {String(row.option.label ?? "")}
                  </MenuRow>
                ))}
              </Fragment>
            ))}
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}
