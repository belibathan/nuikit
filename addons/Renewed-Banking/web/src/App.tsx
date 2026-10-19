import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Info, Landmark, Snowflake, Wallet, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { AccountChips, AccountIcon, AccountList, accountTitle } from "@/features/accounts";
import { MoneyDialog, type MoneyRequest } from "@/features/money-dialog";
import { RecentList, TransactionsPanel, isOut } from "@/features/transactions";
import { copyText, toCsv } from "@/lib/export";
import { cashLabel, money, setLocale, t, useLocale } from "@/lib/locale";
import { post, useBank } from "@/lib/nui";
import { loadServerTheme } from "@/lib/theme";
import { isFrozen, transactionsOf, type Account, type MoneyAction } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOAST_MS = 3500; // the stock notify duration
const LOADING_TIMEOUT_MS = 15000; // Lua never clears loading when the server callback fails

interface Toast {
  id: number;
  text: string;
}

export default function App() {
  useLocale();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [atm, setAtm] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [request, setRequest] = useState<MoneyRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dialogOpen = useRef(false);
  dialogOpen.current = !!request;

  useEffect(() => {
    void loadServerTheme();
  }, []);

  const toast = (text: string) => {
    const id = Date.now() + Math.random();
    setToasts((l) => [...l.slice(-2), { id, text }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), TOAST_MS);
  };

  useBank("updateLocale", (m) => setLocale(m.translations, m.currency));
  useBank("setLoading", (m) => setLoading(!!m.status));
  useBank("setVisible", (m) => {
    const list = Array.isArray(m.accounts) ? m.accounts : [];
    setAccounts(list);
    setActiveId(list[0]?.id);
    setVisible(!!m.status);
    setLoading(!!m.loading);
    setAtm(!!m.atm);
    setRequest(null);
    setBusy(false);
  });
  useBank("notify", (m) => {
    if (m.status) toast(String(m.status));
  });

  // A failed open leaves `loading` set with nothing to clear it (protocol §6.4).
  useEffect(() => {
    if (!loading || visible) return;
    const id = setTimeout(() => setLoading(false), LOADING_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [loading, visible]);

  const close = () => {
    setVisible(false);
    setRequest(null);
    void post("closeInterface");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape" || !visible) return;
      if (dialogOpen.current) return; // the dialog closes itself first
      close();
    };
    // Capture phase: runs before the dialog's own Escape handling, so an open dialog is still seen as open.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const active = useMemo(() => accounts.find((a) => a.id === activeId), [accounts, activeId]);
  const cash = Number(accounts[0]?.cash) || 0;
  const txs = useMemo(() => transactionsOf(active), [active]);

  const open = (action: MoneyAction, account: Account) => setRequest({ action, account });

  const submit = async (body: { fromAccount: string; amount: number; comment: string; stateid: string }) => {
    if (!request) return;
    setBusy(true);
    try {
      const res = await post<Account[] | false>(request.action, body);
      if (Array.isArray(res)) {
        setAccounts(res);
        setActiveId((id) => (res.some((a) => a.id === id) ? id : res[0]?.id));
        setRequest(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    if (!active) return;
    if (txs.length === 0) return toast("No transactions to export!");
    copyText(toCsv(txs));
    toast("Data copied to clipboard!");
  };

  return (
    <>
      {visible && accounts.length > 0 && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-6">
          {atm ? (
            <AtmView accounts={accounts} active={active} cash={cash} onSelect={setActiveId} onAction={open} onClose={close} />
          ) : (
            <BankView accounts={accounts} active={active} cash={cash} onSelect={setActiveId} onAction={open} onClose={close} onExport={exportCsv} />
          )}
        </div>
      )}

      <MoneyDialog request={request} cash={cash} busy={busy} onCancel={() => setRequest(null)} onSubmit={submit} />

      {loading && !visible && (
        <div className="fixed inset-0 flex items-center justify-center">
          <Card className="flex-row items-center gap-3 px-5 py-4">
            <Spinner className="size-5" />
            <div>
              <div className="text-sm font-semibold">{t("bank_name")}</div>
              <div className="text-muted-foreground text-xs">{t("nuikit_loading")}</div>
            </div>
          </Card>
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-0 top-6 z-[60] flex flex-col items-center gap-2">
        {toasts.map((n) => (
          <Card key={n.id} className="rb-toast flex-row items-center gap-3 px-4 py-3 shadow-lg">
            <Info className="text-muted-foreground size-4 shrink-0" />
            <span className="text-sm font-medium">{n.text}</span>
          </Card>
        ))}
      </div>
    </>
  );
}

interface ViewProps {
  accounts: Account[];
  active?: Account;
  cash: number;
  onSelect: (id: string) => void;
  onAction: (action: MoneyAction, account: Account) => void;
  onClose: () => void;
}

function Actions({ account, atm, onAction, className }: { account: Account; atm: boolean; onAction: ViewProps["onAction"]; className?: string }) {
  if (isFrozen(account)) {
    return (
      <Badge variant="outline" className={cn("h-9 gap-2 px-3 text-sm", className)}>
        <Snowflake />
        {t("frozen")}
      </Badge>
    );
  }
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {!atm && (
        <Button onClick={() => onAction("deposit", account)}>
          <ArrowDownLeft />
          {t("deposit_but")}
        </Button>
      )}
      <Button variant={atm ? "default" : "secondary"} onClick={() => onAction("withdraw", account)}>
        <ArrowUpRight />
        {t("withdraw_but")}
      </Button>
      <Button variant="secondary" onClick={() => onAction("transfer", account)}>
        <ArrowLeftRight />
        {t("transfer_but")}
      </Button>
    </div>
  );
}

function Brand({ atm }: { atm: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
        <Landmark className="size-[18px]" />
      </span>
      <div className="leading-tight">
        <div className="flex items-center gap-2 font-semibold">
          {t("bank_name")}
          {atm && <Badge variant="secondary">{t("nuikit_atm")}</Badge>}
        </div>
      </div>
    </div>
  );
}

function CashPill({ cash }: { cash: number }) {
  return (
    <div className="bg-muted/60 flex items-center gap-2 rounded-full px-3 py-1.5 text-sm">
      <Wallet className="text-muted-foreground size-4" />
      <span className="text-muted-foreground">{cashLabel()}</span>
      <span className="rb-num font-semibold">{money(cash)}</span>
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground gap-2">
      <Kbd>Esc</Kbd>
      <X />
    </Button>
  );
}

function BankView({ accounts, active, cash, onSelect, onAction, onClose, onExport }: ViewProps & { onExport: () => void }) {
  const txs = transactionsOf(active);
  const totals = txs.reduce((s, tx) => (isOut(tx) ? { ...s, out: s.out + (Number(tx.amount) || 0) } : { ...s, in: s.in + (Number(tx.amount) || 0) }), { in: 0, out: 0 });
  const personal = active?.id === accounts[0]?.id;

  return (
    <Card className="h-[min(760px,88vh)] w-[min(1180px,94vw)] gap-0 overflow-hidden py-0 shadow-2xl">
      <header className="flex items-center gap-4 border-b px-5 py-3">
        <Brand atm={false} />
        <div className="ml-auto flex items-center gap-2">
          <CashPill cash={cash} />
          <CloseButton onClose={onClose} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="bg-muted/20 flex w-80 shrink-0 flex-col border-r p-4">
          <AccountList accounts={accounts} activeId={active?.id} onSelect={onSelect} />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-5 p-5">
          {active ? (
            <>
              <section className="flex flex-wrap items-end gap-x-8 gap-y-4">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <AccountIcon personal={personal} className="size-12 rounded-xl" />
                  <div className="min-w-0">
                    <div className="text-muted-foreground truncate text-sm">{accountTitle(active)}</div>
                    <div className="truncate text-lg font-semibold">{active.name}</div>
                    <div className="rb-num mt-2 text-4xl font-bold tracking-tight">{money(active.amount)}</div>
                    <div className="text-muted-foreground mt-1 text-xs">{t("balance")}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex gap-6 text-right">
                    <div>
                      <div className="text-muted-foreground text-xs">{t("nuikit_total_in")}</div>
                      <div className={cn("rb-num font-semibold", !totals.in && "text-muted-foreground")}>+{money(totals.in)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">{t("nuikit_total_out")}</div>
                      <div className={cn("rb-num font-semibold", totals.out ? "text-destructive" : "text-muted-foreground")}>−{money(totals.out)}</div>
                    </div>
                  </div>
                  <Actions account={active} atm={false} onAction={onAction} />
                </div>
              </section>
              <Separator />
              <TransactionsPanel key={active.id} transactions={txs} onExport={onExport} canExport />
            </>
          ) : (
            <p className="text-muted-foreground m-auto text-sm">{t("select_account")}</p>
          )}
        </main>
      </div>
    </Card>
  );
}

function AtmView({ accounts, active, cash, onSelect, onAction, onClose }: ViewProps) {
  return (
    <Card className="w-[min(440px,94vw)] gap-0 overflow-hidden py-0 shadow-2xl">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Brand atm />
        <div className="ml-auto">
          <CloseButton onClose={onClose} />
        </div>
      </header>
      <div className="flex flex-col gap-4 p-4">
        <AccountChips accounts={accounts} activeId={active?.id} onSelect={onSelect} />
        {active ? (
          <>
            <div className="bg-muted/40 rounded-xl border p-4">
              <div className="text-muted-foreground truncate text-xs">{accountTitle(active)}</div>
              <div className="rb-num mt-1 text-3xl font-bold tracking-tight">{money(active.amount)}</div>
              <div className="text-muted-foreground mt-0.5 text-xs">{t("balance")}</div>
              <Actions account={active} atm onAction={onAction} className="mt-4 [&>button]:flex-1" />
            </div>
            <div>
              <div className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">{t("nuikit_recent")}</div>
              <RecentList transactions={transactionsOf(active)} />
            </div>
          </>
        ) : (
          <p className="text-muted-foreground py-6 text-center text-sm">{t("select_account")}</p>
        )}
      </div>
      <footer className="flex items-center justify-between border-t px-4 py-2.5">
        <CashPill cash={cash} />
      </footer>
    </Card>
  );
}
