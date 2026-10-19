import { Building2, Search, Snowflake, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { money, t } from "@/lib/locale";
import { isFrozen, type Account } from "@/lib/types";
import { cn } from "@/lib/utils";

export const accountTitle = (a: Account) => `${a.type ?? ""}${t("account")}/ ${a.id}`.trim();

export function AccountIcon({ personal, className }: { personal: boolean; className?: string }) {
  const I = personal ? UserRound : Building2;
  return (
    <span className={cn("bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg", className)}>
      <I className="size-4" />
    </span>
  );
}

function AccountRow({ account, personal, active, onSelect }: { account: Account; personal: boolean; active: boolean; onSelect: () => void }) {
  const frozen = isFrozen(account);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors outline-none",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        active ? "border-primary/40 bg-accent text-accent-foreground" : "border-transparent hover:bg-accent/50",
      )}
    >
      <AccountIcon personal={personal} className={active ? "bg-primary text-primary-foreground" : undefined} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{account.name || account.id}</span>
          {frozen && <Snowflake className="text-muted-foreground size-3.5 shrink-0" />}
        </span>
        <span className="text-muted-foreground block truncate text-xs">
          {account.type} · <span className="font-mono">{account.id}</span>
        </span>
      </span>
      <span className="rb-num shrink-0 text-sm font-semibold">{money(account.amount, "compact")}</span>
    </button>
  );
}

/** Sidebar list with the stock name search. */
export function AccountList({ accounts, activeId, onSelect }: { accounts: Account[]; activeId?: string; onSelect: (id: string) => void }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return accounts.map((a, i) => ({ a, i })).filter(({ a }) => !needle || String(a.name ?? "").toLowerCase().includes(needle));
  }, [accounts, q]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">{t("accounts")}</h2>
        <Badge variant="secondary" className="rb-num">
          {accounts.length}
        </Badge>
      </div>
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("account_search")} />
      </InputGroup>
      <ScrollArea className="-mx-1 min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:!block">
        <div className="flex flex-col gap-1 px-1">
          {shown.map(({ a, i }) => (
            <AccountRow key={`${a.id}:${i}`} account={a} personal={i === 0} active={a.id === activeId} onSelect={() => onSelect(a.id)} />
          ))}
          {shown.length === 0 && <p className="text-muted-foreground px-2 py-6 text-center text-sm">{t("account_not_found")}</p>}
        </div>
      </ScrollArea>
    </div>
  );
}

/** ATM: a horizontal strip of account chips. */
export function AccountChips({ accounts, activeId, onSelect }: { accounts: Account[]; activeId?: string; onSelect: (id: string) => void }) {
  if (accounts.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {accounts.map((a, i) => {
        const active = a.id === activeId;
        return (
          <button
            key={`${a.id}:${i}`}
            type="button"
            onClick={() => onSelect(a.id)}
            aria-pressed={active}
            className={cn(
              "inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors outline-none",
              "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              active ? "bg-primary text-primary-foreground border-transparent" : "hover:bg-accent text-muted-foreground",
            )}
          >
            {i === 0 ? <UserRound className="size-3.5" /> : <Building2 className="size-3.5" />}
            <span className="truncate">{a.name || a.id}</span>
          </button>
        );
      })}
    </div>
  );
}
