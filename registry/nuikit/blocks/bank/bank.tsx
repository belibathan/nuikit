import * as React from "react"
import { fetchNui, Surface, useSurface } from "nuikit-core/react"
import {
  ArrowDownLeftIcon,
  ArrowLeftRightIcon,
  ArrowUpRightIcon,
  BriefcaseIcon,
  LandmarkIcon,
  PiggyBankIcon,
  ReceiptIcon,
  SnowflakeIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Confirm } from "@/components/ui/confirm"
import { EmptyState } from "@/components/ui/empty-state"
import { TextField } from "@/components/ui/form-field"
import { MenuRow } from "@/components/ui/menu-row"
import { Money, useFormatMoney } from "@/components/ui/money"
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel"
import { Stat } from "@/components/ui/stat"

import type { BankAccount, BankAccountKind, BankAnswer, BankData, BankMoneyAction, BankTransaction, BankTransactionKind } from "./nui"

/**
 * Bank — accounts on the left, the selected one's balance, actions and recent transactions on the
 * right; deposit, withdraw and transfer in a dialog that checks the amount before Lua does. Lua
 * answers every move, and its error stays in the dialog. At an ATM there are no transfers.
 * Protocol-agnostic: fill BankData from any banking resource. Built from the kit: Panel, MenuRow,
 * Stat, Money, EmptyState, Confirm and TextField (form-field), with stock shadcn Button.
 *
 *   <BankSurface />                                   // wired: nk.surface('bank', …) in Lua opens it
 *   <Bank data={data} onMoney={…} />                  // a still, or your own wiring
 */
function BankSurface() {
  const bank = useSurface("bank")
  const back = React.useRef<() => void>(() => bank.close())
  return (
    <Surface name="bank" layer="panel" exclusive escape="back" onBack={() => back.current()}>
      {(data) =>
        data ? (
          <Bank
            data={data}
            onBack={(fn) => (back.current = fn)}
            onClose={() => bank.close()}
            onMoney={(action, req) =>
              (action === "transfer"
                ? fetchNui("bank:transfer", { ...req, to: req.to ?? "" })
                : fetchNui(action === "deposit" ? "bank:deposit" : "bank:withdraw", req)
              ).catch(() => ({ ok: false, error: "The bank didn't answer. Try again." }))
            }
          />
        ) : null
      }
    </Surface>
  )
}

const ACCOUNT_ICON: Record<BankAccountKind, LucideIcon> = {
  personal: WalletIcon,
  savings: PiggyBankIcon,
  shared: UsersIcon,
  business: BriefcaseIcon,
}
const TX_ICON: Record<BankTransactionKind, LucideIcon> = {
  deposit: ArrowDownLeftIcon,
  withdraw: ArrowUpRightIcon,
  transfer: ArrowLeftRightIcon,
  payment: ReceiptIcon,
}
const ACTION_LABEL: Record<BankMoneyAction, string> = { deposit: "Deposit", withdraw: "Withdraw", transfer: "Transfer" }

/**
 * Why an amount can't go, or null: whole dollars above 0, no more than what's available, and a
 * recipient for a transfer.
 */
function bankAmountError(action: BankMoneyAction, raw: string, available: number, to?: string): string | null {
  const amount = Number(raw)
  if (raw.trim() === "") return "Enter an amount."
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount above $0."
  if (!Number.isInteger(amount)) return "Use whole dollars."
  if (amount > available) return action === "deposit" ? "You don't have that much cash." : "There isn't that much in the account."
  if (action === "transfer" && !to?.trim()) return "Who is it for? Enter a server ID or an account number."
  return null
}

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

