import { toRgba } from "nuikit-core";
import { ShieldIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { HudChip } from "@/components/ui/hud-chip";
import { KeyPrompt } from "@/components/ui/key-prompt";
import { PlayerCard, type PlayerCardStat } from "@/components/ui/player-card";
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

/**
 * qbx_idcard's card: who this is, as the kit's PlayerCard (mugshot, name, the card type and the
 * issuing place, then citizen ID, date of birth, sex and nationality), the job badge beside it and
 * the close key as a KeyPrompt under it. Protocol: docs/qbx-idcard-protocol.md.
 */
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
  const closeKey = config.idCardSettings?.closeKey ?? "Backspace";
  return (
    <div className="fixed inset-y-0 right-[var(--nk-edge,1.5rem)] flex items-center">
      <div key={shown} className="nk-enter flex items-center gap-6">
        <JobBadge badge={card.badge} />
        <div className="flex flex-col items-end gap-3">
          <IdCard data={card} config={config} labels={labels} />
          <KeyPrompt keys={closeKey} label="Put it away" />
        </div>
      </div>
    </div>
  );
}

function IdCard({ data, config, labels }: { data: PlayerData; config: IdConfig; labels: Labels }) {
  const type = data.cardtype ?? "";
  const license = config.licenses?.[type] ?? {};
  const title = license.header ?? (type ? sentence(type.replace(/[_-]+/g, " ")) : "Identity");
  // The card type's colour from config/shared.lua marks the card (rgba only: Chromium 103).
  const c = toRgba(license.background ?? "") ?? null;
  const accent = c ? `${c[0]}, ${c[1]}, ${c[2]}` : null;
  const name = [data.firstname, data.lastname].filter(Boolean).join(" ") || "—";

  const stats: PlayerCardStat[] = [
    { label: sentence(labels.lang_citizenid), value: data.citizenid || "—", mono: true },
    { label: sentence(labels.lang_dob), value: data.birthdate || "—" },
    { label: sentence(labels.lang_sex), value: data.sex || "—" },
    { label: sentence(labels.lang_nat), value: data.nationality || "—" },
  ];

  return (
    <PlayerCard
      size="lg"
      animate={false}
      name={name}
      avatar={data.mugShot}
      job={title}
      grade={titleCase(labels.lang_header)}
      stats={stats}
      data-cardtype={type || undefined}
      className={cn("relative [&_[data-slot=player-card-avatar]]:size-14", accent && "idc-accent")}
      style={accent ? ({ "--idc-accent": accent } as CSSProperties) : undefined}
    />
  );
}

/** An ALL-CAPS place name ("LOS SANTOS") → "Los Santos"; anything else is left as written. */
function titleCase(s: string) {
  const t = (s ?? "").trim();
  if (t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
}

/** "LAST NAME" / "last name" → "Last name"; mixed-case strings are left alone. */
function sentence(s: string) {
  const t = (s ?? "").trim();
  if (!t) return t;
  if (t === t.toUpperCase()) return t.charAt(0) + t.slice(1).toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Job badge next to the card: `badges/<img>.png` from qbx_idcard's web/badges, and the grade as a chip. */
function JobBadge({ badge }: { badge: PlayerData["badge"] }) {
  const [failed, setFailed] = useState(false);
  if (!badge || badge === "none" || typeof badge !== "object") return null;
  return (
    <div className="flex flex-col items-center gap-3">
      {badge.img && !failed && <img src={`badges/${badge.img}.png`} alt="" className="h-32 drop-shadow-xl" onError={() => setFailed(true)} />}
      {badge.grade && <HudChip icon={<ShieldIcon />}>{badge.grade}</HudChip>}
    </div>
  );
}
