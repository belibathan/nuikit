import { UsersIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MenuRow } from "@/components/ui/menu-row";
import { Meter } from "@/components/ui/meter";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { loadServerTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** One entry of GlobalState.illegalActions (docs/qbx-scoreboard-protocol.md). */
interface Activity {
  label?: string;
  minimumPolice?: number;
  busy?: boolean;
}

interface OpenData {
  players?: number;
  maxPlayers?: number;
  requiredCops?: Record<string, Activity> | null;
  currentCops?: number;
}

type Msg = { action?: string; items?: Record<string, string> } & OpenData;

/** qbx_scoreboard posts flat messages ({ action, ...fields }); devtools posts { action, data }. */
function toMsg(raw: unknown): Msg | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.action !== "string") return null;
  if (m.data && typeof m.data === "object" && !Array.isArray(m.data)) return { ...(m.data as object), action: m.action };
  return m as Msg;
}

/** How long the panel takes to leave (--nk-time-exit, 98 ms in Graphite; the stock page fades over ~150 ms). */
const EXIT_MS = 160;

/**
 * qbx_scoreboard's board: players online against the server's slots, and every heist or robbery as
 * available, in progress or unavailable. Read only: the page never posts to qbx_scoreboard
 * (docs/qbx-scoreboard-protocol.md). A kit Panel with a Meter under the title and read-only rows.
 */
export default function App() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [opened, setOpened] = useState(0); // bumps on every open: the panel re-enters
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [data, setData] = useState<OpenData>({});
  const exit = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    loadServerTheme();
    const onMessage = (e: MessageEvent) => {
      const m = toMsg(e.data);
      if (!m) return;
      if (m.action === "setup") setLabels(m.items && typeof m.items === "object" ? m.items : {});
      else if (m.action === "open") {
        clearTimeout(exit.current);
        setData(m);
        setClosing(false);
        setOpen((was) => {
          if (!was) setOpened((n) => n + 1);
          return true;
        });
      } else if (m.action === "close") {
        setOpen((was) => {
          if (was) {
            setClosing(true);
            clearTimeout(exit.current);
            exit.current = setTimeout(() => setClosing(false), EXIT_MS);
          }
          return false;
        });
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(exit.current);
    };
  }, []);

  if (!open && !closing) return null;

  const activities = data.requiredCops && typeof data.requiredCops === "object" ? data.requiredCops : {};
  // `setup` fixes the order; anything it missed (sent before the page loaded) is added from `open`.
  const keys = [...Object.keys(labels), ...Object.keys(activities).filter((k) => !(k in labels))];
  const players = Number(data.players) || 0;
  const max = Number(data.maxPlayers) || 0;
  const cops = Number(data.currentCops) || 0;

  return (
    <div className="fixed top-[30vh] right-[var(--nk-edge,1.5rem)]">
      <Panel
        key={opened}
        animate={false}
        data-state={open ? "open" : "closed"}
        aria-hidden={!open}
        className="nk-pop origin-top-right"
      >
        <PanelHeader
          icon={<UsersIcon />}
          title="Players online"
          actions={
            <span className="nk-num text-sm font-medium">
              {players}
              {max > 0 && <span className="text-muted-foreground"> / {max}</span>}
            </span>
          }
          tabs={max > 0 ? <Meter aria-label="Players online" value={players} max={max} size="sm" /> : undefined}
        />
        {keys.length > 0 && (
          <PanelBody>
            {keys.map((key) => {
              const a = activities[key];
              const state = a ? stateOf(a, cops) : null;
              return (
                <MenuRow
                  key={key}
                  readOnly
                  data-state={state ?? undefined}
                  icon={state && <StateDot state={state} />}
                  meta={state && <span className={cn("text-xs", state === "available" && "text-foreground")}>{STATE_LABEL[state]}</span>}
                  className={cn(state === "unavailable" && "text-muted-foreground")}
                >
                  {labels[key] ?? a?.label ?? key}
                </MenuRow>
              );
            })}
          </PanelBody>
        )}
      </Panel>
    </div>
  );
}

type ActivityState = "busy" | "available" | "unavailable";

const STATE_LABEL: Record<ActivityState, string> = { busy: "In progress", available: "Available", unavailable: "Unavailable" };

/** The same three states qbx_scoreboard shows, in its order: busy, enough police, not enough police. */
function stateOf(activity: Activity, cops: number): ActivityState {
  if (activity.busy) return "busy";
  return cops >= (Number(activity.minimumPolice) || 0) ? "available" : "unavailable";
}

/** Colour and shape carry the state together with the word: filled success, filled warning, hollow. */
function StateDot({ state }: { state: ActivityState }) {
  return (
    <span className="flex size-4 items-center justify-center">
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          state === "available" && "bg-success",
          state === "busy" && "bg-warning",
          state === "unavailable" && "border border-muted-foreground/60",
        )}
      />
    </span>
  );
}
