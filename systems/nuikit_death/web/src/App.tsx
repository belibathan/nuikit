import { Surface } from "nuikit-core/react";
import { CheckIcon, HeartPulseIcon, SirenIcon, SkullIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { DeathData } from "./nui";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function App() {
  // input 'none': the medical resource listens for E/G in game, so this never takes focus.
  return (
    <Surface name="death" layer="system" input="none" hides={["hud"]}>
      {(data) => (data ? <Death data={data} /> : null)}
    </Surface>
  );
}

function clock(s: number) {
  const t = Math.max(0, Math.ceil(s));
  const m = Math.floor(t / 60);
  return `${String(m).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function Death({ data }: { data: DeathData }) {
  const laststand = data.phase === "laststand";
  const hasTimer = typeof data.seconds === "number";
  const seconds = data.seconds ?? 0;
  const total = data.total && data.total > 0 ? data.total : undefined;
  const urgent = hasTimer && seconds <= 30;
  const bleeding = laststand || data.medical === "esx_death" || data.medical === "esx";
  const label = bleeding ? "until you bleed out" : seconds > 0 ? "until you can respawn" : "you can respawn";

  return (
    <div className={cn("death-root absolute inset-0 overflow-hidden", laststand ? "death-laststand" : "death-dead")}>
      <div className="death-tint absolute inset-0" aria-hidden />
      <div className="death-vignette absolute inset-0" aria-hidden />

      {/* content sits above centre; the bottom of the screen stays clear for the medical resource's own text */}
      <div className="absolute inset-x-0 top-[18%] flex flex-col items-center px-8 text-center">
        <Badge variant={laststand ? "destructive" : "secondary"} className="death-in gap-1.5 px-3 py-1 tracking-[0.24em] uppercase">
          {laststand ? <HeartPulseIcon /> : <SkullIcon />}
          {laststand ? "Last stand" : "Unconscious"}
        </Badge>

        <h1 className="death-in mt-6 text-5xl font-semibold tracking-tight text-foreground drop-shadow-lg" style={{ animationDelay: "60ms" }}>
          {data.title ?? (laststand ? "You are down" : "You are unconscious")}
        </h1>
        {data.subtitle ? (
          <p className="death-in mt-3 max-w-xl text-lg text-foreground/80 [text-shadow:0_1px_8px_rgb(0_0_0/0.8)]" style={{ animationDelay: "120ms" }}>
            {data.subtitle}
          </p>
        ) : null}

        {hasTimer ? (
          <div className="death-in mt-12 flex flex-col items-center" style={{ animationDelay: "180ms" }}>
            <div
              className={cn(
                "death-clock text-[128px] leading-none font-semibold tracking-tight tabular-nums",
                urgent && laststand ? "death-urgent text-destructive" : "text-foreground",
                !laststand && seconds <= 0 && "text-foreground/40",
              )}
              role="timer"
              aria-live="off"
            >
              {clock(seconds)}
            </div>
            <div className="mt-4 text-xs font-medium tracking-[0.3em] text-foreground/75 uppercase [text-shadow:0_1px_6px_rgb(0_0_0/0.8)]">{label}</div>
            {total ? (
              <Progress
                value={Math.max(0, Math.min(100, (seconds / total) * 100))}
                className={cn("mt-6 h-1 w-[420px] bg-foreground/15", laststand && "[&>[data-slot=progress-indicator]]:bg-destructive")}
              />
            ) : null}
          </div>
        ) : (
          <div className="death-in mt-12 text-sm font-medium tracking-[0.3em] text-foreground/70 uppercase" style={{ animationDelay: "180ms" }}>
            Waiting to respawn
          </div>
        )}

        <Hints data={data} />
      </div>
    </div>
  );
}

function Hints({ data }: { data: DeathData }) {
  const { respawn, ems, helpable } = data;
  if (!respawn && !ems && !helpable) return null;
  return (
    <div className="death-in mt-12 flex items-stretch gap-4 rounded-xl border bg-background/70 px-5 py-3 shadow-2xl backdrop-blur-md" style={{ animationDelay: "240ms" }}>
      {helpable && !ems ? (
        <Hint icon={<HeartPulseIcon className="size-4 text-destructive" />} label="Another player can revive you" />
      ) : null}

      {ems ? (
        ems.state === "requested" ? (
          <Hint icon={<CheckIcon className="size-4 text-primary" />} label="EMS have been notified" />
        ) : ems.state === "cooldown" ? (
          <Hint kbd={ems.key} muted label={`Distress signal in ${ems.seconds ?? 0}s`} />
        ) : (
          <Hint kbd={ems.key} icon={<SirenIcon className="size-4 text-muted-foreground" />} label="Request EMS" />
        )
      ) : null}

      {ems && respawn ? <Separator orientation="vertical" className="h-auto!" /> : null}

      {respawn ? (
        respawn.available ? (
          <div className="flex flex-col justify-center gap-2">
            <Hint kbd={respawn.key} label={respawn.cost ? `Hold to respawn · ${money.format(respawn.cost)}` : "Hold to respawn"} />
            <Progress value={(respawn.progress ?? 0) * 100} className="h-1 w-full bg-foreground/15" />
          </div>
        ) : (
          <Hint kbd={respawn.key} muted label={respawn.wait ? `Respawn in ${respawn.wait}s` : "Respawn after the timer"} />
        )
      ) : null}
    </div>
  );
}

function Hint({ kbd, icon, label, muted }: { kbd?: string; icon?: ReactNode; label: string; muted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 text-sm font-medium whitespace-nowrap", muted ? "text-muted-foreground" : "text-foreground")}>
      {kbd ? <Kbd className={cn("h-6 min-w-6 text-sm", !muted && "bg-foreground text-background")}>{kbd}</Kbd> : null}
      {icon}
      <span>{label}</span>
    </div>
  );
}
