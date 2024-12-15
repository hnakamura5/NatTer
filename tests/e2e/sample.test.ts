import { test, _electron as electron } from "@playwright/test";

// To see the test is running.
test("test is running", async () => {
  console.log("test is running");
});

test("launch app", async () => {
  const electronApp = await electron.launch({ args: ["dist-electron/main.js"] });
  await electronApp.close();
});
