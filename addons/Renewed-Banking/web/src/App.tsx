import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Landmark, Snowflake, Wallet } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EdgeSheet, EdgeSheetBody } from "@/components/ui/edge-sheet";
import { ActionBar, ActionBarItem } from "@/components/ui/action-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice, NoticeStack } from "@/components/ui/notice";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Stat } from "@/components/ui/stat";
import { AccountChips, AccountIcon, AccountList, accountTitle } from "@/features/accounts";
import { MONEY_ICON, MONEY_LABEL, MoneyForm, type MoneyRequest } from "@/features/money-dialog";
import { RecentList, TransactionsPanel, isOut } from "@/features/transactions";
import { copyText, toCsv } from "@/lib/export";
import { cashLabel, money, setLocale, t, useLocale } from "@/lib/locale";
import { useLever } from "@/lib/levers";
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
  const formOpen = useRef(false);
  formOpen.current = !!request;

  useEffect(() => {
    void loadServerTheme();
  }, []);

  const toast = (text: string) => {
    const id = Date.now() + Math.random();
    setToasts((l) => [...l.slice(-2), { id, text }]);
  };
  const dismissToast = (id: number) => setToasts((l) => l.filter((x) => x.id !== id));

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
      // a deposit / withdraw / transfer page goes back to the account first
      if (formOpen.current) return void (!busy && setRequest(null));
      close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const active = useMemo(() => accounts.find((a) => a.id === activeId), [accounts, activeId]);
  const cash = Number(accounts[0]?.cash) || 0;
  const txs = useMemo(() => transactionsOf(active), [active]);
  const open = visible && accounts.length > 0;

  const action = (kind: MoneyAction, account: Account) => setRequest({ action: kind, account });

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

  const form = request && <MoneyForm request={request} cash={cash} busy={busy} onCancel={() => setRequest(null)} onSubmit={submit} />;
  const props: ViewProps = { open, accounts, active, cash, onSelect: setActiveId, onAction: action, onClose: close, request, form, onBack: () => !busy && setRequest(null) };

  return (
    <>
      {/* The bank: two edge sheets, the accounts on the left and the chosen account on the right
          (the inventory's split, registry edge-sheet). The ATM is the one sheet on the left. */}
      <BankView {...props} open={open && !atm} onExport={exportCsv} />
      <AtmView {...props} open={open && atm} />
      {open && (
        <div className="nk-anchor-b">
          <ActionBar plate>
            <ActionBarItem keys={["Esc"]} label={t("nuikit_close")} onClick={close} aria-label={t("nuikit_close")} />
          </ActionBar>
        </div>
      )}

      {loading && !visible && (
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="nk-panel nk-enter flex items-center gap-3 px-4 py-3">
            <Spinner className="size-4 text-muted-foreground" />
            <div>
              <div className="nk-title">{t("bank_name")}</div>
              <div className="nk-label">{t("nuikit_loading")}</div>
            </div>
          </div>
        </div>
      )}

      <NoticeStack position="top-center">
        {toasts.map((n) => (
          <Notice key={n.id} status="info" title={n.text} duration={TOAST_MS} onExpire={() => dismissToast(n.id)} onDismiss={() => dismissToast(n.id)} />
        ))}
      </NoticeStack>
    </>
  );
}

interface ViewProps {
  open: boolean;
  accounts: Account[];
  active?: Account;
  cash: number;
  onSelect: (id: string) => void;
  onAction: (action: MoneyAction, account: Account) => void;
  onClose: () => void;
  /** A deposit / withdraw / transfer page, swapped in place of the account. */
  request: MoneyRequest | null;
  form: ReactNode;
  onBack: () => void;
}

/** The sheet header for a money page: the action as the title, the account under it. */
function formHeader(request: MoneyRequest) {
  const Icon = MONEY_ICON[request.action];
  return { icon: <Icon />, title: t(MONEY_LABEL[request.action]), description: accountTitle(request.account) };
}

/** One loud action per surface: deposit at the bank, withdraw at the ATM; the rest stay outlined. */
function Actions({ account, atm, onAction, className }: { account: Account; atm: boolean; onAction: ViewProps["onAction"]; className?: string }) {
  if (isFrozen(account)) {
    return (
      <div className={cn("flex h-10 items-center gap-2 rounded-(--nk-row-radius) border px-3 nk-body text-muted-foreground", className)}>
        <Snowflake className="size-4 shrink-0" />
        {t("frozen")}
      </div>
    );
  }
  return (
    <div className={cn("grid auto-cols-fr grid-flow-col gap-2", className)}>
      {!atm && (
        <Button size="lg" onClick={() => onAction("deposit", account)}>
          <ArrowDownLeft />
          {t("deposit_but")}
        </Button>
      )}
      <Button size="lg" variant={atm ? "default" : "outline"} onClick={() => onAction("withdraw", account)}>
        <ArrowUpRight />
        {t("withdraw_but")}
      </Button>
      <Button size="lg" variant="outline" onClick={() => onAction("transfer", account)}>
        <ArrowLeftRight />
        {t("transfer_but")}
      </Button>
    </div>
  );
}

