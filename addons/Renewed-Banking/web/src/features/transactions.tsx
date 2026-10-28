import { ArrowDownLeft, ArrowUpRight, FileDown, ReceiptText, Search } from "@/components/ui/icons";
import { Fragment, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MenuRow } from "@/components/ui/menu-row";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ago, money, t } from "@/lib/locale";
import type { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

type Dir = "all" | "in" | "out";

export const isOut = (tx: Transaction) => tx.trans_type === "withdraw";

/** The stock search: message, trans_id or receiver, case-insensitive. */
export function matches(tx: Transaction, q: string) {
  if (!q) return true;
  const n = q.toLowerCase();
  return [tx.message, tx.trans_id, tx.receiver].some((f) => String(f ?? "").toLowerCase().includes(n));
}

export function Amount({ tx, className }: { tx: Transaction; className?: string }) {
  const out = isOut(tx);
  return (
    <span className={cn("nk-num whitespace-nowrap", className)}>
      {out ? "−" : "+"}
      {money(Math.abs(Number(tx.amount) || 0))}
    </span>
  );
}

export function NoTransactions({ text }: { text: string }) {
  return <EmptyState icon={<ReceiptText />} title={text} description="Deposits, withdrawals and transfers show up here." />;
}

/** One transaction as a read-only row: direction, message, when and who, the amount. */
function TxRow({ tx, full }: { tx: Transaction; full?: boolean }) {
  return (
    <MenuRow
      readOnly
      title={tx.title}
      icon={isOut(tx) ? <ArrowUpRight /> : <ArrowDownLeft />}
      description={
        <>
          {ago(tx.time)}
          {full && (
            <>
              {" · "}
              {tx.issuer} → {tx.receiver}
              {" · "}
              <span className="font-mono">{String(tx.trans_id ?? "").slice(0, 8)}</span>
            </>
          )}
        </>
      }
      meta={<Amount tx={tx} />}
    >
      {tx.message || tx.title}
    </MenuRow>
  );
}

/** Bank mode: filters, search, export and the full list. */
export function TransactionsPanel({ transactions, onExport, canExport }: { transactions: Transaction[]; onExport: () => void; canExport: boolean }) {
  const [q, setQ] = useState("");
  const [dir, setDir] = useState<Dir>("all");
  const rows = useMemo(
    () => transactions.filter((tx) => matches(tx, q.trim()) && (dir === "all" || (dir === "out") === isOut(tx))),
    [transactions, q, dir],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="nk-caption">{t("transactions")}</h2>
        {canExport && (
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={onExport} aria-label={t("export_data")} title={t("export_data")}>
            <FileDown />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <InputGroup className="h-9 min-w-0 flex-1">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("trans_search")} />
        </InputGroup>
        <ToggleGroup type="single" variant="outline" value={dir} onValueChange={(v) => v && setDir(v as Dir)}>
          <ToggleGroupItem value="all" className="px-3">
            {t("nuikit_all")}
          </ToggleGroupItem>
          <ToggleGroupItem value="in" className="px-3">
            {t("nuikit_in")}
          </ToggleGroupItem>
          <ToggleGroupItem value="out" className="px-3">
            {t("nuikit_out")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {rows.length === 0 ? (
        <NoTransactions text={t("trans_not_found")} />
      ) : (
        <ScrollArea className="-mr-3 min-h-0 flex-1 pr-3 [&_[data-slot=scroll-area-viewport]>div]:!block">
          <div className="flex flex-col">
            {rows.map((tx, i) => (
              <Fragment key={`${tx.trans_id}:${i}`}>
                <TxRow tx={tx} full />
              </Fragment>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

/** ATM: the latest few, no filters or export. */
export function RecentList({ transactions, limit = 4 }: { transactions: Transaction[]; limit?: number }) {
  const rows = transactions.slice(0, limit);
  if (rows.length === 0) return <NoTransactions text={t("trans_not_found")} />;
  return (
    <div className="flex flex-col">
      {rows.map((tx, i) => (
        <Fragment key={`${tx.trans_id}:${i}`}>
          <TxRow tx={tx} />
        </Fragment>
      ))}
    </div>
  );
}
