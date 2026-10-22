import { InventorySurface } from "@/components/blocks/inventory/inventory";
import { NuiNotices } from "@/components/ui/notice";

// The inventory block (npx shadcn add @nuikit/inventory). It's your code now: the panes, drag and
// drop, tooltip and hotbar are in components/blocks/inventory, its messages in
// components/blocks/inventory/nui.ts, and client/main.lua + server/main.lua decide what's where and
// check every move. <NuiNotices /> shows nk.notify() from Lua.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <InventorySurface />
      <NuiNotices />
    </main>
  );
}
