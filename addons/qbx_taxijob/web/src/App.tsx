import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Panel, PanelFooter, PanelHeader } from "@/components/ui/panel";
import { Stat } from "@/components/ui/stat";
import { post, useMessages } from "@/lib/nui";
import { loadServerTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const money = (n: number, digits = 0) =>
  "$" + (Number.isFinite(n) ? n : 0).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

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
    <div data-open={open} className="meter fixed top-1/2 left-6 w-64">
      <Panel size="auto" animate={false} className="w-full">
        <PanelHeader
          title="Taxi meter"
          actions={
            <button
              type="button"
              onClick={toggle}
              className="nk-label -mr-1.5 flex h-6 items-center gap-1.5 rounded-full px-1.5 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-pressed={running}
              title={running ? "Stop the meter" : "Start the meter"}
            >
              <span className={cn("size-1.5 rounded-full", running ? "animate-pulse bg-success" : "bg-muted-foreground/60")} />
              <span className={cn(running && "text-foreground")}>{running ? "Running" : "Stopped"}</span>
            </button>
          }
        />

        {/* The number that is the point: a display Stat, quiet until the meter has run. */}
        <Stat
          size="display"
          label="Fare"
          value={<span className={cn(!running && fare === 0 && "text-muted-foreground")}>{money(fare)}</span>}
          className="p-4"
        />

        <dl className="flex flex-col gap-2 border-t px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Rate</dt>
            <dd className="nk-num font-medium">
              {money(rate.perMile, 2)}
              <span className="text-muted-foreground font-normal"> / mi</span>
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Distance</dt>
            <dd className="nk-num font-medium">
              {miles.toFixed(2)}
              <span className="text-muted-foreground font-normal"> mi</span>
            </dd>
          </div>
          {rate.start > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Starting fare</dt>
              <dd className="nk-num font-medium">{money(rate.start, 2)}</dd>
            </div>
          )}
        </dl>

        {cursor && (
          <PanelFooter>
            <Button size="sm" variant={running ? "secondary" : "default"} className="flex-1" onClick={toggle}>
              {running ? "Stop meter" : "Start meter"}
            </Button>
            <Button size="sm" variant="ghost" onClick={release} className="text-muted-foreground">
              Done
              <Kbd>Esc</Kbd>
            </Button>
          </PanelFooter>
        )}
      </Panel>
    </div>
  );
}
