import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Info, Landmark, Snowflake, Wallet, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Panel, PanelFooter, PanelHeader } from "@/components/ui/panel";
import { Spinner } from "@/components/ui/spinner";
import { Stat } from "@/components/ui/stat";
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-12">
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
          <div className="nk-panel nk-enter flex items-center gap-3 px-4 py-3">
            <Spinner className="text-muted-foreground size-4" />
            <div>
              <div className="nk-title">{t("bank_name")}</div>
              <div className="nk-label">{t("nuikit_loading")}</div>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-0 top-6 z-[60] flex flex-col items-center gap-2">
        {toasts.map((n) => (
          <div key={n.id} className="nk-panel nk-enter flex min-h-10 items-center gap-3 px-4 py-2 text-sm font-medium">
            <Info className="text-muted-foreground size-4 shrink-0" />
            {n.text}
          </div>
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

/** One loud action per surface: deposit at the bank, withdraw at the ATM; the rest stay outlined. */
function Actions({ account, atm, onAction, className }: { account: Account; atm: boolean; onAction: ViewProps["onAction"]; className?: string }) {
  if (isFrozen(account)) {
    return (
      <div className={cn("text-muted-foreground flex h-9 items-center gap-2 rounded-md border px-3 text-sm", className)}>
        <Snowflake className="size-4 shrink-0" />
        {t("frozen")}
      </div>
    );
  }
  return (
    <div className={cn("flex gap-2", className)}>
      {!atm && (
        <Button onClick={() => onAction("deposit", account)}>
          <ArrowDownLeft />
          {t("deposit_but")}
        </Button>
      )}
      <Button variant={atm ? "default" : "outline"} onClick={() => onAction("withdraw", account)}>
        <ArrowUpRight />
        {t("withdraw_but")}
      </Button>
      <Button variant="outline" onClick={() => onAction("transfer", account)}>
        <ArrowLeftRight />
        {t("transfer_but")}
      </Button>
    </div>
  );
}

function Brand({ atm }: { atm: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
        <Landmark className="size-4" />
      </span>
      <h1 className="nk-title truncate">{t("bank_name")}</h1>
      {atm && <span className="nk-label">{t("nuikit_atm")}</span>}
    </div>
  );
}

function Cash({ cash }: { cash: number }) {
  return (
    <span className="flex items-center gap-2 text-sm">
      <Wallet className="text-muted-foreground size-4" />
      <span className="text-muted-foreground">{cashLabel()}</span>
      <span className="nk-num font-medium">{money(cash)}</span>
    </span>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground gap-2" aria-label={t("nuikit_close")}>
      <Kbd>Esc</Kbd>
      <X />
    </Button>
  );
}

/** The number that is the point: a display Stat (32px), label above. */
function Balance({ account, label = t("balance") }: { account: Account; label?: string }) {
  return <Stat size="display" label={label} value={money(account.amount)} />;
}

/** A money-in / money-out total; zero reads muted. */
function Total({ label, sign, value }: { label: string; sign: string; value: number }) {
  return (
    <Stat
      size="sm"
      align="end"
      label={label}
      value={
        <span className={cn(!value && "text-muted-foreground")}>
          {sign}
          {money(value)}
        </span>
      }
    />
  );
}

function BankView({ accounts, active, cash, onSelect, onAction, onClose, onExport }: ViewProps & { onExport: () => void }) {
  const txs = transactionsOf(active);
  const totals = txs.reduce((s, tx) => (isOut(tx) ? { ...s, out: s.out + (Number(tx.amount) || 0) } : { ...s, in: s.in + (Number(tx.amount) || 0) }), { in: 0, out: 0 });
  const personal = active?.id === accounts[0]?.id;

  return (
    <Panel size="auto" className="h-[46rem] max-h-full w-[72rem] max-w-full">
      <PanelHeader
        actions={
          <div className="flex items-center gap-4">
            <Cash cash={cash} />
            <CloseButton onClose={onClose} />
          </div>
        }
      >
        <Brand atm={false} />
      </PanelHeader>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-72 shrink-0 flex-col border-r">
          <AccountList accounts={accounts} activeId={active?.id} onSelect={onSelect} />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {active ? (
            <>
              <section className="flex flex-wrap items-end gap-x-6 gap-y-4 border-b p-6">
                <div className="flex min-w-0 flex-1 flex-col gap-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <AccountIcon personal={personal} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{active.name}</div>
                      <div className="nk-label truncate">{accountTitle(active)}</div>
                    </div>
                  </div>
                  <Balance account={active} />
                </div>
                <div className="flex flex-col items-end gap-4">
                  <div className="flex gap-6">
                    <Total label={t("nuikit_total_in")} sign="+" value={totals.in} />
                    <Total label={t("nuikit_total_out")} sign="−" value={totals.out} />
                  </div>
                  <Actions account={active} atm={false} onAction={onAction} />
                </div>
              </section>
              <TransactionsPanel key={active.id} transactions={txs} onExport={onExport} canExport />
            </>
          ) : (
            <p className="text-muted-foreground m-auto text-sm">{t("select_account")}</p>
          )}
        </main>
      </div>
    </Panel>
  );
}

function AtmView({ accounts, active, cash, onSelect, onAction, onClose }: ViewProps) {
  return (
    <Panel size="auto" className="w-[26rem] max-w-full">
      <PanelHeader actions={<CloseButton onClose={onClose} />}>
        <Brand atm />
      </PanelHeader>
      <div className="flex flex-col gap-6 p-4">
        <AccountChips accounts={accounts} activeId={active?.id} onSelect={onSelect} />
        {active ? (
          <>
            <div className="flex flex-col gap-4">
              {/* the account is the label of its balance here (one card, one account at a time) */}
              <Balance account={active} label={accountTitle(active)} />
              <Actions account={active} atm onAction={onAction} className="[&>button]:flex-1" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-medium">{t("nuikit_recent")}</h2>
              <RecentList transactions={transactionsOf(active)} />
            </div>
          </>
        ) : (
          <p className="text-muted-foreground py-6 text-center text-sm">{t("select_account")}</p>
        )}
      </div>
      <PanelFooter>
        <Cash cash={cash} />
      </PanelFooter>
    </Panel>
  );
}
