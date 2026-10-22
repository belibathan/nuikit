import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStaggerItem } from "nuikit-core/react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { EdgeSheet, EdgeSheetBody, EdgeSheetFooter } from "@/components/ui/edge-sheet";
import { formatMoney } from "@/components/ui/money";
import { Stat } from "@/components/ui/stat";
import { NumberRoll } from "@/components/ui/text-roll";
import { post, useMessages } from "@/lib/nui";
import { loadServerTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** The kit's money format (registry money): tabular, en-US dollars, as qbx_taxijob's own page shows them. */
const money = (n: number, digits = 0) => formatMoney(Number.isFinite(n) ? n : 0, { fractionDigits: digits });
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

/** One label/value row: rises in with the sheet's other rows (the group is the sheet's Stagger). */
function Row({ label, children }: { label: string; children: ReactNode }) {
  const ref = useStaggerItem<HTMLDivElement>(undefined, { appear: true, animate: "rise" });
  return (
    <div ref={ref} className="flex min-h-10 items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="nk-num font-medium">{children}</dd>
    </div>
  );
}

/** qbx_taxijob's fare meter. Protocol: docs/qbx-taxijob-protocol.md */
export default function App() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [fare, setFare] = useState(0);
  const [miles, setMiles] = useState(0);
  const [rate, setRate] = useState({ perMile: 0, start: 0 });
  const [cursor, setCursor] = useState(false);
  // The page owns running/stopped (Lua only says "toggle"), so keep it in a ref too: two
  // toggleMeter messages in one tick must flip twice.
  const runningRef = useRef(false);

  const toggle = () => {
    const next = !runningRef.current;
    runningRef.current = next;
    setRunning(next);
    void post("enableMeter", { enabled: next });
  };

  const release = () => {
    setCursor(false);
    void post("hideMouse");
  };

  useMessages((m) => {
    switch (m.action) {
      case "openMeter":
        if (m.toggle) {
          const c = m.meterData ?? {};
          setRate({ perMile: num(c.defaultPrice), start: num(c.startingPrice) });
          setOpen(true);
        } else {
          setOpen(false);
          setCursor(false);
        }
        break;
      case "toggleMeter":
        toggle();
        break;
      case "updateMeter":
        setFare(num(m.meterData?.currentFare));
        setMiles(num(m.meterData?.distanceTraveled));
        break;
      case "resetMeter":
        setFare(0);
        setMiles(0);
        break;
    }
  });

  useEffect(() => {
    void loadServerTheme();
    // Mouse events only reach the page while Lua has given it the cursor (toggleMuis).
    const move = () => setCursor(true);
    const key = (e: KeyboardEvent) => e.key === "Escape" && release();
    const context = (e: MouseEvent) => {
      e.preventDefault();
      release();
    };
    window.addEventListener("mousemove", move, { once: false, passive: true });
    window.addEventListener("keyup", key);
    window.addEventListener("contextmenu", context);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("keyup", key);
      window.removeEventListener("contextmenu", context);
    };
  }, []);

  return (
    // A floating edge sheet on the left, as tall as the meter (registry edge-sheet): it slides in
    // on openMeter and back out, faster, on hide; its rows rise in after it. Drawn without focus.
    <EdgeSheet
      open={open}
      side="left"
      width="18rem"
      fit
      title="Taxi meter"
      actions={
        <button
          type="button"
          onClick={toggle}
          className="nk-label -mr-1.5 flex h-6 items-center gap-1.5 rounded-full px-1.5 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-pressed={running}
          title={running ? "Stop the meter" : "Start the meter"}
        >
          <span className={cn("size-1.5 rounded-full", running ? "bg-success" : "bg-muted-foreground/60")} />
          <span className={cn(running && "text-foreground")}>{running ? "Running" : "Stopped"}</span>
        </button>
      }
    >
      <EdgeSheetBody>
        {/* The number that is the point: a display Stat, quiet until the meter has run. */}
        <Stat
          size="display"
          label="Fare"
          value={<NumberRoll value={fare} format={(n) => money(n)} className={cn(!running && fare === 0 && "text-muted-foreground")} />}
          className="pb-4"
        />

        <dl className="flex flex-col divide-y divide-border border-t text-sm">
          <Row label="Rate">
            {money(rate.perMile, 2)}
            <span className="text-muted-foreground font-normal"> / mi</span>
          </Row>
          <Row label="Distance">
            {miles.toFixed(2)}
            <span className="text-muted-foreground font-normal"> mi</span>
          </Row>
          {rate.start > 0 && <Row label="Starting fare">{money(rate.start, 2)}</Row>}
        </dl>
      </EdgeSheetBody>

      {cursor && (
        <EdgeSheetFooter className="mt-2">
          <Button variant={running ? "secondary" : "default"} className="flex-1" onClick={toggle}>
            {running ? "Stop meter" : "Start meter"}
          </Button>
          <Button variant="ghost" onClick={release} className="text-muted-foreground">
            Done
            <Kbd>Esc</Kbd>
          </Button>
        </EdgeSheetFooter>
      )}
    </EdgeSheet>
  );
}
