import { fetchNui, type NuiPlayer } from "nuikit-core/react";
import { LandmarkIcon, MoveHorizontalIcon, UsersIcon, WalletIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import type { PauseData } from "../nui";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HudChip } from "@/components/ui/hud-chip";
import { Kbd } from "@/components/ui/kbd";
import { Meter } from "@/components/ui/meter";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Stat } from "@/components/ui/stat";
import { useFrameBatch } from "@/lib/batch";
import { duration, initials, list, money } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The open stage: everything right of the sheet. In game the focus camera frames the player inside
 * it, so it reports its rectangle to Lua (`pause:preview:frame`, 0–1 screen fractions); dragging
 * across it turns the character.
 */
export function Stage({ active }: { active: boolean }) {
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
      className={cn("relative my-6 min-w-0 flex-1", active && "cursor-grab active:cursor-grabbing")}
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

/** Who you are: the character, their job, and their money. A section of the sheet, not a card. */
export function PlayerSummary({ player, data }: { player: NuiPlayer; data: PauseData }) {
  const name = (player.loaded && player.name) || data?.playerName || "Player";
  const job = player.loaded ? player.job : undefined;
  const role = job ? [job.label ?? job.name, job.gradeLabel].filter(Boolean).join(", ") : player.loaded ? "Civilian" : "No character loaded";
  const showMoney = player.loaded && (player.cash !== undefined || player.bank !== undefined);

  return (
    <section data-slot="pause-player" aria-label="Your character" className="flex flex-col gap-4 px-4 py-4">
      <div className="flex items-center gap-3">
        <Avatar className="size-10">
          <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="nk-title truncate">{name}</p>
          <p className="nk-label flex items-center gap-1.5 text-muted-foreground">
            <span className="truncate">{role}</span>
            {job?.onDuty !== undefined ? (
              <span
                className={cn("size-1.5 shrink-0 rounded-full", job.onDuty ? "bg-success" : "bg-muted-foreground/50")}
                aria-label={job.onDuty ? "On duty" : "Off duty"}
              />
            ) : null}
          </p>
        </div>
      </div>
      {showMoney ? (
        <div className="grid grid-cols-2 gap-4">
          <Stat icon={<WalletIcon />} label="Cash" value={player.cash !== undefined ? money.format(player.cash) : "—"} />
          <Stat icon={<LandmarkIcon />} label="Bank" value={player.bank !== undefined ? money.format(player.bank) : "—"} />
        </div>
      ) : null}
    </section>
  );
}

/** The server right now: who's on, ping, uptime, the next restart, the server ID, and its links. */
export function ServerSummary({ data }: { data: PauseData }) {
  const players = data?.players;
  const max = data?.maxPlayers;
  const facts: { label: string; value: string }[] = [];
  if (data?.ping !== undefined) facts.push({ label: "Ping", value: `${data.ping} ms` });
  facts.push({ label: "Server ID", value: data?.serverId !== undefined ? String(data.serverId) : "—" });
  if (data?.uptime !== undefined) facts.push({ label: "Online for", value: duration(data.uptime) });
  if (data?.ping !== undefined || data?.uptime !== undefined)
    facts.push({ label: "Restart in", value: data?.restartIn !== undefined ? duration(data.restartIn) : "Not set" });
  const links = list(data?.links);

  return (
    <section data-slot="pause-server" aria-label="Server" className="nk-panel-footer flex-col items-stretch gap-4 py-4">
      {players !== undefined && max ? (
        <Meter icon={<UsersIcon />} label="Players online" value={players} max={max} valueText={`${players} / ${max}`} size="sm" tone="foreground" />
      ) : (
        <div className="flex items-center gap-1.5">
          <UsersIcon className="size-4 text-muted-foreground" />
          <span className="nk-label flex-1">Players online</span>
          <span className="nk-num text-sm font-medium">{players ?? "—"}</span>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {facts.map((f) => (
          <div key={f.label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="nk-label truncate text-muted-foreground">{f.label}</dt>
            <dd className="nk-num truncate text-sm font-medium">{f.value}</dd>
          </div>
        ))}
      </dl>
      {links.length ? (
        <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
          {links.map((l) => (
            <div key={l.label} className="flex items-baseline justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">{l.label}</dt>
              <dd className="truncate font-medium">{l.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
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
