import type { ReactNode } from "react";
import { Bank } from "@/blocks/bank/bank";
import { bankFixtures } from "@/blocks/bank/fixtures";
import { DeathScreen } from "@/blocks/death-screen/death-screen";
import { garageFixtures } from "@/blocks/garage/fixtures";
import { Garage } from "@/blocks/garage/garage";
import { deathScreenFixtures } from "@/blocks/death-screen/fixtures";
import { HudMinimal } from "@/blocks/hud-minimal/hud-minimal";
import { jobMenuFixtures } from "@/blocks/job-menu/fixtures";
import { JobMenu } from "@/blocks/job-menu/job-menu";
import { interactionFixtures, type InteractionScene } from "@/blocks/interaction/fixtures";
import { Prompts, Target } from "@/blocks/interaction/interaction";
import { shopCarts, shopFixtures } from "@/blocks/shop/fixtures";
import { Shop } from "@/blocks/shop/shop";
import { hotbarFixtures, inventoryFixtures } from "@/blocks/inventory/fixtures";
import { Hotbar, Inventory } from "@/blocks/inventory/inventory";
import { vehicleShopFixtures } from "@/blocks/vehicle-shop/fixtures";
import { VehicleShop } from "@/blocks/vehicle-shop/vehicle-shop";
import { characterSelectFixtures } from "@/blocks/character-select/fixtures";
import { CharacterSelect } from "@/blocks/character-select/character-select";
import { hudMinimalFixtures } from "@/blocks/hud-minimal/fixtures";
import { LoadingScreen } from "@/blocks/loading-screen/loading-screen";
import { loadingHandovers, loadStateAt } from "@/blocks/loading-screen/fixtures";
import { PauseMenu } from "@/blocks/pause-menu/pause-menu";
import { pauseMenuFixtures } from "@/blocks/pause-menu/fixtures";
import { Scoreboard } from "@/blocks/scoreboard/scoreboard";
import { scoreboardFixtures } from "@/blocks/scoreboard/fixtures";
import { Settings } from "@/blocks/settings/settings";
import { settingsFixtures } from "@/blocks/settings/fixtures";

export interface BlockPreview {
  name: string;
  title: string;
  description: string;
  /** Which game scene suits it. */
  scene?: "dusk" | "day";
  /** Named states, each a still of the block on a 1920×1080 screen (its fixtures). */
  states: Record<string, () => ReactNode>;
}

/**
 * Every block on /blocks, drawn from its presentational component and its fixtures: never the
 * wired *Surface components (a surface is fixed to the viewport, and these are stills).
 */
