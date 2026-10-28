import { UsersIcon } from "@/components/ui/icons";
import { useEffect, useState } from "react";
import { EdgeSheet, EdgeSheetBody } from "@/components/ui/edge-sheet";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { MenuRow, MenuRowList } from "@/components/ui/menu-row";
import { NumberRoll, TextRoll } from "@/components/ui/text-roll";
import { useLever } from "@/lib/levers";
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
  // lever (README): the screen edge, right by default
  const side = useLever("scoreboard-side", "right") === "left" ? "left" : "right";

  return (
    // A floating edge sheet on the right by default (the pause menu's backdrop, registry edge-sheet): who's
    // online traced along the header's edge, then the activities as the pause menu's rows.
    <EdgeSheet
      open={open}
      side={side}
      width="26rem"
      fit
      // below the HUD's top-right block (the minimap, location and cash), where the stock board sits
      anchor="upper"
      icon={<UsersIcon />}
      title="Players online"
      description={max > 0 ? `${players} of ${max} slots taken` : undefined}
      meter={max > 0 ? Math.min(100, (players / max) * 100) : undefined}
      meterDanger={101}
      actions={
        <span className="nk-num">
          <NumberRoll value={players} />
          {max > 0 && <span className="text-muted-foreground"> / {max}</span>}
        </span>
      }
    >
      <EdgeSheetBody>
        {keys.length > 0 ? (
          <>
            <h3 className="nk-caption pb-2">Activities</h3>
            {/* the rows of a list (one selection tile, the list gap); read-only here: the board never takes focus */}
            <MenuRowList>
              {keys.map((key) => {
                const a = activities[key];
                return (
                  <MenuRow key={key} readOnly meta={a && <Status activity={a} cops={Number(data.currentCops) || 0} />}>
                    {labels[key] ?? a?.label ?? key}
                  </MenuRow>
                );
              })}
            </MenuRowList>
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
    <span className={cn("nk-label flex shrink-0 items-center gap-2", state === "available" && "text-foreground")}>
      {/* available in the success tone, busy neutral, unavailable a quiet rim */}
      <Chip variant="dot" tone={state === "available" ? "success" : "neutral"} fill={state === "unavailable" ? "hair" : "solid"} aria-hidden />
      {/* the word rolls when the state changes (police arrive, a job starts) */}
      <TextRoll value={state === "busy" ? "In progress" : state === "available" ? "Available" : "Unavailable"} />
    </span>
  );
}
