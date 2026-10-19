import { isBrowser } from "nuikit-core";

const resource = () => (typeof window.GetParentResourceName === "function" ? window.GetParentResourceName() : "qbx_idcard");

/**
 * POST to qbx_idcard's Lua, exactly like its own page: JSON headers and, for closeIdCard, no body
 * (docs/qbx-idcard-protocol.md). The reply (1) is ignored.
 */
export async function post(name: string, body?: unknown): Promise<void> {
  if (isBrowser()) {
    // eslint-disable-next-line no-console
    console.debug("[post]", name, body === undefined ? "(no body)" : JSON.stringify(body));
    return;
  }
  try {
    await fetch(`https://${resource()}/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    /* resource restarting */
  }
}

/** One card type from qbx_idcard's config/shared.lua `licenses`. */
export interface License {
  header?: string;
  background?: string;
  backgroundImage?: string;
  prop?: string;
}

export interface IdConfig {
  idCardSettings: { closeKey: string; autoClose: { status: boolean; time: number } };
  licenses: Record<string, License>;
}

/** qbx_idcard's defaults, used until Lua sends `configData`. */
export const DEFAULT_CONFIG: IdConfig = {
  idCardSettings: { closeKey: "Backspace", autoClose: { status: false, time: 3000 } },
  licenses: {
    id_card: { header: "Identity", background: "#ebf7fd" },
    driver_license: { header: "Driver License", background: "#febbbb" },
    weaponlicense: { header: "Weapon License", background: "#c7ffe5" },
    lawyerpass: { header: "Lawyer Pass", background: "#f9c491" },
  },
};

/** What `playerData` carries (main/server.lua sendData). */
export interface PlayerData {
  citizenid?: string;
  firstname?: string;
  lastname?: string;
  birthdate?: string;
  sex?: string;
  nationality?: string;
  cardtype?: string;
  mugShot?: string;
  badge?: "none" | { img?: string; grade?: string } | null;
}

/** Field labels. qbx_idcard keeps them in lang/global.js; that file wins when it loads. */
export const DEFAULT_LABELS = {
  lang_header: "Los Santos",
  lang_lastname: "Last name",
  lang_firstname: "First name",
  lang_citizenid: "Citizen ID",
  lang_dob: "Date of birth",
  lang_sex: "Sex",
  lang_nat: "Nationality",
};
export type Labels = typeof DEFAULT_LABELS;

/** lang/global.js sits at the resource root, two levels above js/main.js, and is in its files list. */
export async function loadLabels(): Promise<Partial<Labels>> {
  if (isBrowser()) return {};
  try {
    const url = "../../lang/global.js";
    const mod = (await import(/* @vite-ignore */ url)) as { Global?: Partial<Labels> };
    return mod.Global && typeof mod.Global === "object" ? mod.Global : {};
  } catch {
    return {};
  }
}
