import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cashLabel, money, t } from "@/lib/locale";
import type { Account, MoneyAction } from "@/lib/types";
import { accountTitle } from "./accounts";

export interface MoneyRequest {
  action: MoneyAction;
  account: Account;
}

const ICON = { deposit: ArrowDownLeft, withdraw: ArrowUpRight, transfer: ArrowLeftRight } as const;
const LABEL = { deposit: "deposit_but", withdraw: "withdraw_but", transfer: "transfer_but" } as const;

/** Currency symbol for the amount prefix ("$", "€", …). */
function symbol() {
  const parts = money(0).replace(/[\d.,\s]/g, "");
  return parts || "$";
}

export function MoneyDialog({
  request,
  cash,
  busy,
  onCancel,
  onSubmit,
}: {
  request: MoneyRequest | null;
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
    if (request) {
      setAmount("");
      setComment("");
      setTarget("");
    }
  }, [request]);

  const action = request?.action ?? "deposit";
  const Icon = ICON[action];
  const available = action === "deposit" ? cash : Number(request?.account.amount) || 0;
  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0 && (action !== "transfer" || target.trim().length > 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!request || !valid || busy) return;
    onSubmit({ fromAccount: request.account.id, amount: value, comment, stateid: action === "transfer" ? target.trim() : "" });
  };

  const presets = [100, 500, 1000, 5000].filter((p) => p <= available);

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="nk-panel nk-enter gap-0 p-0 sm:max-w-md" showCloseButton={false}>
        <form onSubmit={submit} className="flex flex-col">
          <DialogHeader className="flex-row items-center gap-3 px-6 pt-6 text-left">
            <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="nk-title text-[0.9375rem] leading-5">{t(LABEL[action])}</DialogTitle>
              <DialogDescription className="nk-label truncate text-xs">{request ? accountTitle(request.account) : ""}</DialogDescription>
            </div>
          </DialogHeader>

          <FieldGroup className="gap-4 p-6">
            <Field className="gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <FieldLabel htmlFor="rb-amount">{t("amount")}</FieldLabel>
                <span className="nk-label">
                  {action === "deposit" ? cashLabel() : t("balance")} <span className="nk-num text-foreground">{money(available)}</span>
                </span>
              </div>
              <InputGroup className="h-10">
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
                  className="rb-amount nk-num text-base font-semibold"
                />
              </InputGroup>
              {presets.length > 0 && (
                <div className="grid auto-cols-fr grid-flow-col gap-2">
                  {presets.map((p) => (
                    <Button key={p} type="button" variant="outline" size="sm" className="nk-num px-0 font-normal" onClick={() => setAmount(String(p))}>
                      {money(p, "whole")}
                    </Button>
                  ))}
                  {available >= 1 && (
                    <Button type="button" variant="outline" size="sm" className="px-0 font-normal" onClick={() => setAmount(String(Math.floor(available)))}>
                      {t("nuikit_max")}
                    </Button>
                  )}
                </div>
              )}
            </Field>
            {action === "transfer" && (
              <Field className="gap-2">
                <FieldLabel htmlFor="rb-target">{t("transfer")}</FieldLabel>
                <Input id="rb-target" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="#" className="font-mono" />
              </Field>
            )}
            <Field className="gap-2">
              <FieldLabel htmlFor="rb-comment">{t("comment")}</FieldLabel>
              <Input id="rb-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={120} />
            </Field>
          </FieldGroup>

          <DialogFooter className="nk-panel-footer justify-end">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!valid || busy}>
              {busy && <Spinner />}
              {t("confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
