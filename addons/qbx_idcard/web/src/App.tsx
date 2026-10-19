import { toRgba } from "nuikit-core";
import { IdCardIcon, UserIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { DEFAULT_CONFIG, DEFAULT_LABELS, loadLabels, post, type IdConfig, type Labels, type PlayerData } from "@/lib/nui";
import { loadServerTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Msg = { type: string; playerData?: PlayerData; configData?: Partial<IdConfig> };

/** qbx_idcard posts { type, playerData | configData }; devtools posts { action, data }. */
function toMsg(raw: unknown): Msg | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.type === "string") return m as Msg;
  if (m.action === "playerData") return { type: "playerData", playerData: m.data as PlayerData };
  if (m.action === "configData") return { type: "configData", configData: m.data as Partial<IdConfig> };
  return null;
}

export default function App() {
  const [config, setConfig] = useState<IdConfig>(DEFAULT_CONFIG);
  const [labels, setLabels] = useState<Labels>(DEFAULT_LABELS);
  const [card, setCard] = useState<PlayerData | null>(null);
  const [shown, setShown] = useState(0); // bumps on every open, restarts the entrance animation
  const configRef = useRef(config);
  configRef.current = config;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const close = useCallback(() => {
    clearTimeout(timer.current);
    setCard(null);
    post("closeIdCard");
  }, []);

  useEffect(() => {
    loadServerTheme();
    loadLabels().then((l) => setLabels((d) => ({ ...d, ...l })));
    const onMessage = (e: MessageEvent) => {
      const m = toMsg(e.data);
      if (!m) return;
      if (m.type === "configData" && m.configData && typeof m.configData === "object") {
        setConfig((c) => ({ ...c, ...m.configData }));
      } else if (m.type === "playerData" && m.playerData) {
        setCard(m.playerData);
        setShown((n) => n + 1);
        const auto = configRef.current.idCardSettings?.autoClose;
        clearTimeout(timer.current);
        if (auto?.status) timer.current = setTimeout(close, Number(auto.time) || 3000);
      }
    };
    // Like the original, the close key always releases focus, even if nothing is showing.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === (configRef.current.idCardSettings?.closeKey ?? "Backspace")) close();
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("keydown", onKey);
    };
  }, [close]);

  if (!card) return null;
  return (
    <div className="fixed inset-y-0 right-[3vh] flex items-center">
      <div key={shown} className="nk-enter flex items-center gap-5">
        <JobBadge badge={card.badge} />
        <div className="flex flex-col items-end gap-2.5">
          <IdCard data={card} config={config} labels={labels} />
          <p className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 py-1 pr-3 pl-1 text-xs text-muted-foreground shadow-lg backdrop-blur-md">
            <Kbd className="rounded-full px-2">{config.idCardSettings?.closeKey ?? "Backspace"}</Kbd> to put it away
          </p>
        </div>
      </div>
    </div>
  );
}

function IdCard({ data, config, labels }: { data: PlayerData; config: IdConfig; labels: Labels }) {
  const type = data.cardtype ?? "";
  const license = config.licenses?.[type] ?? {};
  const title = license.header ?? (type ? type.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Identity");
  // The card type's colour from config/shared.lua tints the card (rgba only: Chromium 103).
  const c = toRgba(license.background ?? "") ?? null;
  const accent = c ? `${c[0]}, ${c[1]}, ${c[2]}` : null;
  const name = [data.firstname, data.lastname].filter(Boolean).join(" ");

  return (
    <Card
      className="relative w-[31rem] gap-0 overflow-hidden border-border/70 bg-card/95 py-0 shadow-2xl backdrop-blur-md"
      style={accent ? ({ "--nk-accent": accent } as CSSProperties) : undefined}
    >
      {accent && <div aria-hidden className="nk-tint pointer-events-none absolute inset-0" />}

      <div className="relative flex items-center justify-between gap-4 border-b px-5 py-3.5">
        <div className="flex flex-col gap-1">
          <CardDescription className="text-[0.65rem] font-medium tracking-[0.2em] uppercase">{labels.lang_header}</CardDescription>
          <CardTitle className="text-lg tracking-tight">{title}</CardTitle>
        </div>
        <div className={cn("flex size-10 items-center justify-center rounded-full border", accent ? "nk-chip" : "bg-muted")}>
          <IdCardIcon className="size-5" />
        </div>
      </div>

      <div className="relative flex gap-5 px-5 py-5">
        <Portrait src={data.mugShot} className="w-[7.5rem]" />
        <dl className="grid flex-1 grid-cols-2 content-start gap-x-5 gap-y-3.5">
          <Field label={labels.lang_lastname} value={data.lastname} strong />
          <Field label={labels.lang_firstname} value={data.firstname} strong />
          <Field label={labels.lang_citizenid} value={data.citizenid} mono className="col-span-2" />
          <Field label={labels.lang_dob} value={data.birthdate} mono />
          <Field label={labels.lang_sex} value={data.sex} />
          <Field label={labels.lang_nat} value={data.nationality} className="col-span-2" />
        </dl>
      </div>

      <div className="relative flex items-center justify-between gap-4 border-t px-5 py-3">
        <span className="nk-signature truncate text-2xl leading-none text-foreground/85">{name}</span>
        <div className="flex shrink-0 items-center gap-2.5">
          <img src="flags/32.png" alt="" className="h-4 rounded-[2px]" onError={(e) => (e.currentTarget.style.display = "none")} />
          <Portrait src={data.mugShot} ghost className="w-7" />
        </div>
      </div>
    </Card>
  );
}

function Field({ label, value, strong, mono, className }: { label: string; value?: string; strong?: boolean; mono?: boolean; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <dt className="text-[0.65rem] font-medium tracking-wider text-muted-foreground uppercase">{label}</dt>
      <dd className={cn("truncate text-sm", strong && "text-base font-semibold tracking-tight uppercase", mono && "font-mono text-[0.8rem]")}>
        {value || "—"}
      </dd>
    </div>
  );
}

/** The mugshot qbx_idcard stores in item metadata (a data: URL from MugShotBase64). */
function Portrait({ src, ghost, className }: { src?: string; ghost?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const ok = !!src && !failed;
  return (
    <div
      className={cn(
        "flex aspect-[3/4] shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted",
        ghost && "rounded-sm opacity-45 grayscale",
        className,
      )}
    >
      {ok ? (
        <img src={src} alt="" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <UserIcon className={cn("text-muted-foreground", ghost ? "size-3" : "size-10")} />
      )}
    </div>
  );
}

/** Job badge next to the card: `badges/<img>.png` from qbx_idcard's web/badges, and the grade. */
function JobBadge({ badge }: { badge: PlayerData["badge"] }) {
  const [failed, setFailed] = useState(false);
  if (!badge || badge === "none" || typeof badge !== "object") return null;
  return (
    <div className="flex flex-col items-center gap-2.5">
      {badge.img && !failed && <img src={`badges/${badge.img}.png`} alt="" className="h-36 drop-shadow-xl" onError={() => setFailed(true)} />}
      {badge.grade && <Badge className="uppercase">{badge.grade}</Badge>}
    </div>
  );
}
