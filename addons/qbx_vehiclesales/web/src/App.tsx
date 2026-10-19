import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { post, useMessages, type Callback } from "@/lib/nui";
import { loadServerTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Mode = "sellVehicle" | "buyVehicle";

interface Contract {
  mode: Mode;
  bizName: string;
  seller: string;
  account: string;
  phone: string;
  plate: string;
  desc: string;
  price: number;
  takeBack: boolean;
}

/** `price` is an int(11) column. */
const MAX_PRICE = 2_147_483_647;
const money = (n: number) => "$" + Math.max(0, Math.round(n)).toLocaleString("en-US");
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
/** "12,500" / "$12500" → 12500; anything else → NaN */
const parsePrice = (s: string) => {
  const t = s.replace(/[\s,$]/g, "");
  return /^\d+$/.test(t) ? Number(t) : NaN;
};

/** The split the server applies: the seller is paid ceil(price × 77 %). Tax and fee are display only. */
function Breakdown({ price }: { price: number }) {
  const p = Number.isFinite(price) && price > 0 ? price : 0;
  const rows: [string, string, string][] = [
    ["Tax", "19%", money(p * 0.19)],
    ["Dealer fee", "4%", money(p * 0.04)],
  ];
  return (
    <div className="bg-muted/40 rounded-md border px-3 py-2 text-sm">
      {rows.map(([label, pct, value]) => (
        <div key={label} className="text-muted-foreground flex items-center justify-between py-0.5">
          <span>
            {label} <span className="text-xs opacity-70">{pct}</span>
          </span>
          <span className="tabular-nums">−{value}</span>
        </div>
      ))}
      <Separator className="my-1.5" />
      <div className="flex items-center justify-between py-0.5 font-medium">
        <span>
          Seller receives <span className="text-muted-foreground text-xs font-normal">77%</span>
        </span>
        <span className="tabular-nums">{money(Math.ceil((p / 100) * 77))}</span>
      </div>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn("truncate text-sm font-medium", mono && "font-mono text-[0.8125rem]")} title={value}>
        {value || "—"}
      </dd>
    </div>
  );
}

/** qbx_vehiclesales' sale contract. Protocol: docs/qbx-vehiclesales-protocol.md */
export default function App() {
  const [c, setC] = useState<Contract | null>(null);
  const [desc, setDesc] = useState("");
  const [priceText, setPriceText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  useMessages((m) => {
    if (m.action !== "sellVehicle" && m.action !== "buyVehicle") return;
    const s = m.sellerData ?? {};
    const v = m.vehicleData ?? {};
    const contract: Contract = {
      mode: m.action,
      bizName: str(m.bizName),
      seller: [str(s.firstname), str(s.lastname)].filter(Boolean).join(" "),
      account: str(s.account),
      phone: str(s.phone),
      plate: str(m.plate).trim(),
      desc: m.action === "buyVehicle" ? str(v.desc) : "",
      price: m.action === "buyVehicle" ? Number(v.price) || 0 : 0,
      takeBack: m.action === "buyVehicle" && m.showTakeBackOption === true,
    };
    busy.current = false;
    setC(contract);
    setDesc(contract.desc);
    setPriceText("");
    setError(null);
  });

  /** Every way out ends with `close`: it's the only callback that releases focus. */
  const finish = (action?: Callback, body?: unknown) => {
    if (busy.current) return;
    busy.current = true;
    setC(null);
    void (async () => {
      if (action) await post(action, body);
      await post("close");
    })();
  };

  const sell = () => {
    const price = parsePrice(priceText);
    if (!priceText.trim()) return setError("Enter an asking price.");
    if (!Number.isFinite(price) || price <= 0) return setError("The price must be a whole number above $0.");
    if (price > MAX_PRICE) return setError(`The price can't be more than ${money(MAX_PRICE)}.`);
    finish("sellVehicle", { price, desc: desc.trim() });
  };

  useEffect(() => {
    void loadServerTheme();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keyup", key);
    return () => window.removeEventListener("keyup", key);
  }, []);

  useEffect(() => {
    if (c?.mode === "sellVehicle") priceRef.current?.focus();
  }, [c]);

  if (!c) return null;
  const selling = c.mode === "sellVehicle";
  const typed = parsePrice(priceText);

  return (
    <div className="contract-backdrop fixed inset-0 flex items-center justify-center bg-black/40 p-6">
      <Card className="contract w-full max-w-md gap-5 shadow-2xl">
        <CardHeader className="flex flex-row items-center gap-3">
          <img src="./logo.svg" alt="" className="size-10 shrink-0 rounded-lg" draggable={false} />
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate leading-snug" title={c.bizName}>
              {/* "Vehicle Sales Contract - Larry's Vehicle Sales" → the business is the title */}
              {c.bizName.split(" - ").slice(1).join(" - ").trim() || c.bizName || "Vehicle sale contract"}
            </CardTitle>
            <CardDescription>{selling ? "List your vehicle for sale" : c.takeBack ? "Your listing" : "Vehicle for sale"}</CardDescription>
          </div>
          {c.plate && (
            <Badge variant="outline" className="bg-background/60 shrink-0 rounded-md px-2 py-1 font-mono text-xs tracking-widest uppercase">
              {c.plate}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <dl className="grid grid-cols-3 gap-3">
            <Detail label="Seller" value={c.seller} />
            <Detail label="Bank account" value={c.account} mono />
            <Detail label="Phone" value={c.phone} mono />
          </dl>
          <Separator />

          {selling ? (
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="desc">Description</FieldLabel>
                <Textarea
                  id="desc"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Condition, mileage, upgrades…"
                  className="max-h-32 min-h-20 resize-none"
                  maxLength={500}
                />
              </Field>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="price">Asking price</FieldLabel>
                <div className="relative">
                  <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm">$</span>
                  <Input
                    id="price"
                    ref={priceRef}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    className="price-input pl-6 tabular-nums"
                    value={priceText}
                    aria-invalid={error ? true : undefined}
                    onChange={(e) => {
                      setPriceText(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && sell()}
                  />
                </div>
                {error ? <FieldError>{error}</FieldError> : <FieldDescription>Buyers pay this. The lot keeps 23%.</FieldDescription>}
              </Field>
              <Breakdown price={typed} />
            </FieldGroup>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-muted-foreground mb-1 text-xs">Description</div>
                <p className={cn("text-sm whitespace-pre-line", !c.desc && "text-muted-foreground italic")}>
                  {c.desc || "No description."}
                </p>
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-muted-foreground text-xs">Price</div>
                  <div className="text-3xl font-semibold tracking-tight tabular-nums">{money(c.price)}</div>
                </div>
                <span className="text-muted-foreground pb-1 text-xs">Paid from your bank</span>
              </div>
              {c.takeBack && <Breakdown price={c.price} />}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between gap-2">
          <Button variant="ghost" className="text-muted-foreground" onClick={() => finish()}>
            <Kbd>Esc</Kbd>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {selling ? (
              <Button onClick={sell}>List for {Number.isFinite(typed) && typed > 0 ? money(typed) : "sale"}</Button>
            ) : (
              <>
                {/* The stock page offers both to the seller too; take back is what they'll want. */}
                <Button variant={c.takeBack ? "outline" : "default"} onClick={() => finish("buyVehicle")}>
                  Buy for {money(c.price)}
                </Button>
                {c.takeBack && <Button onClick={() => finish("takeVehicleBack")}>Take back</Button>}
              </>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
