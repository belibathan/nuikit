// Top right: cash, bank and job. 'change' shows a value when it changes, with the difference, then
// fades; 'always' keeps it. Money is never coloured, only its difference (success / destructive) is.
// Amounts are formatted with the server's currency and locale (nuikit:context, protocol §7.2).
import { useNuiContext, usePlayer } from "nuikit-core/react";
import { BriefcaseIcon, LandmarkIcon, WalletIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatMoney } from "@/components/ui/money";
import type { HudSettings, WalletMode } from "../nui";
import { NumberRoll } from "@/components/ui/text-roll";
import { IconText } from "@/components/ui/icon-text";
import { Chip } from "@/components/ui/chip";

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

function Money({ icon, label, value, mode, size }: { icon: ReactNode; label: string; value: number | undefined; mode: WalletMode; size: "lg" | "md" | "sm" }) {
  const delta = useDelta(value);
  const { currency, locale } = useNuiContext();
  if (value === undefined || mode === false) return null;
  const shown = mode === "always" || !!delta;
  return (
    <div data-slot="hud-money" data-size={size} data-shown={shown || undefined} className="hud-money" aria-label={label} aria-hidden={!shown}>
      {delta && (
        <span key={delta.at} data-up={delta.by > 0 || undefined} className="hud-num hud-money-delta">
          {delta.by > 0 ? "+" : "−"}
          {formatMoney(Math.abs(delta.by), { currency, locale })}
        </span>
      )}
      <span className="hud-money-icon">{icon}</span>
      <NumberRoll className="hud-num hud-money-value" value={value} format={(n) => formatMoney(n, { currency, locale })} />
    </div>
  );
}

/** Cash, bank and job. `inline`: placed by its parent (compact: under the map), else top right. */
export function Wallet({ settings, inline = false, compact = false }: { settings: HudSettings; inline?: boolean; compact?: boolean }) {
  const player = usePlayer(); // its own subscription: money changing re-renders the wallet, not the HUD
  const w = settings.wallet ?? {};
  if (!player.loaded) return null;
  const job = w.job !== false ? player.job : undefined;
  return (
    <div data-slot="hud-wallet" data-compact={compact || undefined} className={inline ? "hud-wallet" : "hud-wallet hud-anchor-tr"}>
      <Money icon={<WalletIcon />} label="Cash" value={player.cash} mode={w.cash === undefined ? "always" : w.cash} size={compact ? "md" : "lg"} />
      <Money icon={<LandmarkIcon />} label="Bank" value={player.bank} mode={w.bank === undefined ? "change" : w.bank} size="sm" />
      {job && (
        <div data-slot="hud-job" className="hud-job">
          <IconText icon={<BriefcaseIcon />} text="label" muted>
            {[job.label ?? job.name, job.gradeLabel].filter(Boolean).join(", ")}
          </IconText>
          {job.onDuty !== undefined && <Chip variant="dot" tone={job.onDuty ? "success" : "neutral"} aria-label={job.onDuty ? "On duty" : "Off duty"} />}
        </div>
      )}
    </div>
  );
}
