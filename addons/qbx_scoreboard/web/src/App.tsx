import { UsersIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { EdgeSheet, EdgeSheetBody } from "@/components/ui/edge-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
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
    // A floating edge sheet on the right (the pause menu's backdrop, registry edge-sheet): who's
    // online traced along the header's edge, then the activities as the pause menu's rows.
    <EdgeSheet
      open={open}
      side="right"
      width="26rem"
      fit
      // below the HUD's top-right block (the minimap, location and cash), where the stock board sits
      className="top-[30vh]"
      icon={<UsersIcon />}
      title="Players online"
      description={max > 0 ? `${players} of ${max} slots taken` : undefined}
      meter={max > 0 ? Math.min(100, (players / max) * 100) : undefined}
      meterDanger={101}
      actions={
        <span className="nk-num text-base font-semibold">
          {players}
          {max > 0 && <span className="font-normal text-muted-foreground"> / {max}</span>}
        </span>
      }
    >
      <EdgeSheetBody>
        {keys.length > 0 ? (
          <>
            <h3 className="nk-caption pb-2">Activities</h3>
            <ul className="flex flex-col">
              {keys.map((key, i) => {
                const a = activities[key];
                return (
                  <li key={key}>
                    {i > 0 && <Separator />}
                    <div className="flex min-h-12 items-center justify-between gap-3 text-base font-medium">
                      <span className="truncate">{labels[key] ?? a?.label ?? key}</span>
                      {a && <Status activity={a} cops={Number(data.currentCops) || 0} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <EmptyState title="No activities" description="This server hasn't listed any police-gated activities." />
        )}
      </EdgeSheetBody>
    </EdgeSheet>
  );
}

/** The same three states qbx_scoreboard shows: busy, enough police, not enough police. */
function Status({ activity, cops }: { activity: Activity; cops: number }) {
  const state = activity.busy ? "busy" : cops >= (Number(activity.minimumPolice) || 0) ? "available" : "unavailable";
  return (
    <span className={cn("nk-label flex shrink-0 items-center gap-2 text-sm!", state === "available" && "text-foreground")}>
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          state === "available" ? "bg-primary" : state === "busy" ? "bg-muted-foreground" : "border border-muted-foreground/60",
        )}
      />
      {state === "busy" ? "In progress" : state === "available" ? "Available" : "Unavailable"}
    </span>
  );
}
