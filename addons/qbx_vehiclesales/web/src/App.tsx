import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
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
    <div className="flex flex-col gap-2 text-sm">
      {rows.map(([label, pct, value]) => (
        <div key={label} className="text-muted-foreground flex items-center justify-between">
          <span>
            {label} <span className="nk-num text-xs">{pct}</span>
          </span>
          <span className="nk-num">−{value}</span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t pt-2 font-medium">
        <span>
          Seller receives <span className="nk-num text-muted-foreground text-xs font-normal">77%</span>
        </span>
        <span className="nk-num">{money(Math.ceil((p / 100) * 77))}</span>
      </div>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="nk-label">{label}</dt>
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
      <section className="nk-panel nk-enter w-full max-w-md overflow-hidden" role="dialog" aria-labelledby="contract-title">
        <header className="nk-panel-header">
          <img src="./logo.svg" alt="" className="size-8 shrink-0 rounded-md" draggable={false} />
          <div className="min-w-0 flex-1">
            <h2 id="contract-title" className="nk-title truncate" title={c.bizName}>
              {/* "Vehicle Sales Contract - Larry's Vehicle Sales" → the business is the title */}
              {c.bizName.split(" - ").slice(1).join(" - ").trim() || c.bizName || "Vehicle sale contract"}
            </h2>
            <p className="nk-label truncate">{selling ? "List your vehicle for sale" : c.takeBack ? "Your listing" : "Vehicle for sale"}</p>
          </div>
          {c.plate && (
            <span className="shrink-0 rounded-md border bg-muted px-2 py-1 font-mono text-xs leading-4 font-medium uppercase" title="Plate">
              {c.plate}
            </span>
          )}
        </header>

        <dl className="grid grid-cols-3 gap-4 border-b px-4 py-3">
          <Detail label="Seller" value={c.seller} />
          <Detail label="Bank account" value={c.account} mono />
          <Detail label="Phone" value={c.phone} mono />
        </dl>

        <div className="flex flex-col gap-4 p-4">
          {selling ? (
            <FieldGroup className="gap-4">
              <Field className="gap-2">
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
              <Field className="gap-2" data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="price">Asking price</FieldLabel>
                <div className="relative">
                  <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm">$</span>
                  <Input
                    id="price"
                    ref={priceRef}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    className="price-input nk-num pl-6"
                    value={priceText}
                    aria-invalid={error ? true : undefined}
                    onChange={(e) => {
                      setPriceText(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && sell()}
                  />
                </div>
                {error ? <FieldError>{error}</FieldError> : <FieldDescription className="text-xs">Buyers pay this. The lot keeps 23%.</FieldDescription>}
              </Field>
              <div className="border-t pt-4">
                <Breakdown price={typed} />
              </div>
            </FieldGroup>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <span className="nk-label">Description</span>
                <p className={cn("text-sm whitespace-pre-line", !c.desc && "text-muted-foreground")}>{c.desc || "No description."}</p>
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="nk-label">Price</span>
                  <span className="nk-num text-[2rem] leading-10 font-semibold">{money(c.price)}</span>
                </div>
                <span className="nk-label pb-1.5 font-normal">Paid from your bank</span>
              </div>
              {c.takeBack && (
                <div className="border-t pt-4">
                  <Breakdown price={c.price} />
                </div>
              )}
            </>
          )}
        </div>

        <footer className="nk-panel-footer justify-between">
          <Button variant="ghost" className="text-muted-foreground -ml-2" onClick={() => finish()}>
            Cancel
            <Kbd>Esc</Kbd>
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
        </footer>
      </section>
    </div>
  );
}
