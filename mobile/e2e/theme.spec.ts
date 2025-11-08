import { by, element, expect, waitFor, device } from "detox";

import { ensureSignedOut, signInThroughUi } from "./helpers/workflows";
import { setSystemTheme } from "./helpers/system";

describe("Theme responsiveness", () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true, newInstance: true });
    await signInThroughUi();
  });

  afterAll(async () => {
    await setSystemTheme("light");
    await ensureSignedOut();
  });

  it("reacts to OS-level theme toggles", async () => {
    await setSystemTheme("light");
    await waitFor(element(by.id("theme-probe")))
      .toHaveLabel("theme-light")
      .withTimeout(5000);

    await setSystemTheme("dark");
    await waitFor(element(by.id("theme-probe")))
      .toHaveLabel("theme-dark")
      .withTimeout(5000);
  });
});
