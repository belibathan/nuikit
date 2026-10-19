import { applyTheme } from "nuikit-core";
import { CheckIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useHandover, type Link, type LoadingHandover, type Tip } from "@/lib/handover";
import { PHASES, useLoadProgress, type LoadState } from "@/lib/progress";
import { cn } from "@/lib/utils";

export default function App() {
  const h = useHandover();
  const load = useLoadProgress();

  // The server theme arrives with the handover (server/main.lua reads nuikit/theme.css).
  useEffect(() => {
    if (h.theme) applyTheme(h.theme);
  }, [h.theme]);

  const name = h.serverName || "Welcome";

  return (
    <div className="nk-loading relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <Backdrop images={h.backgrounds ?? []} interval={h.backgroundInterval} />

      <header className="absolute top-12 left-12 flex items-center gap-4">
        {h.logo && <img src={h.logo} alt="" className="size-12 rounded-lg object-contain" />}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl leading-8 font-semibold tracking-tight">{name}</h1>
          {h.tagline && <p className="text-sm text-muted-foreground">{h.tagline}</p>}
        </div>
      </header>

      <div className="absolute top-12 right-12">
        <Music tracks={h.music ?? []} volume={h.musicVolume} />
      </div>

      <main className="absolute inset-x-12 bottom-12 flex flex-col gap-12">
        <div className="flex items-end justify-between gap-12">
          <Tips tips={h.tips ?? []} interval={h.tipInterval} />
          <Links links={h.links ?? []} />
        </div>
        <Status load={load} player={h.playerName} />
      </main>
    </div>
  );
}

/** Configured images, cross-faded with a slow zoom; the theme's own backdrop without them. */
function Backdrop({ images, interval = 9000 }: { images: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % images.length), Math.max(3000, interval));
    return () => clearInterval(t);
  }, [images.length, interval]);

  return (
    <div className="absolute inset-0" aria-hidden>
      {images.length === 0 && <div className="nk-glow absolute inset-0" />}
      {images.map((src, n) => (
        <div
          key={src + n}
          className={cn("nk-slide absolute inset-0 bg-cover bg-center", n === i && "nk-slide-on")}
          style={{ backgroundImage: `url("${src}")` }}
        />
      ))}
      <div className="nk-scrim absolute inset-0" />
    </div>
  );
}

function Tips({ tips, interval = 8000 }: { tips: Tip[]; interval?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (tips.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % tips.length), Math.max(3000, interval));
    return () => clearInterval(t);
  }, [tips.length, interval]);
  if (tips.length === 0) return <div />;

  const tip = tips[i % tips.length]!;
  const { title, text } = typeof tip === "string" ? { title: undefined, text: tip } : tip;

  return (
    <section className="flex w-96 flex-col gap-3" aria-label="Tip">
      <div key={i} className="nk-fade flex min-h-16 flex-col justify-end gap-1">
        {title && <h2 className="nk-title">{title}</h2>}
        <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
      </div>
      {tips.length > 1 && (
        <div className="flex items-center gap-1" aria-hidden>
          {tips.map((_, n) => (
            <span
              key={n}
              className={cn("h-0.5 rounded-full transition-all duration-500", n === i % tips.length ? "w-6 bg-foreground" : "w-3 bg-foreground/25")}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Links({ links }: { links: Link[] }) {
  if (links.length === 0) return null;
  return (
    <dl className="flex items-center gap-6 text-sm">
      {links.map((l, n) => (
        <div key={l.label + n} className="flex items-center gap-6">
          {n > 0 && <Separator orientation="vertical" className="h-8!" />}
          <div className="flex flex-col gap-0.5 text-right">
            <dt className="nk-label">{l.label}</dt>
            {l.url && <dd className="font-medium">{l.url}</dd>}
          </div>
        </div>
      ))}
    </dl>
  );
}

function Status({ load, player }: { load: LoadState; player?: string }) {
  const pct = Math.round(load.fraction * 100);
  const ready = load.phase === "ready";
  const detail = ready ? undefined : load.phase === "finishing" ? load.log : load.detail;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          {player && <p className="text-sm text-muted-foreground">Welcome, {player}</p>}
          <p className="flex items-center gap-2 text-xl leading-7 font-semibold tracking-tight">
            {ready ? <CheckIcon className="size-4" /> : <Spinner className="size-4 text-muted-foreground" />}
            {ready ? "Ready. Hang tight…" : PHASES[load.phase]}
          </p>
        </div>
        <p className="nk-num text-[2rem] leading-none font-semibold">
          {pct}
          <span className="text-xl text-muted-foreground">%</span>
        </p>
      </div>
      <Progress value={pct} className="h-1 bg-foreground/15" />
      <div className="nk-label flex h-4 items-center justify-between gap-6 font-normal">
        <span className="truncate">{detail}</span>
        {load.count > 0 && (
          <span className="nk-num shrink-0">
            {load.idx} / {load.count}
          </span>
        )}
      </div>
    </section>
  );
}

/** Background music with a mute toggle. The choice is remembered on this PC. */
function Music({ tracks, volume = 0.15 }: { tracks: string[]; volume?: LoadingHandover["musicVolume"] }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState(0);
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem("nuikit_loading:muted") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.volume = Math.max(0, Math.min(1, volume));
    a.muted = muted;
    if (!muted) a.play().catch(() => {});
    try {
      localStorage.setItem("nuikit_loading:muted", muted ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }, [muted, volume, track, tracks.length]);

  if (tracks.length === 0) return null;
  return (
    <>
      <audio ref={audio} src={tracks[track % tracks.length]} autoPlay onEnded={() => setTrack((t) => (t + 1) % tracks.length)} loop={tracks.length === 1} />
      <Button
        variant="outline"
        size="icon"
        className="size-9 rounded-full bg-background/40 backdrop-blur-md"
        aria-label={muted ? "Unmute music" : "Mute music"}
        onClick={() => setMuted((m) => !m)}
      >
        {muted ? <VolumeXIcon /> : <Volume2Icon />}
      </Button>
    </>
  );
}