function Bank({
  data,
  onMoney,
  onBack,
  onClose,
  autoFocus = true,
  dialog: dialogProp = null,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: BankData
  /** Gives the surface what Escape should do now (close the money dialog, else the bank). */
  onBack?: (fn: () => void) => void
  onClose?: () => void
  /** Ask Lua; resolve with its answer. */
  onMoney?: (action: BankMoneyAction, req: { account: string; amount: number; to?: string; note?: string }) => Promise<BankAnswer> | void
  /** Focus the selected account when it opens (off for stills next to other content). */
  autoFocus?: boolean
  /** Start with a money dialog open (stills). */
  dialog?: BankMoneyAction | null
}) {
  const fmt = useFormatMoney()
  const accounts = list(data.accounts)
  const [selectedId, setSelectedId] = React.useState(accounts[0]?.id)
  const account = accounts.find((a) => a.id === selectedId) ?? accounts[0]
  const [dialog, setDialog] = React.useState<BankMoneyAction | null>(dialogProp)
  const transactions = list(data.transactions).filter((t) => t.account === account?.id)
  const busy = React.useRef(false)

  // Escape: the money dialog first (not while it's sending), then the bank.
  React.useEffect(() => {
    onBack?.(() => {
      if (dialog) {
        if (!busy.current) setDialog(null)
      } else onClose?.()
    })
  }, [dialog, onBack, onClose])

  return (
    <div data-slot="bank" className={cn("nk-edge absolute inset-0", className)} {...props}>
      <div className="absolute inset-0 m-auto flex h-max w-max items-start gap-4">
        <Panel>
          <PanelHeader icon={<LandmarkIcon />} title={data.title ?? "Bank"} description={`Cash on hand ${fmt(data.cash)}`} />
          <PanelBody>
            {accounts.length ? (
              accounts.map((a, i) => {
                const Icon = ACCOUNT_ICON[a.kind] ?? WalletIcon
                return (
                  <MenuRow
                    key={a.id}
                    autoFocus={autoFocus && i === 0}
                    icon={<Icon />}
                    description={a.frozen ? "Frozen" : [a.role, a.number].filter(Boolean).join(", ") || undefined}
                    meta={<Money amount={a.balance} />}
                    active={a.id === account?.id}
                    className={cn(a.frozen && "[&_[data-slot=menu-row-description]]:text-destructive")}
                    onClick={() => setSelectedId(a.id)}
                  >
                    {a.label}
                  </MenuRow>
                )
              })
            ) : (
              <EmptyState icon={<LandmarkIcon />} title="No accounts yet" description="Ask a teller to open one." />
            )}
          </PanelBody>
        </Panel>

        {account && (
          <BankAccountPanel
            account={account}
            transactions={transactions}
            atm={data.atm}
            onAction={setDialog}
          />
        )}
      </div>

      {account && dialog && (
        <BankMoneyDialog
          key={dialog}
          action={dialog}
          account={account}
          cash={data.cash}
          onBusy={(b) => (busy.current = b)}
          onClose={() => setDialog(null)}
          onSubmit={(action, req) => onMoney?.(action, { account: account.id, ...req })}
        />
      )}
    </div>
  )
}

