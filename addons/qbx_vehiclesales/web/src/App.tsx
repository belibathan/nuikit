import { isBrowser } from "nuikit-core";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ActionBar, ActionBarItem } from "@/components/ui/action-bar";
import { Kbd } from "@/components/ui/kbd";
import { MenuRow } from "@/components/ui/menu-row";
import { NuiImage } from "@/components/ui/nui-image";
import { formatMoney } from "@/components/ui/money";
import { EdgeSheet, EdgeSheetBody, EdgeSheetFooter } from "@/components/ui/edge-sheet";
import { Stat } from "@/components/ui/stat";
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
/** The kit's money format (registry money): whole dollars, en-US, as the stock contract shows them. */
const money = (n: number) => formatMoney(Math.max(0, Math.round(n)));
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
    <div className="flex flex-col">
      {rows.map(([label, pct, value]) => (
        <MenuRow key={label} readOnly meta={`−${value}`}>
          {label} <span className="nk-num nk-label text-muted-foreground">{pct}</span>
        </MenuRow>
      ))}
      <MenuRow readOnly meta={money(Math.ceil((p / 100) * 77))} className="border-t font-medium">
        Seller receives <span className="nk-num nk-label text-muted-foreground">77%</span>
      </MenuRow>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="nk-label">{label}</dt>
      <dd className={cn("nk-body truncate", mono && "font-mono")} title={value}>
        {value || "—"}
      </dd>
    </div>
  );
}

/**
 * The car on the contract: qbx_vehiclesales doesn't send its model, so ask the nuikit resource for the
 * vehicle the player sits in or stands at (https://nuikit/vehicle, read only). Not a qbx_vehiclesales
 * callback: its protocol is unchanged. In the browser, ?model= stands in. No nuikit: no picture.
 */
async function vehicleModel(): Promise<string | null> {
  if (isBrowser()) return new URLSearchParams(location.search).get("model");
  try {
    const res = await fetch("https://nuikit/vehicle", { method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8" }, body: "{}" });
    const data = (await res.json()) as { model?: string };
    return typeof data?.model === "string" && data.model ? data.model : null;
  } catch {
    return null;
  }
}

/** qbx_vehiclesales' sale contract. Protocol: docs/qbx-vehiclesales-protocol.md */
/** Rendered by NuiImage only when no source loads: tells the contract to drop the picture's box. */
function Gone({ onGone }: { onGone: () => void }) {
  useEffect(onGone, [onGone]);
  return null;
}

export default function App() {
  const [c, setC] = useState<Contract | null>(null);
  const [desc, setDesc] = useState("");
  const [priceText, setPriceText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  const [model, setModel] = useState<string | null>(null);
  // the model whose picture didn't load from any source: its box goes, the contract looks as before
  const [noPicture, setNoPicture] = useState<string | null>(null);

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
    void vehicleModel().then(setModel);
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

  // the last contract stays drawn while the sheet slides out
  const last = useRef<Contract | null>(null);
  if (c) last.current = c;
  const shown = c ?? last.current;
  if (!shown) return null;
  const selling = shown.mode === "sellVehicle";
  const typed = parsePrice(priceText);

  return (
    // A floating edge sheet on the right (the pause menu's backdrop, registry edge-sheet), the
    // contract top to bottom: who sells, the vehicle, the price, then the one action.
    <EdgeSheet
      open={!!c}
      side="right"
      width="34rem"
      fit
      aria-labelledby="contract-title"
          icon={<img src="./logo.svg" alt="" className="size-7 rounded-(--nk-control-face-radius)" draggable={false} />}
          // "Vehicle Sales Contract - Larry's Vehicle Sales" → the business is the title
          title={
            <span id="contract-title" title={shown.bizName}>
              {shown.bizName.split(" - ").slice(1).join(" - ").trim() || shown.bizName || "Vehicle sale contract"}
            </span>
          }
          description={selling ? "List your vehicle for sale" : shown.takeBack ? "Your listing" : "Vehicle for sale"}
          actions={
            shown.plate && (
              <Kbd className="h-7 px-2 font-mono text-sm uppercase" title="Plate">
                {shown.plate}
              </Kbd>
            )
          }
        >
        <EdgeSheetBody scroll>
        {model && noPicture !== model && (
          <div className="mb-4 flex aspect-[16/7] items-center justify-center overflow-hidden rounded-(--nk-row-radius) bg-muted/60">
            <NuiImage kind="vehicle" imageKey={model} alt={model} className="h-full w-auto" fallback={<Gone onGone={() => setNoPicture(model)} />} />
          </div>
        )}
        <dl className="grid grid-cols-3 gap-4 border-b pb-4">
          <Detail label="Seller" value={shown.seller} />
          <Detail label="Bank account" value={shown.account} mono />
          <Detail label="Phone" value={shown.phone} mono />
        </dl>

        <div className="flex flex-col gap-6 pt-6">
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
                <p className={cn("text-sm whitespace-pre-line", !shown.desc && "text-muted-foreground")}>{shown.desc || "No description."}</p>
              </div>
              <div className="flex items-end justify-between gap-3">
                <Stat size="display" label="Price" value={money(shown.price)} />
                <span className="nk-label pb-1">Paid from your bank</span>
              </div>
              {shown.takeBack && (
                <div className="border-t pt-4">
                  <Breakdown price={shown.price} />
                </div>
              )}
            </>
          )}
        </div>

        </EdgeSheetBody>
        <EdgeSheetFooter className="justify-between">
          <ActionBar>
            <ActionBarItem keys={["Esc"]} label="Cancel" onClick={() => finish()} />
          </ActionBar>
          <div className="flex items-center gap-2">
            {selling ? (
              <Button size="lg" onClick={sell}>List for {Number.isFinite(typed) && typed > 0 ? money(typed) : "sale"}</Button>
            ) : (
              <>
                {/* The stock page offers both to the seller too; take back is what they'll want. */}
                <Button size="lg" variant={shown.takeBack ? "outline" : "default"} onClick={() => finish("buyVehicle")}>
                  Buy for {money(shown.price)}
                </Button>
                {shown.takeBack && <Button size="lg" onClick={() => finish("takeVehicleBack")}>Take back</Button>}
              </>
            )}
          </div>
        </EdgeSheetFooter>
    </EdgeSheet>
  );
}
