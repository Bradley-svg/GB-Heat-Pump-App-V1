import { by, element, expect, waitFor, device } from "detox";

import { signInThroughUi } from "./helpers/workflows";

describe("Dashboard experience", () => {
  beforeEach(async () => {
    await device.launchApp({ delete: true, newInstance: true });
    await signInThroughUi();
  });

  it("refreshes KPI tiles", async () => {
    await element(by.id("dashboard-scroll")).swipe("down", "fast", 0.3);
    await expect(element(by.text("Start Commissioning"))).toBeVisible();
  });

  it("opens alerts via quick link fallback", async () => {
    await element(by.label("Alerts")).atIndex(0).tap();
    await waitFor(element(by.id("severity-all")))
      .toBeVisible()
      .withTimeout(10000);
  });
});
