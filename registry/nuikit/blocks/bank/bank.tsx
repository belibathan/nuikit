import * as React from "react"
import { fetchNui, Surface } from "nuikit-core/react"
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MenuRow } from "@/components/ui/menu-row"
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel"
import { Spinner } from "@/components/ui/spinner"
import { Stat } from "@/components/ui/stat"

import type { BankAccount, BankAccountKind, BankAnswer, BankData, BankMoneyAction, BankTransaction, BankTransactionKind } from "./nui"

/**
 * Bank — accounts on the left, the selected one's balance, actions and recent transactions on the
 * right; deposit, withdraw and transfer in a dialog that checks the amount before Lua does. Lua
 * answers every move, and its error stays in the dialog. At an ATM there are no transfers.
 * Protocol-agnostic: fill BankData from any banking resource. Built from the kit: Panel, MenuRow,
 * Stat, with stock shadcn Dialog, Input, Label, Button and Spinner (the amount form moves to the
 * kit's form-field and confirm once they ship).
 *
 *   <BankSurface />                                   // wired: nk.surface('bank', …) in Lua opens it
 *   <Bank data={data} onMoney={…} />                  // a still, or your own wiring
 */
function BankSurface() {
  return (
    <Surface name="bank" layer="panel" exclusive>
      {(data) =>
        data ? (
          <Bank
            data={data}
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

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${money.format(Math.abs(n))}`

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
  autoFocus = true,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: BankData
  /** Ask Lua; resolve with its answer. */
  onMoney?: (action: BankMoneyAction, req: { account: string; amount: number; to?: string; note?: string }) => Promise<BankAnswer> | void
  /** Focus the selected account when it opens (off for stills next to other content). */
  autoFocus?: boolean
}) {
  const accounts = list(data.accounts)
  const [selectedId, setSelectedId] = React.useState(accounts[0]?.id)
  const account = accounts.find((a) => a.id === selectedId) ?? accounts[0]
  const [dialog, setDialog] = React.useState<BankMoneyAction | null>(null)
  const transactions = list(data.transactions).filter((t) => t.account === account?.id)

  return (
    <div data-slot="bank" className={cn("nk-edge absolute inset-0", className)} {...props}>
      <div className="absolute inset-0 m-auto flex h-max w-max items-start gap-4">
        <Panel>
          <PanelHeader icon={<LandmarkIcon />} title={data.title ?? "Bank"} description={`Cash on hand ${money.format(data.cash)}`} />
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
                    meta={money.format(a.balance)}
                    active={a.id === account?.id}
                    className={cn(a.frozen && "[&_[data-slot=menu-row-description]]:text-destructive")}
                    onClick={() => setSelectedId(a.id)}
                  >
                    {a.label}
                  </MenuRow>
                )
              })
            ) : (
              <p className="nk-row text-muted-foreground">You have no accounts here yet. Ask a teller to open one.</p>
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

      {account && (
        <BankMoneyDialog
          action={dialog}
          account={account}
          cash={data.cash}
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
        <Stat size="display" label="Balance" value={money.format(a.balance)} />
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
        <span className="nk-label">Recent</span>
      </div>
      <PanelBody scroll className="max-h-[18rem]">
        {transactions.length ? (
          transactions.map((t) => {
            const TxIcon = TX_ICON[t.kind] ?? ArrowLeftRightIcon
            return (
              <div key={t.id} data-slot="bank-transaction" className="nk-row">
                <TxIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{t.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{[t.time, t.note].filter(Boolean).join(", ")}</span>
                </span>
                <span className={cn("nk-num shrink-0 text-sm font-medium", t.amount > 0 ? "text-success" : "text-foreground")}>{signed(t.amount)}</span>
              </div>
            )
          })
        ) : (
          <p className="nk-row text-muted-foreground">No transactions yet. Deposits and transfers show up here.</p>
        )}
      </PanelBody>
    </Panel>
  )
}

/** Deposit, withdraw or transfer: the amount (and recipient), checked here, then answered by Lua. */
function BankMoneyDialog({
  action,
  account,
  cash,
  onClose,
  onSubmit,
}: {
  action: BankMoneyAction | null
  account: BankAccount
  cash: number
  onClose: () => void
  onSubmit: (action: BankMoneyAction, req: { amount: number; to?: string; note?: string }) => Promise<BankAnswer> | void
}) {
  const [amount, setAmount] = React.useState("")
  const [to, setTo] = React.useState("")
  const [note, setNote] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [touched, setTouched] = React.useState(false)

  React.useEffect(() => {
    if (!action) return
    setAmount("")
    setTo("")
    setNote("")
    setError(null)
    setTouched(false)
  }, [action])

  const available = action === "deposit" ? cash : account.balance
  const check = action ? bankAmountError(action, amount, available, to) : null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!action || check || busy) return
    setBusy(true)
    setError(null)
    void Promise.resolve(onSubmit(action, { amount: Number(amount), to: action === "transfer" ? to.trim() : undefined, note: note.trim() || undefined }))
      .then((answer) => {
        if (answer && !answer.ok) setError(answer.error ?? "That didn't go through.")
        else onClose()
      })
      .finally(() => setBusy(false))
  }

  return (
    <Dialog open={!!action} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent
        className="nk-panel nk-enter gap-4 p-6 data-[size=default]:sm:max-w-sm"
        // One Escape closes the dialog only, not the bank behind it (nuikit skips a handled Escape).
        onEscapeKeyDown={(e) => {
          e.preventDefault()
          if (!busy) onClose()
        }}
      >
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle className="nk-title">
              {action ? ACTION_LABEL[action] : ""} {action === "deposit" ? "to" : "from"} {account.label}
            </DialogTitle>
            <DialogDescription>
              {action === "deposit" ? `Cash on hand: ${money.format(cash)}` : `Available: ${money.format(account.balance)}`}
            </DialogDescription>
          </DialogHeader>

          <div className="nk-field">
            <div className="nk-field-label">
              <Label htmlFor="bank-amount">Amount</Label>
              <Button type="button" variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs" onClick={() => setAmount(String(Math.floor(available)))}>
                All {money.format(available)}
              </Button>
            </div>
            <Input
              id="bank-amount"
              inputMode="numeric"
              autoFocus
              placeholder="$0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              aria-invalid={touched && !!check}
              className="nk-num"
            />
          </div>
          {action === "transfer" && (
            <div className="nk-field">
              <div className="nk-field-label">
                <Label htmlFor="bank-to">Send to</Label>
              </div>
              <Input id="bank-to" placeholder="Server ID or account number" value={to} onChange={(e) => setTo(e.target.value)} aria-invalid={touched && !to.trim()} />
            </div>
          )}
          <div className="nk-field">
            <div className="nk-field-label">
              <Label htmlFor="bank-note">Note</Label>
              <span className="ml-auto text-muted-foreground">Optional</span>
            </div>
            <Input id="bank-note" maxLength={60} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {(error || (touched && check)) && (
            <p role="alert" className="text-sm text-destructive">
              {error ?? check}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || (touched && !!check)}>
              {busy && <Spinner />}
              {action ? ACTION_LABEL[action] : ""}
              {!check && amount ? ` ${money.format(Number(amount))}` : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { Bank, BankSurface, bankAmountError }
