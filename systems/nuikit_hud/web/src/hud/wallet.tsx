// Top right: cash, bank and job. 'change' shows a value when it changes, with the difference, then
// fades; 'always' keeps it. Money is never coloured, only its difference (success / destructive) is.
import type { NuiPlayer } from "nuikit-core/react";
import { BriefcaseIcon, LandmarkIcon, WalletIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { HudSettings, WalletMode } from "../nui";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const LINGER = 5000;

/** The last change of a value: its difference and when it happened (none for the first value). */
function useDelta(value: number | undefined) {
  const prev = useRef(value);
  const [delta, setDelta] = useState<{ by: number; at: number } | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    if (value !== undefined && prev.current !== undefined && value !== prev.current) {
      setDelta({ by: value - prev.current, at: Date.now() });
      const t = setTimeout(() => tick((n) => n + 1), LINGER + 20);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);
  const fresh = delta && Date.now() - delta.at < LINGER ? delta : null;
  return fresh;
}

function Money({ icon, label, value, mode, size }: { icon: ReactNode; label: string; value: number | undefined; mode: WalletMode; size: "lg" | "sm" }) {
  const delta = useDelta(value);
  if (value === undefined || mode === false) return null;
  const shown = mode === "always" || !!delta;
  return (
    <div data-slot="hud-money" data-size={size} data-shown={shown || undefined} className="hud-money" aria-label={label} aria-hidden={!shown}>
      {delta && (
        <span key={delta.at} data-up={delta.by > 0 || undefined} className="hud-num hud-money-delta">
          {delta.by > 0 ? "+" : "−"}
          {money.format(Math.abs(delta.by))}
        </span>
      )}
      <span className="hud-money-icon">{icon}</span>
      <span className="hud-num hud-money-value">{money.format(value)}</span>
    </div>
  );
}

export function Wallet({ player, settings }: { player: NuiPlayer; settings: HudSettings }) {
  const w = settings.wallet ?? {};
  if (!player.loaded) return null;
  const job = w.job !== false ? player.job : undefined;
  return (
    <div data-slot="hud-wallet" className="hud-wallet hud-anchor-tr">
      <Money icon={<WalletIcon />} label="Cash" value={player.cash} mode={w.cash === undefined ? "always" : w.cash} size="lg" />
      <Money icon={<LandmarkIcon />} label="Bank" value={player.bank} mode={w.bank === undefined ? "change" : w.bank} size="sm" />
      {job && (
        <div data-slot="hud-job" className="hud-job">
          <BriefcaseIcon />
          <span className="truncate">{[job.label ?? job.name, job.gradeLabel].filter(Boolean).join(", ")}</span>
          {job.onDuty !== undefined && <span className="hud-duty" data-on={job.onDuty || undefined} aria-label={job.onDuty ? "On duty" : "Off duty"} />}
        </div>
      )}
    </div>
  );
}
