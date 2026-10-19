import { UsersIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
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

export default function App() {
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [data, setData] = useState<OpenData>({});

  useEffect(() => {
    loadServerTheme();
    const onMessage = (e: MessageEvent) => {
      const m = toMsg(e.data);
      if (!m) return;
      if (m.action === "setup") setLabels(m.items && typeof m.items === "object" ? m.items : {});
      else if (m.action === "open") {
        setData(m);
        setOpen(true);
      } else if (m.action === "close") setOpen(false);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const activities = data.requiredCops && typeof data.requiredCops === "object" ? data.requiredCops : {};
  // `setup` fixes the order; anything it missed (sent before the page loaded) is added from `open`.
  const keys = [...Object.keys(labels), ...Object.keys(activities).filter((k) => !(k in labels))];
  const players = Number(data.players) || 0;
  const max = Number(data.maxPlayers) || 0;

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed top-[30vh] right-6 w-80 transition-[opacity,transform] duration-150 ease-out",
        open ? "opacity-100" : "pointer-events-none translate-x-2 opacity-0",
      )}
    >
      <section className="nk-panel overflow-hidden">
        <header className="nk-panel-header border-b-0">
          <UsersIcon className="size-4 text-muted-foreground" />
          <h2 className="nk-title flex-1">Players online</h2>
          <span className="nk-num text-sm font-medium">
            {players}
            {max > 0 && <span className="text-muted-foreground"> / {max}</span>}
          </span>
        </header>
        {max > 0 ? (
          <Progress value={Math.min(100, (players / max) * 100)} className="h-px rounded-none" />
        ) : (
          <div className="border-t" />
        )}

        {keys.length > 0 && (
          <ul className="nk-panel-body">
            {keys.map((key) => {
              const a = activities[key];
              return (
                <li key={key} className="nk-row justify-between">
                  <span className="truncate">{labels[key] ?? a?.label ?? key}</span>
                  {a && <Status activity={a} cops={Number(data.currentCops) || 0} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** The same three states qbx_scoreboard shows: busy, enough police, not enough police. */
function Status({ activity, cops }: { activity: Activity; cops: number }) {
  const state = activity.busy ? "busy" : cops >= (Number(activity.minimumPolice) || 0) ? "available" : "unavailable";
  return (
    <span className={cn("nk-label flex shrink-0 items-center gap-2", state === "available" && "text-foreground")}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          state === "available" ? "bg-primary" : state === "busy" ? "bg-muted-foreground" : "border border-muted-foreground/60",
        )}
      />
      {state === "busy" ? "In progress" : state === "available" ? "Available" : "Unavailable"}
    </span>
  );
}
