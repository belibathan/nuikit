// The contract between your Lua and the bank. Lua opens the `bank` surface with a BankData snapshot
// (accounts, recent transactions, cash on hand); the page asks Lua to deposit, withdraw or transfer
// and shows what it answers. After a change Lua sends a fresh snapshot (surface:update).
// Protocol-agnostic: fill it from any banking resource.
import "nuikit-core"

export type BankAccountKind = "personal" | "savings" | "shared" | "business"

export interface BankAccount {
  id: string
  /** "Checking", "LSPD" */
  label: string
  kind: BankAccountKind
  balance: number
  /** What other players send money to: "LS-204 118". */
  number?: string
  /** "Owner", "Member": for shared and business accounts. */
  role?: string
  /** Frozen: it can't send money. */
  frozen?: boolean
}

export type BankTransactionKind = "deposit" | "withdraw" | "transfer" | "payment"

export interface BankTransaction {
  id: string
  /** The account it belongs to. */
  account: string
  kind: BankTransactionKind
  /** "Paycheck", "Transfer to Riley Chen" */
  title: string
  /** Signed: money in is positive, money out negative. */
  amount: number
  /** Already formatted by Lua: "Today 14:02". */
  time: string
  note?: string
}

export interface BankData {
  /** "Fleeca, Legion Square" */
  title?: string
  /** Cash on hand (what a deposit draws from). */
  cash: number
  accounts: BankAccount[]
  transactions: BankTransaction[]
  /** At an ATM: no transfers. */
  atm?: boolean
}

export type BankAnswer = { ok: boolean; error?: string }
export type BankMoneyAction = "deposit" | "withdraw" | "transfer"

declare module "nuikit-core" {
  interface NuiSurfaces {
    bank: BankData
  }
  interface NuiCallbacks {
    "bank:deposit": { req: { account: string; amount: number; note?: string }; res: BankAnswer }
    "bank:withdraw": { req: { account: string; amount: number; note?: string }; res: BankAnswer }
    /** `to`: whatever your bank takes, a server ID or an account number. */
    "bank:transfer": { req: { account: string; amount: number; to: string; note?: string }; res: BankAnswer }
  }
}
