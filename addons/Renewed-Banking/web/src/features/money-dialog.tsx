import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "@/components/ui/icons";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { cashLabel, money, t } from "@/lib/locale";
import type { Account, MoneyAction } from "@/lib/types";

export interface MoneyRequest {
  action: MoneyAction;
  account: Account;
}

export const MONEY_ICON = { deposit: ArrowDownLeft, withdraw: ArrowUpRight, transfer: ArrowLeftRight } as const;
export const MONEY_LABEL = { deposit: "deposit_but", withdraw: "withdraw_but", transfer: "transfer_but" } as const;

/** Currency symbol for the amount prefix ("$", "€", …). */
function symbol() {
  const parts = money(0).replace(/[\d.,\s]/g, "");
  return parts || "$";
}

/**
 * Deposit, withdraw or transfer: a sub-page that swaps in place inside the account's sheet (the
 * sheet's back button cancels), not a dialog over it. The body it submits is the stock page's.
 */
export function MoneyForm({
  request,
  cash,
  busy,
  onCancel,
  onSubmit,
}: {
  request: MoneyRequest;
  /** Cash on hand (deposits draw from it). */
  cash: number;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (body: { fromAccount: string; amount: number; comment: string; stateid: string }) => void;
}) {
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [target, setTarget] = useState("");

  useEffect(() => {
    setAmount("");
    setComment("");
    setTarget("");
  }, [request]);

  const action = request.action;
  const available = action === "deposit" ? cash : Number(request.account.amount) || 0;
  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0 && (action !== "transfer" || target.trim().length > 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    onSubmit({ fromAccount: request.account.id, amount: value, comment, stateid: action === "transfer" ? target.trim() : "" });
  };

  const presets = [100, 500, 1000, 5000].filter((p) => p <= available);

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <FieldGroup className="gap-6 pt-6">
        <Field className="gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <FieldLabel htmlFor="rb-amount">{t("amount")}</FieldLabel>
            <span className="nk-label">
              {action === "deposit" ? cashLabel() : t("balance")} <span className="nk-num text-foreground">{money(available)}</span>
            </span>
          </div>
          <InputGroup className="h-12">
            <InputGroupAddon>
              <InputGroupText>{symbol()}</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              id="rb-amount"
              autoFocus
              type="number"
              inputMode="decimal"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="rb-amount nk-title"
            />
          </InputGroup>
          {presets.length > 0 && (
            <div className="grid auto-cols-fr grid-flow-col gap-2">
              {presets.map((p) => (
                <Button key={p} type="button" variant="outline" size="sm" className="nk-num px-0" onClick={() => setAmount(String(p))}>
                  {money(p, "whole")}
                </Button>
              ))}
              {available >= 1 && (
                <Button type="button" variant="outline" size="sm" className="px-0" onClick={() => setAmount(String(Math.floor(available)))}>
                  {t("nuikit_max")}
                </Button>
              )}
            </div>
          )}
        </Field>
        {action === "transfer" && (
          <Field className="gap-2">
            <FieldLabel htmlFor="rb-target">{t("transfer")}</FieldLabel>
            <Input id="rb-target" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="#" className="h-10 nk-num" />
          </Field>
        )}
        <Field className="gap-2">
          <FieldLabel htmlFor="rb-comment">{t("comment")}</FieldLabel>
          <Input id="rb-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={120} className="h-10" />
        </Field>
      </FieldGroup>
      <Separator className="mt-auto" />
      <div className="flex items-center justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel} disabled={busy}>
          {t("cancel")}
        </Button>
        <Button type="submit" size="lg" disabled={!valid || busy}>
          {busy && <Spinner />}
          {t("confirm")}
        </Button>
      </div>
    </form>
  );
}