function BankAccountPanel({
  account: a,
  transactions,
  atm,
  onAction,
}: {
  account: BankAccount
  transactions: BankTransaction[]
  atm?: boolean
  onAction: (action: BankMoneyAction) => void
}) {
  const Icon = ACCOUNT_ICON[a.kind] ?? WalletIcon
  return (
    <Panel className="w-[34rem]">
      <PanelHeader icon={<Icon />} title={a.label} description={[a.role, a.number].filter(Boolean).join(", ") || undefined} />
      <PanelBody variant="form">
        <Stat size="display" label="Balance" value={<Money amount={a.balance} />} />
        {a.frozen && (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <SnowflakeIcon className="size-4" />
            This account is frozen: it can take deposits but can't send money.
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => onAction("deposit")}>
            <ArrowDownLeftIcon /> Deposit
          </Button>
          <Button variant="secondary" className="flex-1" disabled={a.frozen} onClick={() => onAction("withdraw")}>
            <ArrowUpRightIcon /> Withdraw
          </Button>
          {!atm && (
            <Button variant="secondary" className="flex-1" disabled={a.frozen} onClick={() => onAction("transfer")}>
              <ArrowLeftRightIcon /> Transfer
            </Button>
          )}
        </div>
      </PanelBody>
      <div className="nk-panel-header border-t border-b-0 py-2">
        <span className="nk-caption">Recent</span>
      </div>
      <PanelBody scroll className="max-h-[18rem]">
        {transactions.length ? (
          transactions.map((t) => {
            const TxIcon = TX_ICON[t.kind] ?? ArrowLeftRightIcon
            return (
              // read-only rows: money in is success, money out stays in the text colour (not an error)
              <MenuRow
                key={t.id}
                data-bank-transaction
                readOnly
                icon={<TxIcon />}
                description={[t.time, t.note].filter(Boolean).join(", ") || undefined}
                meta={<Money amount={t.amount} sign="always" className={cn("text-sm", t.amount > 0 ? "text-success" : "text-foreground")} />}
              >
                {t.title}
              </MenuRow>
            )
          })
        ) : (
          <EmptyState icon={<ReceiptIcon />} title="No transactions yet" description="Deposits and transfers show up here." />
        )}
      </PanelBody>
    </Panel>
  )
}

/**
 * Deposit, withdraw or transfer: the amount (and recipient), checked here, then answered by Lua.
 * The kit's Confirm (a panel over a scrim, no private Escape) with form-field rows in it. Enter in
 * a field sends, as the form did; Escape in a field moves to Cancel, and the next Escape closes the
 * dialog through the surface.
 */
function BankMoneyDialog({
  action,
  account,
  cash,
  onBusy,
  onClose,
  onSubmit,
}: {
  action: BankMoneyAction
  account: BankAccount
  cash: number
  onBusy?: (busy: boolean) => void
  onClose: () => void
  onSubmit: (action: BankMoneyAction, req: { amount: number; to?: string; note?: string }) => Promise<BankAnswer> | void
}) {
  const fmt = useFormatMoney()
  const [amount, setAmount] = React.useState("")
  const [to, setTo] = React.useState("")
  const [note, setNote] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [touched, setTouched] = React.useState(false)
  const fields = React.useRef<HTMLDivElement>(null)

  // The amount takes the keyboard when the dialog opens (after the click that opened it).
  React.useEffect(() => {
    const t = setTimeout(() => fields.current?.querySelector<HTMLInputElement>("input")?.focus(), 0)
    return () => clearTimeout(t)
  }, [])

  const available = action === "deposit" ? cash : account.balance
  const check = bankAmountError(action, amount, available, to)
  // The recipient's message goes under the recipient; every other one under the amount.
  const toError = touched && check && action === "transfer" && !to.trim() && !bankAmountError(action, amount, available, "x") ? check : undefined
  const amountError = touched && check && !toError ? check : undefined

  const submit = () => {
    setTouched(true)
    if (check || busy) return
    setBusy(true)
    onBusy?.(true)
    setError(null)
    void Promise.resolve(onSubmit(action, { amount: Number(amount), to: action === "transfer" ? to.trim() : undefined, note: note.trim() || undefined }))
      .then((answer) => {
        if (answer && !answer.ok) setError(answer.error ?? "That didn't go through.")
        else onClose()
      })
      .finally(() => {
        setBusy(false)
        onBusy?.(false)
      })
  }

  return (
    <Confirm
      tone="primary"
      size="sm"
      title={`${ACTION_LABEL[action]} ${action === "deposit" ? "to" : "from"} ${account.label}`}
      description={action === "deposit" ? `Cash on hand: ${fmt(cash)}` : `Available: ${fmt(account.balance)}`}
      cancelLabel="Cancel"
      // The amount field takes the keyboard (autoFocus below), not the action.
      initialFocus="none"
      confirmLabel={`${ACTION_LABEL[action]}${!check && amount ? ` ${fmt(Number(amount))}` : ""}`}
      loading={busy}
      onCancel={() => !busy && onClose()}
      onConfirm={submit}
    >
      <div
        ref={fields}
        className="flex flex-col gap-4"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
            e.preventDefault()
            submit()
          }
          // nuikit leaves Escape typed in a field to the field (protocol §3.5), so here it only
          // leaves the field for Cancel. The next Escape goes through the surface's back: the
          // dialog closes, then the bank.
          if (e.key === "Escape" && (e.target as HTMLElement).tagName === "INPUT") {
            e.preventDefault()
            e.currentTarget.closest('[data-slot="confirm"]')?.querySelector<HTMLButtonElement>('[data-slot="confirm-cancel"]')?.focus()
          }
        }}
      >
        <TextField
          label="Amount"
          hint={
            <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setAmount(String(Math.floor(available)))}>
              All {fmt(available)}
            </Button>
          }
          placeholder="$0"
          value={amount}
          onValueChange={(v) => setAmount(v.replace(/[^\d.]/g, ""))}
          error={amountError}
          inputProps={{ inputMode: "numeric", className: "nk-num" }}
        />
        {action === "transfer" && (
          <TextField label="Send to" placeholder="Server ID or account number" value={to} onValueChange={setTo} error={toError} />
        )}
        <TextField label="Note" hint="Optional" maxLength={60} showCount={false} value={note} onValueChange={setNote} />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </Confirm>
  )
}

export { Bank, BankSurface, bankAmountError }
