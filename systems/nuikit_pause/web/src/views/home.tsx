import { fetchNui, type NuiPlayer } from "nuikit-core/react";
import { ActivityIcon, LandmarkIcon, MoveHorizontalIcon, RotateCwIcon, TimerIcon, UsersIcon, WalletIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import type { PauseData } from "../nui";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HudChip } from "@/components/ui/hud-chip";
import { Kbd } from "@/components/ui/kbd";
import { Meter } from "@/components/ui/meter";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel";
import { Stat } from "@/components/ui/stat";
import { useFrameBatch } from "@/lib/batch";
import { duration, initials, money } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Home: an empty stage in the middle (the stand-in stands there in game) and the cards on the right. */
export function Home({ data, player, standIn }: { data: PauseData; player: NuiPlayer; standIn: boolean }) {
  return (
    <>
      <Stage active={standIn} />
      <main className="flex w-[26rem] shrink-0 flex-col items-end justify-center gap-4 px-12">
        <PlayerCard player={player} data={data} />
        <ServerCard data={data} />
      </main>
    </>
  );
}

/**
 * The middle of the screen. In game the player's stand-in is framed inside it, so it reports its
 * rectangle to Lua; dragging across it turns the character.
 */
function Stage({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const turn = useFrameBatch((dx) => void fetchNui("pause:preview:rotate", { dx }).catch(() => {}));
  const drag = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    const report = () => {
      const r = el.getBoundingClientRect();
      const w = window.innerWidth;
      const h = window.innerHeight;
      void fetchNui("pause:preview:frame", { x: r.left / w, y: r.top / h, w: r.width / w, h: r.height / h }).catch(() => {});
    };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [active]);

  return (
    <div
      ref={ref}
      className={cn("relative my-12 flex-1", active && "cursor-grab active:cursor-grabbing")}
      onPointerDown={(e) => {
        if (!active || e.button !== 0) return;
        drag.current = e.clientX;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current === null) return;
        turn((e.clientX - drag.current) / window.innerWidth, 0);
        drag.current = e.clientX;
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      {active && (
        <div className="nk-anchor-b [--nk-edge:0rem]">
          <HudChip icon={<MoveHorizontalIcon />}>Drag to look around</HudChip>
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player, data }: { player: NuiPlayer; data: PauseData }) {
  const name = (player.loaded && player.name) || data?.playerName || "Player";
  const job = player.loaded ? player.job : undefined;
  const players = data?.players;
  const max = data?.maxPlayers;
  const role = job ? [job.label ?? job.name, job.gradeLabel].filter(Boolean).join(", ") : player.loaded ? "Civilian" : "No character loaded";
  const showMoney = player.loaded && (player.cash !== undefined || player.bank !== undefined);

  return (
    <Panel>
      <PanelHeader
        icon={
          <Avatar className="size-10">
            <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">{initials(name)}</AvatarFallback>
          </Avatar>
        }
        title={name}
        description={
          <span className="flex items-center gap-1.5">
            <span className="truncate">{role}</span>
            {job?.onDuty !== undefined ? (
              <span
                className={cn("size-1.5 shrink-0 rounded-full", job.onDuty ? "bg-primary" : "bg-muted-foreground/50")}
                aria-label={job.onDuty ? "On duty" : "Off duty"}
              />
            ) : null}
          </span>
        }
      />

      {showMoney ? (
        <PanelBody variant="form" className="grid grid-cols-2">
          <Stat icon={<WalletIcon />} label="Cash" value={player.cash !== undefined ? money.format(player.cash) : "—"} />
          <Stat icon={<LandmarkIcon />} label="Bank" value={player.bank !== undefined ? money.format(player.bank) : "—"} />
        </PanelBody>
      ) : null}

      <PanelFooter className="flex-col items-stretch gap-3">
        {players !== undefined && max ? (
          <Meter icon={<UsersIcon />} label="Players online" value={players} max={max} valueText={`${players} / ${max}`} size="sm" />
        ) : (
          <div className="flex items-center gap-1.5">
            <UsersIcon className="size-4 text-muted-foreground" />
            <span className="nk-label flex-1">Players online</span>
            <span className="nk-num text-xs font-medium">{players ?? "—"}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="nk-label">Server ID</span>
          <span className="nk-num text-xs font-medium">{data?.serverId ?? "—"}</span>
        </div>
      </PanelFooter>
    </Panel>
  );
}

/** Ping, uptime and the next restart, once the server has answered. */
function ServerCard({ data }: { data: PauseData }) {
  if (data?.ping === undefined && data?.uptime === undefined) return null;
  return (
    <Panel>
      <PanelBody variant="form" className="grid grid-cols-3">
        <Stat size="sm" icon={<ActivityIcon />} label="Ping" value={data.ping !== undefined ? `${data.ping} ms` : "—"} />
        <Stat size="sm" icon={<TimerIcon />} label="Online for" value={duration(data.uptime)} />
        <Stat size="sm" icon={<RotateCwIcon />} label="Restart in" value={data.restartIn !== undefined ? duration(data.restartIn) : "Not set"} />
      </PanelBody>
    </Panel>
  );
}

export function HelpPanel({ help }: { help: PauseData["help"] }) {
  return (
    <Panel>
      <PanelHeader title="Controls" description="Change yours in Key bindings." />
      <PanelBody>
        {help.length ? (
          help.map((h) => (
            <div key={h.key + h.label} className="nk-row justify-between">
              <span>{h.label}</span>
              <Kbd className="min-w-8">{h.key}</Kbd>
            </div>
          ))
        ) : (
          <p className="nk-row text-muted-foreground">This server hasn't listed its controls.</p>
        )}
      </PanelBody>
    </Panel>
  );
}
