import {
  test,
  _electron as electron,
  expect,
  ElectronApplication,
  Page,
} from "@playwright/test";

let electronApp: ElectronApplication;
let page: Page;

test.beforeEach(async () => {
  electronApp = await electron.launch({
    args: ["dist-electron/main.js"],
  });
  page = await electronApp.firstWindow({ timeout: 10000 });
});

test.afterEach(async () => {
  await electronApp.close();
});

test("Input exists", async () => {
  const input = await page.locator("#input");
  expect(await input.isEnabled()).toBeTruthy();
  expect(await input.isVisible()).toBeTruthy();
});
