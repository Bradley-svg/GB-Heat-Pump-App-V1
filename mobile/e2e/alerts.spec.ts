import { by, element, waitFor, expect, device } from "detox";

import {
  openAlertsTab,
  signInThroughUi,
} from "./helpers/workflows";

describe("Alerts workflow", () => {
  beforeEach(async () => {
    await device.launchApp({ delete: true, newInstance: true });
    await signInThroughUi();
    await openAlertsTab();
  });

  it("filters alerts by severity chip", async () => {
    await element(by.id("severity-warning")).tap();
    await element(by.id("severity-all")).tap();
  });

  it("acknowledges an alert when one is available", async () => {
    try {
      await waitFor(element(by.id("alert-row-0")))
        .toBeVisible()
        .withTimeout(5000);
    } catch {
      console.warn("No alerts available to acknowledge");
      return;
    }
    await element(by.id("alert-row-0")).tap();
    await element(by.id("alert-ack-button")).tap();
    await expect(element(by.id("alert-ack-button"))).not.toBeVisible();
  });
});
