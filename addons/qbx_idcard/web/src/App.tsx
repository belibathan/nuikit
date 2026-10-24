import { toRgba } from "nuikit-core";
import { IdCardIcon, UserIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { EdgeSheet } from "@/components/ui/edge-sheet";
import { ActionBar, ActionBarItem } from "@/components/ui/action-bar";
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

  // the last card stays drawn while the sheet slides out
  const last = useRef<PlayerData | null>(null);
  if (card) last.current = card;
  const data = card ?? last.current;
  if (!data) return null;
  return <IdCard key={shown} open={!!card} data={data} config={config} labels={labels} />;
}

function IdCard({ open, data, config, labels }: { open: boolean; data: PlayerData; config: IdConfig; labels: Labels }) {
  const type = data.cardtype ?? "";
  const license = config.licenses?.[type] ?? {};
  const title = license.header ?? (type ? sentence(type.replace(/[_-]+/g, " ")) : "Identity");
  // The card type's colour from config/shared.lua marks the card (rgba only: Chromium 103).
  const c = toRgba(license.background ?? "") ?? null;
  const accent = c ? `${c[0]}, ${c[1]}, ${c[2]}` : null;
  const name = [data.firstname, data.lastname].filter(Boolean).join(" ");

  const badge = data.badge && data.badge !== "none" && typeof data.badge === "object" ? data.badge : null;
  // Decisions #5: the full-height portrait by default, the small round one with photo = 'avatar'.
  const avatar = (config.photo ?? config.idCardSettings?.photo) === "avatar";

  return (
    // A floating edge sheet on the right, sized to the card (registry edge-sheet): the card type's
    // colour as a hairline and a faint wash, the holder's details, the signature, the close key.
    <EdgeSheet
      open={open}
      side="right"
      width="30rem"
      fit
      anchor="upper"
      style={accent ? ({ "--idc-accent": accent } as CSSProperties) : undefined}
      icon={<IdCardIcon className={cn(accent && "idc-icon")} />}
      title={title}
      description={titleCase(labels.lang_header)}
      actions={badge?.grade && <span className="nk-label">{badge.grade}</span>}
    >
      {accent && <div aria-hidden className="idc-tint pointer-events-none absolute inset-0" />}
      <div className="relative flex gap-4 pt-4">
        <Portrait src={data.mugShot} avatar={avatar} />
        <dl className="grid flex-1 grid-cols-2 content-start gap-x-4 gap-y-3">
          <Field label={labels.lang_firstname} value={data.firstname} strong />
          <Field label={labels.lang_lastname} value={data.lastname} strong />
          <Field label={labels.lang_citizenid} value={data.citizenid} mono className="col-span-2" />
          <Field label={labels.lang_dob} value={data.birthdate} num />
          <Field label={labels.lang_sex} value={data.sex} />
          <Field label={labels.lang_nat} value={data.nationality} className="col-span-2" />
        </dl>
        <JobBadge badge={data.badge} />
      </div>

      <footer className="relative mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
        <span className="idc-signature nk-title truncate text-foreground/80">{name}</span>
        <div className="flex shrink-0 items-center gap-3">
          <img src="flags/32.png" alt="" className="h-4 rounded-(--nk-radius-key)" onError={(e) => (e.currentTarget.style.display = "none")} />
          <ActionBar>
            <ActionBarItem keys={[config.idCardSettings?.closeKey ?? "Backspace"]} label="Put away" />
          </ActionBar>
        </div>
      </footer>
    </EdgeSheet>
  );
}

/** "LOS SANTOS" / "pilot license" → "Los santos" / "Pilot license"; mixed-case strings are left alone. */
/** An ALL-CAPS place name ("LOS SANTOS") → "Los Santos"; anything else is left as written. */
function titleCase(s: string) {
  const t = (s ?? "").trim();
  if (t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
}

function sentence(s: string) {
  const t = s.trim();
  if (!t) return t;
  if (t === t.toUpperCase()) return t.charAt(0) + t.slice(1).toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function Field({ label, value, strong, mono, num, className }: { label: string; value?: string; strong?: boolean; mono?: boolean; num?: boolean; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <dt className="nk-label truncate">{sentence(label)}</dt>
      <dd className={cn("nk-body truncate", strong && "font-semibold", mono && "font-mono", num && "nk-num")}>
        {value || "—"}
      </dd>
    </div>
  );
}

/** The mugshot qbx_idcard stores in item metadata (a data: URL from MugShotBase64): a portrait the
 *  card's full height, or a small round avatar. */
function Portrait({ src, avatar }: { src?: string; avatar?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const ok = !!src && !failed;
  return (
    <div
      data-slot="idc-photo"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border bg-muted",
        avatar ? "size-16 self-start rounded-(--nk-radius-surface)" : "min-h-36 w-32 self-stretch rounded-(--nk-radius-control)",
      )}
    >
      {ok ? (
        <img src={src} alt="" className="size-full object-cover object-top" onError={() => setFailed(true)} />
      ) : (
        <UserIcon className={cn("text-muted-foreground", avatar ? "size-6" : "size-10")} />
      )}
    </div>
  );
}

/** Job badge next to the card: `badges/<img>.png` from qbx_idcard's web/badges, and the grade. */
function JobBadge({ badge }: { badge: PlayerData["badge"] }) {
  const [failed, setFailed] = useState(false);
  if (!badge || badge === "none" || typeof badge !== "object") return null;
  return (
    <div className="flex shrink-0 flex-col items-center">
      {badge.img && !failed && <img src={`badges/${badge.img}.png`} alt="" className="h-20" onError={() => setFailed(true)} />}
    </div>
  );
}
