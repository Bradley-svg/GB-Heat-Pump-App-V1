import { by, element, expect, waitFor } from "detox";

import {
  ensureSignedOut,
  signInThroughUi,
  signOutThroughUi,
} from "./helpers/workflows";

describe("Authentication", () => {
  beforeEach(async () => {
    await ensureSignedOut();
  });

  it("signs in with valid credentials", async () => {
    await element(by.id("login-email")).replaceText(
      process.env.MOBILE_E2E_EMAIL ?? "",
    );
    await element(by.id("login-password")).replaceText(
      process.env.MOBILE_E2E_PASSWORD ?? "",
    );
    await element(by.id("login-submit")).tap();
    await waitFor(element(by.id("dashboard-scroll")))
      .toBeVisible()
      .withTimeout(15000);
  });

  it("allows the user to sign out from the dashboard", async () => {
    await signInThroughUi();
    await element(by.id("quicklink-logout")).tap();
    await expect(element(by.id("login-card"))).toBeVisible();
  });

  afterAll(async () => {
    await signOutThroughUi();
  });
});
