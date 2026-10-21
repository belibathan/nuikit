import { ArrowDownLeft, ArrowUpRight, FileDown, ReceiptText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

/** Direction is carried by the arrow and the sign, so amounts stay neutral. */
function Direction({ out, className }: { out: boolean; className?: string }) {
  return (
    <span className={cn("bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full", className)}>
      {out ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
    </span>
  );
}

export function Amount({ tx, className }: { tx: Transaction; className?: string }) {
  const out = isOut(tx);
  return (
    <span className={cn("nk-num font-medium whitespace-nowrap", className)}>
      {out ? "−" : "+"}
      {money(Math.abs(Number(tx.amount) || 0))}
    </span>
  );
}

export function NoTransactions({ text }: { text: string }) {
  return (
    <Empty className="border-0 py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ReceiptText />
        </EmptyMedia>
        <EmptyTitle className="text-sm font-medium">{text}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}

/** Bank mode: filters, search, export and the full table. */
export function TransactionsPanel({ transactions, onExport, canExport }: { transactions: Transaction[]; onExport: () => void; canExport: boolean }) {
  const [q, setQ] = useState("");
  const [dir, setDir] = useState<Dir>("all");
  const rows = useMemo(
    () => transactions.filter((tx) => matches(tx, q.trim()) && (dir === "all" || (dir === "out") === isOut(tx))),
    [transactions, q, dir],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 px-6 pt-4 pb-3">
        <h2 className="mr-4 text-sm font-medium">{t("transactions")}</h2>
        <InputGroup className="h-8 min-w-48 flex-1">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("trans_search")} />
        </InputGroup>
        <ToggleGroup type="single" variant="outline" size="sm" value={dir} onValueChange={(v) => v && setDir(v as Dir)}>
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
        {canExport && (
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={onExport} aria-label={t("export_data")} title={t("export_data")}>
            <FileDown />
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {rows.length === 0 ? (
          <NoTransactions text={t("trans_not_found")} />
        ) : (
          <ScrollArea className="h-full [&_[data-slot=scroll-area-viewport]>div]:!block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {/* nk-label's size, the table head's own weight and colour (as shipped; the kit cn() would drop them before nk-label) */}
                  <TableHead className="nk-label font-medium text-foreground h-8 pl-6">{t("message")}</TableHead>
                  <TableHead className="nk-label font-medium text-foreground h-8 w-[30%]">
                    {t("nuikit_from")} → {t("nuikit_to")}
                  </TableHead>
                  <TableHead className="nk-label font-medium text-foreground h-8 w-24">ID</TableHead>
                  <TableHead className="nk-label font-medium text-foreground h-8 w-36 pr-6 text-right">{t("amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((tx, i) => (
                  <TableRow key={`${tx.trans_id}:${i}`} className="border-border/60">
                    <TableCell className="py-2 pl-6">
                      <div className="flex items-center gap-3" title={tx.title}>
                        <Direction out={isOut(tx)} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{tx.message || tx.title}</div>
                          <div className="nk-label truncate font-normal">{ago(tx.time)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="truncate">
                        {tx.issuer} → {tx.receiver}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{String(tx.trans_id ?? "").slice(0, 8)}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <Amount tx={tx} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

/** ATM: the latest few, no filters or export. */
export function RecentList({ transactions, limit = 4 }: { transactions: Transaction[]; limit?: number }) {
  const rows = transactions.slice(0, limit);
  if (rows.length === 0) return <p className="text-muted-foreground py-4 text-center text-sm">{t("trans_not_found")}</p>;
  return (
    <div className="flex flex-col">
      {rows.map((tx, i) => (
        <div key={`${tx.trans_id}:${i}`} className="flex min-h-12 items-center gap-3 border-b py-2 last:border-b-0">
          <Direction out={isOut(tx)} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{tx.message || tx.title}</div>
            <div className="nk-label truncate font-normal">{ago(tx.time)}</div>
          </div>
          <Amount tx={tx} className="text-sm" />
        </div>
      ))}
    </div>
  );
}
