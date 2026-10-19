import { useEffect } from "react";
import { applyTheme } from "nuikit-core";
import { Button } from "@/components/ui/button";

const post = (name: string, body: unknown = {}) =>
  fetch(`https://${GetParentResourceName()}/${name}`, { method: "POST", body: JSON.stringify(body) });

export function App() {
  // The overridden resource's protocol: Escape posts "exit" (docs/<name>-protocol.md).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") void post("exit");
    };
    window.addEventListener("keyup", onKey);
    return () => window.removeEventListener("keyup", onKey);
  }, []);
  void applyTheme;
  return (
    <div className="nk-panel">
      <Button className="bg-primary">Close</Button>
    </div>
  );
}
