// Every registry component section on /components, in the four identities and Daylight, at 1920×1080.
// Deterministic by construction: the page clock is frozen (timers, countdowns, timed meters, rAF), CSS
// animations and transitions are off, the photo behind each stage is hidden (its decode and scaling vary),
// and every font has loaded. What's left is rendering, which the pinned Playwright image keeps stable.
import { expect, test, type Page } from "@playwright/test";

const IDENTITIES = ["graphite", "signal", "velvet", "vector", "daylight"] as const;
const START = new Date("2026-10-20T12:00:00Z");

async function open(page: Page, identity: string) {
  // time stands still from the first script on; only runFor moves it, by the same amount every run
  await page.clock.install({ time: START });
  await page.clock.pauseAt(new Date(START.getTime() + 1_000));
  await page.goto(`/components?identity=${identity}`, { waitUntil: "networkidle" });
  // mount effects, enter timers and the first frames of anything live
  await page.clock.runFor(2_000);
  await page.addStyleTag({
    content: `section [aria-hidden] > img { visibility: hidden !important; }
      *, *::before, *::after { caret-color: transparent !important; }`,
  });
  await page.evaluate(() => document.fonts.ready);
}

/** The ids of the registry sections on the page (one per item; second sections of an item have no id). */
async function sections(page: Page) {
  return page.$$eval("main section[id]", (els) => els.map((e) => e.id));
}

for (const identity of IDENTITIES) {
  test(`components in ${identity}`, async ({ page }) => {
    await open(page, identity);
    const ids = await sections(page);
    expect(ids.length, "sections on /components").toBeGreaterThan(10);
    for (const id of ids) {
      const section = page.locator(`section#${id}`);
      await section.scrollIntoViewIfNeeded();
      await expect.soft(section, `${id} in ${identity}`).toHaveScreenshot([identity, `${id}.png`]);
    }
  });
}
