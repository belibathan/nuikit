import { Building2, Search, Snowflake, UserRound } from "@/components/ui/icons";
import { Fragment, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { MenuRow } from "@/components/ui/menu-row";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { money, t } from "@/lib/locale";
import { isFrozen, type Account } from "@/lib/types";
import { cn } from "@/lib/utils";

export const accountTitle = (a: Account) => `${a.type ?? ""}${t("account")}/ ${a.id}`.trim();

/** The account's kind: a person or an organisation. `bare` is the icon alone (a sheet header's icon slot). */
export function AccountIcon({ personal, bare, className }: { personal: boolean; bare?: boolean; className?: string }) {
  const I = personal ? UserRound : Building2;
  if (bare) return <I className={className} />;
  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-(--nk-control-face-radius) bg-muted text-muted-foreground", className)}>
      <I className="size-4" />
    </span>
  );
}

function AccountRow({ account, personal, active, onSelect }: { account: Account; personal: boolean; active: boolean; onSelect: () => void }) {
  const frozen = isFrozen(account);
  return (
    <MenuRow
      active={active}
      aria-pressed={active}
      onClick={onSelect}
      className="min-h-14 px-3"
      icon={personal ? <UserRound /> : <Building2 />}
      description={account.type}
      meta={<span className="nk-num">{money(account.amount, "compact")}</span>}
    >
      <span className="flex items-center gap-2">
        <span className="truncate">{account.name || account.id}</span>
        {frozen && <Snowflake className="size-3.5 shrink-0" aria-label={t("frozen")} />}
      </span>
    </MenuRow>
  );
}

/** The accounts as the pause menu's rows: 48px+, a hairline between, the chosen one filled. With the stock name search. */
export function AccountList({ accounts, activeId, onSelect }: { accounts: Account[]; activeId?: string; onSelect: (id: string) => void }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return accounts.map((a, i) => ({ a, i })).filter(({ a }) => !needle || String(a.name ?? "").toLowerCase().includes(needle));
  }, [accounts, q]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="nk-caption">{t("accounts")}</h2>
        <span className="nk-label nk-num">{accounts.length}</span>
      </div>
      <InputGroup className="h-10">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("account_search")} />
      </InputGroup>
      <ScrollArea className="-mr-3 min-h-0 flex-1 pr-3 [&_[data-slot=scroll-area-viewport]>div]:!block">
        <div className="flex flex-col">
          {shown.map(({ a, i }, n) => (
            <Fragment key={`${a.id}:${i}`}>
              {n > 0 && <Separator />}
              <AccountRow account={a} personal={i === 0} active={a.id === activeId} onSelect={() => onSelect(a.id)} />
            </Fragment>
          ))}
          {shown.length === 0 && <EmptyState title={t("account_not_found")} description="Check the spelling, or clear the search." />}
        </div>
      </ScrollArea>
    </div>
  );
}

/** ATM: the accounts as a row of chips in the identity's chip shape; the chosen one is the primary. */
export function AccountChips({ accounts, activeId, onSelect }: { accounts: Account[]; activeId?: string; onSelect: (id: string) => void }) {
  if (accounts.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {accounts.map((a, i) => {
        const active = a.id === activeId;
        return (
          <button
            key={`${a.id}:${i}`}
            type="button"
            onClick={() => onSelect(a.id)}
            aria-pressed={active}
            data-active={active || undefined}
            className="rb-chip"
          >
            {i === 0 ? <UserRound className="size-4" /> : <Building2 className="size-4" />}
            <span className="truncate">{a.name || a.id}</span>
          </button>
        );
      })}
    </div>
  );
}
