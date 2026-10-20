export const UNIT_LABEL = { mph: "mph", kmh: "km/h", kts: "kts" } as const;

const CARDINAL = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
/** The compass point for a bearing (0 north, 90 east). */
export const cardinal = (deg: number) => CARDINAL[Math.round((((deg % 360) + 360) % 360) / 45) % 8]!;

/** Write text into an element's own text node only when it differs (no layout when it doesn't). */
export function setText(el: Element | null | undefined, text: string) {
  if (!el) return;
  const node = el.firstChild;
  if (node && node.nodeType === 3) {
    if (node.nodeValue !== text) node.nodeValue = text;
  } else el.textContent = text;
}
