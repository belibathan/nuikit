// Every state of the bank, as your Lua would send it. Used by dev.tsx (browser development,
// ?fixture=<name>), screenshots and the site's previews.
import type { BankAccount, BankData, BankTransaction } from "./nui"

const accounts: BankAccount[] = [
  { id: "checking", label: "Checking", kind: "personal", balance: 48210, number: "LS-204 118" },
  { id: "savings", label: "Savings", kind: "savings", balance: 125000, number: "LS-204 119" },
  { id: "lspd", label: "LSPD", kind: "business", balance: 912450, number: "LS-100 001", role: "Boss" },
  { id: "house", label: "Vinewood house", kind: "shared", balance: 3200, number: "LS-310 552", role: "Member" },
]

const transactions: BankTransaction[] = [
  { id: "t1", account: "checking", kind: "payment", title: "Paycheck, LSPD", amount: 2500, time: "Today 14:02" },
  { id: "t2", account: "checking", kind: "transfer", title: "Transfer to Riley Chen", amount: -350, time: "Today 12:40", note: "Dinner" },
  { id: "t3", account: "checking", kind: "withdraw", title: "Cash withdrawal", amount: -1000, time: "Today 09:15" },
  { id: "t4", account: "checking", kind: "payment", title: "Fine, speeding", amount: -250, time: "Yesterday 22:31" },
  { id: "t5", account: "checking", kind: "deposit", title: "Cash deposit", amount: 4800, time: "Yesterday 18:05" },
  { id: "t6", account: "checking", kind: "transfer", title: "Transfer from Sam Okafor", amount: 1200, time: "Mon 16:44", note: "Car parts" },
  { id: "t7", account: "savings", kind: "transfer", title: "From Checking", amount: 5000, time: "Mon 10:00" },
  { id: "t8", account: "lspd", kind: "payment", title: "Payroll", amount: -22500, time: "Today 14:00" },
]

export const bankFixtures = {
  full: { title: "Fleeca, Legion Square", cash: 1520, accounts, transactions },
  atm: { title: "ATM", cash: 1520, accounts: accounts.slice(0, 2), transactions, atm: true },
  frozen: { title: "Fleeca, Legion Square", cash: 80, accounts: [{ ...accounts[0]!, frozen: true }, accounts[1]!], transactions },
  new: { title: "Fleeca, Legion Square", cash: 500, accounts: [{ id: "checking", label: "Checking", kind: "personal", balance: 0, number: "LS-204 118" }], transactions: [] },
} satisfies Record<string, BankData>

export type BankFixture = keyof typeof bankFixtures
