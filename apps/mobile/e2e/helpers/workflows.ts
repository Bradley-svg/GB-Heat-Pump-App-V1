import { expect, element, by, device, waitFor } from "detox";

import { getE2ECredentials } from "./credentials";

export async function launchFreshApp() {
  await device.launchApp({ delete: true, newInstance: true });
}

export async function ensureSignedOut() {
  await launchFreshApp();
  await expect(element(by.id("login-card"))).toBeVisible();
}

export async function signInThroughUi() {
  const { email, password } = getE2ECredentials();
  await ensureSignedOut();
  await element(by.id("login-email")).replaceText(email);
  await element(by.id("login-password")).replaceText(password);
  await element(by.id("login-submit")).tap();
  await waitFor(element(by.id("dashboard-scroll")))
    .toBeVisible()
    .withTimeout(15000);
}

export async function signOutThroughUi() {
  try {
    await element(by.id("quicklink-logout")).tap();
    await waitFor(element(by.id("login-card"))).toBeVisible().withTimeout(10000);
  } catch {
    // If we fail to logout gracefully, relaunch the app to a clean state.
    await ensureSignedOut();
  }
}

export async function openAlertsTab() {
  await element(by.label("Alerts")).atIndex(0).tap();
  await waitFor(element(by.id("severity-all")))
    .toBeVisible()
    .withTimeout(10000);
}
