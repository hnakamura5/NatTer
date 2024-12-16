import { test, _electron as electron, expect } from "@playwright/test";

// To see the test is running.
test("Test is running", async () => {
  console.log("test is running");
});

test("Launch app", async () => {
  const electronApp = await electron.launch({ args: ["dist-electron/main.js"] });
  await electronApp.close();
});
