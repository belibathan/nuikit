import { CheckIcon, ClockIcon, UsersIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemGroup, ItemSeparator, ItemTitle } from "@/components/ui/item";
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
        "fixed top-[30vh] right-[3vh] w-[22rem] transition-[opacity,transform] duration-150 ease-out",
        open ? "opacity-100" : "pointer-events-none translate-x-2 opacity-0",
      )}
    >
      <Card className="gap-4 border-border/60 bg-background/85 py-5 shadow-2xl backdrop-blur-md">
        <CardHeader className="gap-3 px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardDescription className="text-xs font-medium tracking-wide uppercase">Players online</CardDescription>
              <CardTitle className="flex items-baseline gap-1.5 text-2xl tracking-tight tabular-nums">
                {players}
                {max > 0 && <span className="text-base font-normal text-muted-foreground">/ {max}</span>}
              </CardTitle>
            </div>
            <div className="flex size-10 items-center justify-center rounded-full border bg-muted/40">
              <UsersIcon className="size-4 text-muted-foreground" />
            </div>
          </div>
          {max > 0 && <Progress value={Math.min(100, (players / max) * 100)} className="h-1 bg-foreground/15" />}
        </CardHeader>

        {keys.length > 0 && (
          <CardContent className="px-5">
            <ItemGroup>
              {keys.map((key, n) => {
                const a = activities[key];
                return (
                  <div key={key}>
                    {n > 0 && <ItemSeparator className="opacity-60" />}
                    <Item size="sm" className="px-0 py-2.5">
                      <ItemContent>
                        <ItemTitle className="font-normal">{labels[key] ?? a?.label ?? key}</ItemTitle>
                      </ItemContent>
                      <ItemActions>{a && <Status activity={a} cops={Number(data.currentCops) || 0} />}</ItemActions>
                    </Item>
                  </div>
                );
              })}
            </ItemGroup>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

/** The same three states qbx_scoreboard shows: busy, enough police, not enough police. */
function Status({ activity, cops }: { activity: Activity; cops: number }) {
  if (activity.busy)
    return (
      <Badge variant="secondary">
        <ClockIcon /> In progress
      </Badge>
    );
  if (cops >= (Number(activity.minimumPolice) || 0))
    return (
      <Badge>
        <CheckIcon /> Available
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <XIcon /> Unavailable
    </Badge>
  );
}
