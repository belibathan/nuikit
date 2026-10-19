import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
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
    <div data-open={open} className="meter fixed top-1/2 left-[2.5vw] w-64">
      <Card className="gap-0 py-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 pt-3 pb-2">
          <CardTitle className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Taxi meter</CardTitle>
          <button
            type="button"
            onClick={toggle}
            className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-pressed={running}
            title={running ? "Stop the meter" : "Start the meter"}
          >
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 transition-colors",
                running ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "text-muted-foreground",
              )}
            >
              <span className={cn("size-1.5 rounded-full", running ? "animate-pulse bg-emerald-400" : "bg-muted-foreground/60")} />
              {running ? "Running" : "Stopped"}
            </Badge>
          </button>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="text-muted-foreground text-xs">Fare</div>
          <div className={cn("text-4xl leading-tight font-semibold tracking-tight tabular-nums", !running && fare === 0 && "text-muted-foreground")}>
            {money(fare)}
          </div>
          <Separator className="my-3" />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Rate</dt>
              <dd className="font-medium tabular-nums">
                {money(rate.perMile, 2)}
                <span className="text-muted-foreground font-normal"> / mi</span>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Distance</dt>
              <dd className="font-medium tabular-nums">
                {miles.toFixed(2)}
                <span className="text-muted-foreground font-normal"> mi</span>
              </dd>
            </div>
            {rate.start > 0 && (
              <div className="col-span-2 -mt-1">
                <dt className="text-muted-foreground inline text-xs">Starting fare </dt>
                <dd className="inline text-xs font-medium tabular-nums">{money(rate.start, 2)}</dd>
              </div>
            )}
          </dl>
          {cursor && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button size="sm" variant={running ? "secondary" : "default"} className="flex-1" onClick={toggle}>
                {running ? "Stop meter" : "Start meter"}
              </Button>
              <Button size="sm" variant="ghost" onClick={release} className="text-muted-foreground">
                <Kbd>Esc</Kbd>
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
