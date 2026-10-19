// Times n fetchNui round trips to the owning resource's `probe:echo` callback.
import { fetchNui } from "nuikit-core";

export async function run(n: number): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    await fetchNui("probe:echo", { i, pad: "x".repeat(64) });
    out.push(performance.now() - t);
  }
  return out;
}

export function expose(): void {
  (window as unknown as { __probe: typeof run }).__probe = run;
}
