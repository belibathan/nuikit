export type TransType = "deposit" | "withdraw";

export interface Transaction {
  trans_id: string;
  title?: string;
  amount: number;
  trans_type: TransType | string;
  receiver?: string;
  issuer?: string;
  message?: string;
  /** Unix seconds */
  time: number;
}

export interface Account {
  id: string;
  type?: string;
  name?: string;
  amount: number;
  /** Only on the personal account (index 0). */
  cash?: number;
  /** Org accounts: boolean. Personal: 0 / 1. */
  frozen?: boolean | number;
  isFrozen?: boolean | number;
  transactions?: Transaction[] | Record<string, Transaction>;
  auth?: unknown;
  creator?: string | null;
}

export type MoneyAction = "deposit" | "withdraw" | "transfer";

export const isFrozen = (a: Account) => a.frozen === true || a.frozen === 1 || a.isFrozen === true || a.isFrozen === 1;

export function transactionsOf(a: Account | undefined): Transaction[] {
  const t = a?.transactions;
  if (!t) return [];
  const list = Array.isArray(t) ? t : Object.values(t);
  return list.filter((x): x is Transaction => !!x && typeof x === "object");
}
