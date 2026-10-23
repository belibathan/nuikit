import { useEffect, useRef, useState } from "react";
import { useClearOf } from "nuikit-core/react";
import { Button } from "@/components/ui/button";
import { ActionBar, ActionBarItem } from "@/components/ui/action-bar";
import { Chip } from "@/components/ui/chip";
import { MenuRow } from "@/components/ui/menu-row";
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

/** rem in px (1rem follows the game's resolution). */
const rem = (n: number) => n * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);

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

  const clear = useClearOf("top-left", { width: rem(18) });

  return (
    // A floating edge sheet on the left, as tall as the meter (registry edge-sheet): it slides in
    // on openMeter and back out, faster, on hide; its rows rise in after it. Drawn without focus.
    // It sits from 34% down, where the stock meter was (centred left), clear of GTA's help text; a
    // UI that publishes a screen zone reaching lower on the left (the theme long-poll brings zones
    // to override pages) pushes it down further.
    <EdgeSheet
      open={open}
      side="left"
      width="18rem"
      fit
      anchor="upper"
      style={clear.top !== undefined ? { top: `max(34vh, ${clear.top}px)` } : undefined}
      title="Taxi meter"
      actions={
        <button
          type="button"
          onClick={toggle}
          className="nk-label -mr-1 flex h-6 items-center gap-2 rounded-(--nk-r-chip) px-1 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-pressed={running}
          title={running ? "Stop the meter" : "Start the meter"}
        >
          <Chip variant="dot" tone={running ? "success" : "neutral"} aria-hidden />
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

        <div className="flex flex-col border-t">
          <MenuRow readOnly meta={<>{money(rate.perMile, 2)}<span className="text-muted-foreground"> / mi</span></>}>Rate</MenuRow>
          <MenuRow readOnly meta={<>{miles.toFixed(2)}<span className="text-muted-foreground"> mi</span></>}>Distance</MenuRow>
          {rate.start > 0 && <MenuRow readOnly meta={money(rate.start, 2)}>Starting fare</MenuRow>}
        </div>
      </EdgeSheetBody>

      {cursor && (
        <EdgeSheetFooter className="mt-2">
          <Button variant={running ? "secondary" : "default"} className="flex-1" onClick={toggle}>
            {running ? "Stop meter" : "Start meter"}
          </Button>
          <ActionBar>
            <ActionBarItem keys={["Esc"]} label="Done" onClick={release} />
          </ActionBar>
        </EdgeSheetFooter>
      )}
    </EdgeSheet>
  );
}
