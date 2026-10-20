import { InventorySurface } from "@/components/blocks/inventory/inventory";
import { NuiToaster } from "@/components/ui/nui-toaster";

// The inventory block (npx shadcn add @nuikit/inventory). It's your code now: the panes, drag and
// drop, tooltip and hotbar are in components/blocks/inventory, its messages in
// components/blocks/inventory/nui.ts, and client/main.lua + server/main.lua decide what's where and
// check every move. The toaster shows nk.notify() from Lua.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <InventorySurface />
      <NuiToaster />
    </main>
  );
}