export const BLOCKS: BlockPreview[] = [
  {
    name: "hud-minimal",
    title: "Minimal HUD",
    description: "Vitals and needs with voice, cash, bank and job, and a speedometer with seatbelt and engine warnings while driving. The player comes from nuikit's bridge, on any framework.",
    scene: "day",
    states: {
      Driving: () => <HudMinimal player={hudMinimalFixtures.driving.player} vehicle={hudMinimalFixtures.driving.vehicle} />,
      Warnings: () => <HudMinimal player={hudMinimalFixtures.warnings.player} vehicle={hudMinimalFixtures.warnings.vehicle} />,
      "On foot": () => <HudMinimal player={hudMinimalFixtures.talking.player} vehicle={false} />,
      Standalone: () => <HudMinimal player={hudMinimalFixtures.standalone.player} vehicle={false} />,
    },
  },
  {
    name: "death-screen",
    title: "Death screen",
    description: "Last stand and death: a countdown, call EMS, hold to respawn with a live bar. Its example rules step aside for qbx_medical, qb-ambulancejob and ESX.",
    states: {
      Down: () => <DeathScreen data={deathScreenFixtures["down-ems"]} />,
      Urgent: () => <DeathScreen data={deathScreenFixtures["down-urgent"]} />,
      Dead: () => <DeathScreen data={deathScreenFixtures.dead} />,
      Respawn: () => <DeathScreen data={deathScreenFixtures["dead-respawn"]} hold={0.6} />,
    },
  },
  {
    name: "pause-menu",
    title: "Pause menu",
    description: "Esc opens it in place of GTA's: resume, map, settings, key bindings, disconnect with a confirm, and the player and server on cards.",
    states: {
      Menu: () => <PauseMenu data={pauseMenuFixtures.full.data} player={pauseMenuFixtures.full.player} autoFocus={false} />,
      Opening: () => <PauseMenu data={pauseMenuFixtures.opening.data} player={pauseMenuFixtures.opening.player} autoFocus={false} />,
      "No character": () => <PauseMenu data={pauseMenuFixtures["no-character"].data} player={pauseMenuFixtures["no-character"].player} autoFocus={false} />,
    },
  },
  {
    name: "loading-screen",
    title: "Loading screen",
    description: "The real load progress from the game's own load events, tips, links, backgrounds and music, themed through the connection handover.",
    states: {
      "Loading map": () => <LoadingScreen handover={loadingHandovers.full} load={loadStateAt("map")} />,
      "Building the city": () => <LoadingScreen handover={loadingHandovers.plain} load={loadStateAt("afterMap")} />,
      Ready: () => <LoadingScreen handover={loadingHandovers.full} load={loadStateAt("ready")} />,
    },
  },
  {
    name: "settings",
    title: "Settings",
    description: "Player settings in one panel: toggles, choices, sliders and key hints. Lua has the last word on every change, and Accessibility is nuikit's own player preferences.",
    states: {
      Interface: () => <SettingsStill data={settingsFixtures.full} />,
      Accessibility: () => <SettingsStill data={settingsFixtures.single} />,
      Disabled: () => <SettingsStill data={settingsFixtures.disabled} />,
    },
  },
  {
    name: "scoreboard",
    title: "Scoreboard",
    description: "Who's online with server IDs, jobs and ping, a search, how full the server is, and which activities can start given who's on duty.",
    states: {
      Full: () => <ScoreboardStill data={scoreboardFixtures.full} />,
      Search: () => <ScoreboardStill data={scoreboardFixtures.full} query="lspd" />,
      Standalone: () => <ScoreboardStill data={scoreboardFixtures.standalone} />,
    },
  },
  {
    name: "garage",
    title: "Garage",
    description: "Your vehicles at a garage with fuel, engine and body: take one out, store the one you're driving, or pay to release one from the impound. Lua answers every button.",
    states: {
      Garage: () => <Garage data={garageFixtures.full} autoFocus={false} onAction={async () => ({ ok: true })} />,
      Impound: () => <Garage data={garageFixtures.impounded} autoFocus={false} onAction={async () => ({ ok: true })} />,
      "On foot, refused": () => <Garage data={garageFixtures["on-foot"]} autoFocus={false} onAction={async () => ({ ok: false, error: "Something is parked in the way." })} />,
      Empty: () => <Garage data={garageFixtures.empty} autoFocus={false} />,
    },
  },
  {
    name: "bank",
    title: "Bank",
    description: "Accounts, balance and recent transactions; deposit, withdraw and transfer in a dialog that checks the amount, then the server checks it again. Protocol-agnostic.",
    states: {
      Bank: () => <Bank data={bankFixtures.full} autoFocus={false} onMoney={async () => ({ ok: true })} />,
      ATM: () => <Bank data={bankFixtures.atm} autoFocus={false} onMoney={async () => ({ ok: true })} />,
      Frozen: () => <Bank data={bankFixtures.frozen} autoFocus={false} />,
      "New account": () => <Bank data={bankFixtures.new} autoFocus={false} />,
    },
  },
  {
    name: "job-menu",
    title: "Job menu",
    description: "A duty toggle and the job's actions; the boss also gets the staff to promote, demote or fire (with a confirm) and whoever is nearby to hire. The server checks every request against the caller's own job.",
    states: {
      Staff: () => <JobMenu data={jobMenuFixtures.boss} defaultTab="staff" autoFocus={false} onRequest={async () => ({ ok: true })} />,
      Actions: () => <JobMenu data={jobMenuFixtures.boss} autoFocus={false} onRequest={async () => ({ ok: true })} />,
      "Off duty": () => <JobMenu data={jobMenuFixtures["off-duty"]} autoFocus={false} onRequest={async () => ({ ok: true })} />,
      Refused: () => <JobMenu data={jobMenuFixtures.boss} defaultTab="staff" autoFocus={false} onRequest={async () => ({ ok: false, error: "Only the boss can do that." })} />,
    },
  },
  {
    name: "interaction",
    title: "Interaction",
    description: "The target eye with the options of what the player aims at, chosen with the cursor or the scroll wheel, and key prompts near places with press or hold. Lua does the raycast and reads the keys; the server checks anything that matters.",
    states: {
      Vehicle: () => <InteractionStill scene={interactionFixtures.vehicle} />,
      Choosing: () => <InteractionStill scene={interactionFixtures.picking} />,
      "Hold a key": () => <InteractionStill scene={interactionFixtures.hold} />,
      Idle: () => <InteractionStill scene={interactionFixtures.idle} />,
    },
  },
  {
    name: "shop",
    title: "Shop",
    description: "A catalogue grid by category with price and stock, a cart with steppers, cash or bank, and checkout with a confirm. The page checks the cart before asking; the server's prices and stock decide, and money and items move all or nothing.",
    states: {
      Cart: () => <Shop data={shopFixtures.store} defaultCart={shopCarts.lunch} autoFocus={false} onBuy={async () => ({ ok: true })} />,
      Confirm: () => <Shop data={shopFixtures.store} defaultCart={shopCarts.lunch} confirming autoFocus={false} onBuy={async () => ({ ok: true })} />,
      "Not enough": () => <Shop data={shopFixtures.broke} defaultCart={shopCarts.big} autoFocus={false} />,
      Empty: () => <Shop data={shopFixtures.vending} autoFocus={false} />,
    },
  },
  {
    name: "inventory",
    title: "Inventory",
    description: "Your pockets and a second container side by side: drag to move (Shift half, Ctrl one), stack and swap, a tooltip, weight meters, use, and a hotbar. Lua and the server decide every move.",
    states: {
      Stash: () => <Inventory data={inventoryFixtures.locker} defaultSelected={2} autoFocus={false} onMove={async () => ({ ok: true })} onUse={async () => ({ ok: true })} />,
      Pockets: () => <Inventory data={inventoryFixtures.pockets} autoFocus={false} onMove={async () => ({ ok: true })} onUse={async () => ({ ok: true })} />,
      Heavy: () => <Inventory data={inventoryFixtures.heavy} autoFocus={false} />,
      Hotbar: () => <Hotbar data={hotbarFixtures.hotbar} />,
    },
  },
  {
    name: "vehicle-shop",
    title: "Vehicle shop",
    description: "A showroom: vehicles by category, stats, paint from swatches or any hex, cash or bank, a test drive, and buy with a confirm. The car stands behind the panels; the server spawns it and refunds if it can't be delivered.",
    states: {
      Showroom: () => <VehicleShop data={vehicleShopFixtures.pdm} autoFocus={false} onBuy={async () => ({ ok: true })} onTestDrive={async () => ({ ok: true })} />,
      Confirm: () => <VehicleShop data={vehicleShopFixtures.pdm} defaultSelected="banshee" confirming autoFocus={false} onBuy={async () => ({ ok: true })} />,
      Locked: () => <VehicleShop data={vehicleShopFixtures.pdm} defaultSelected="policeb" autoFocus={false} />,
      "Not enough": () => <VehicleShop data={vehicleShopFixtures.budget} defaultSelected="banshee" autoFocus={false} />,
    },
  },
  {
    name: "character-select",
    title: "Character select",
    description: "Character slots, the chosen one as a player card with Play and Delete (behind a confirm), where to spawn, and a create form. The server checks every choice: whose character it is, which spawn points exist, what a valid new character is.",
    states: {
      Characters: () => <CharacterSelect data={characterSelectFixtures.three} autoFocus={false} />,
      Spawn: () => <CharacterSelect data={characterSelectFixtures.three} defaultStep="spawn" autoFocus={false} />,
      Create: () => <CharacterSelect data={characterSelectFixtures.first} defaultStep="create" autoFocus={false} />,
      Delete: () => <CharacterSelect data={characterSelectFixtures.three} defaultSelected="RCH20811" confirming autoFocus={false} />,
    },
  },
];

function InteractionStill({ scene }: { scene: InteractionScene }) {
  return (
    <>
      {scene.prompts && <Prompts data={scene.prompts} />}
      {scene.target && <Target data={scene.target} autoFocus={false} onSelect={async () => ({ ok: true })} />}
    </>
  );
}

function SettingsStill({ data }: { data: (typeof settingsFixtures)[keyof typeof settingsFixtures] }) {
  return (
    <div className="nk-edge absolute inset-0">
      <div className="nk-anchor-r">
        <Settings data={data} autoFocus={false} onChange={async (_id, value) => value} />
      </div>
    </div>
  );
}

function ScoreboardStill({ data, query }: { data: (typeof scoreboardFixtures)[keyof typeof scoreboardFixtures]; query?: string }) {
  return <Scoreboard data={data} query={query} autoFocus={false} className="absolute inset-x-0 top-[15%] mx-auto" />;
}
