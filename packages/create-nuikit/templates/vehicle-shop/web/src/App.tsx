import { VehicleShopSurface } from "@/components/blocks/vehicle-shop/vehicle-shop";
import { NuiNotices } from "@/components/ui/notice";

// The vehicle-shop block (npx shadcn add @nuikit/vehicle-shop). It's your code now: the showroom
// panels are in components/blocks/vehicle-shop, its messages in
// components/blocks/vehicle-shop/nui.ts, and client/main.lua + server/main.lua decide what's for
// sale and check every purchase. <NuiNotices /> shows nk.notify() from Lua.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <VehicleShopSurface />
      <NuiNotices />
    </main>
  );
}
