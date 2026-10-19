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

function Direction({ out, className }: { out: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        out ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-foreground",
        className,
      )}
    >
      {out ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
    </span>
  );
}

export function Amount({ tx, className }: { tx: Transaction; className?: string }) {
  const out = isOut(tx);
  return (
    <span className={cn("rb-num font-semibold whitespace-nowrap", out ? "text-destructive" : "text-foreground", className)}>
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
        <EmptyTitle>{text}</EmptyTitle>
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
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-semibold">{t("transactions")}</h2>
        <ToggleGroup type="single" variant="outline" size="sm" value={dir} onValueChange={(v) => v && setDir(v as Dir)}>
          <ToggleGroupItem value="all" className="px-3">
            {t("nuikit_all")}
          </ToggleGroupItem>
          <ToggleGroupItem value="in" className="px-3">
            <ArrowDownLeft />
            {t("nuikit_in")}
          </ToggleGroupItem>
          <ToggleGroupItem value="out" className="px-3">
            <ArrowUpRight />
            {t("nuikit_out")}
          </ToggleGroupItem>
        </ToggleGroup>
        {canExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <FileDown />
            {t("export_data")}
          </Button>
        )}
      </div>
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("trans_search")} />
      </InputGroup>
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
        {rows.length === 0 ? (
          <NoTransactions text={t("trans_not_found")} />
        ) : (
          <ScrollArea className="h-full [&_[data-slot=scroll-area-viewport]>div]:!block">
            <Table className="table-fixed">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-4">{t("message")}</TableHead>
                  <TableHead className="w-[30%]">
                    {t("nuikit_from")} → {t("nuikit_to")}
                  </TableHead>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead className="w-36 pr-4 text-right">{t("amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((tx, i) => (
                  <TableRow key={`${tx.trans_id}:${i}`}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <Direction out={isOut(tx)} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{tx.message || tx.title}</div>
                          <div className="text-muted-foreground truncate text-xs">
                            {ago(tx.time)} · {tx.title}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="truncate text-xs">
                        <span className="text-foreground">{tx.issuer}</span> → <span className="text-foreground">{tx.receiver}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{String(tx.trans_id ?? "").slice(0, 8)}</TableCell>
                    <TableCell className="pr-4 text-right">
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
        <div key={`${tx.trans_id}:${i}`} className="flex items-center gap-3 border-b py-2 last:border-b-0">
          <Direction out={isOut(tx)} className="size-7" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{tx.message || tx.title}</div>
            <div className="text-muted-foreground truncate text-xs">{ago(tx.time)}</div>
          </div>
          <Amount tx={tx} className="text-sm" />
        </div>
      ))}
    </div>
  );
}
