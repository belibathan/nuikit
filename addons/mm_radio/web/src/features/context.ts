import { createContext, useContext } from "react";
import type { T } from "@/lib/locale";
import type { PlayerList, RadioData } from "@/lib/types";

export type Tab = "home" | "channels" | "keypad" | "members" | "settings";

export interface RadioCtx {
  data: RadioData;
  t: T;
  members: PlayerList;
  tab: Tab;
  setTab: (tab: Tab) => void;
  update: (fn: (d: RadioData) => RadioData) => void;
  overlayOn: boolean;
  setOverlayOn: (on: boolean) => void;
  moveMode: boolean;
  setMoveMode: (on: boolean) => void;
}

export const Ctx = createContext<RadioCtx | null>(null);

export function useCtx() {
  const c = useContext(Ctx);
  if (!c) throw new Error("radio context missing");
  return c;
}