/** Cash on hand, under the bank's name. */
function CashLine({ cash }: { cash: number }) {
  return (
    <span className="flex items-center gap-2">
      <Wallet className="size-3.5" />
      {cashLabel()} <span className="nk-num text-foreground">{money(cash)}</span>
    </span>
  );
}

/** A money-in / money-out total; zero reads muted. */
function Total({ label, sign, value }: { label: string; sign: string; value: number }) {
  return (
    <Stat
      size="sm"
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

/**
 * Lever (README): the accounts sheet's edge, left by default; `--banking-side: right` mirrors the bank
 * (accounts right, the account's details left) and puts the ATM on the right.
 */
function useSides(): ["left" | "right", "left" | "right"] {
  return useLever("banking-side", "left") === "right" ? ["right", "left"] : ["left", "right"];
}

function BankView({ open, accounts, active, cash, onSelect, onAction, onExport, request, form, onBack }: ViewProps & { onExport: () => void }) {
  const txs = transactionsOf(active);
  const totals = txs.reduce((s, tx) => (isOut(tx) ? { ...s, out: s.out + (Number(tx.amount) || 0) } : { ...s, in: s.in + (Number(tx.amount) || 0) }), { in: 0, out: 0 });
  const personal = active?.id === accounts[0]?.id;
  const [near, far] = useSides();

  return (
    <>
      <EdgeSheet open={open} side={near} width="30rem" icon={<Landmark />} title={t("bank_name")} description={<CashLine cash={cash} />}>
        <EdgeSheetBody className="flex flex-col">
          <AccountList accounts={accounts} activeId={active?.id} onSelect={onSelect} />
        </EdgeSheetBody>
      </EdgeSheet>

      <EdgeSheet
        open={open}
        side={far}
        width="40rem"
        delay={60}
        page={request ? request.action : "account"}
        onBack={request ? onBack : undefined}
        {...(request
          ? formHeader(request)
          : { icon: active ? <AccountIcon personal={personal} bare /> : undefined, title: active ? active.name || active.id : t("select_account"), description: active ? accountTitle(active) : undefined })}
      >
        {request ? form : active && (
          <EdgeSheetBody className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <Stat size="display" label={t("balance")} value={money(active.amount)} />
              <div className="flex gap-8">
                <Total label={t("nuikit_total_in")} sign="+" value={totals.in} />
                <Total label={t("nuikit_total_out")} sign="−" value={totals.out} />
              </div>
              <Actions account={active} atm={false} onAction={onAction} />
            </div>
            <Separator />
            <TransactionsPanel key={active.id} transactions={txs} onExport={onExport} canExport />
          </EdgeSheetBody>
        )}
      </EdgeSheet>
    </>
  );
}

function AtmView({ open, accounts, active, cash, onSelect, onAction, request, form, onBack }: ViewProps) {
  const [near] = useSides();
  return (
    <EdgeSheet
      open={open}
      side={near}
      width="30rem"
      // as tall as the ATM's content (one account, its actions, a few recent rows), like the context menu
      fit
      page={request ? request.action : "atm"}
      onBack={request ? onBack : undefined}
      actions={!request && <span className="nk-label">{t("nuikit_atm")}</span>}
      {...(request ? formHeader(request) : { icon: <Landmark />, title: t("bank_name"), description: <CashLine cash={cash} /> })}
    >
      {request ? form : <EdgeSheetBody scroll>
        <div className="flex flex-col gap-6">
          <AccountChips accounts={accounts} activeId={active?.id} onSelect={onSelect} />
          {active ? (
            <>
              <div className="flex flex-col gap-4">
                {/* the account is the label of its balance here (one account at a time) */}
                <Stat size="display" label={accountTitle(active)} value={money(active.amount)} />
                <Actions account={active} atm onAction={onAction} />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="nk-caption">{t("nuikit_recent")}</h2>
                <RecentList transactions={transactionsOf(active)} />
              </div>
            </>
          ) : (
            <EmptyState title={t("select_account")} />
          )}
        </div>
      </EdgeSheetBody>}
    </EdgeSheet>
  );
}
