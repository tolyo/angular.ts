import { test, expect } from "@playwright/test";

const TEST_URL = "src/directive/attrs/boolean.html";

test("unit tests contain no errors", async ({ page }) => {
  await page.goto(TEST_URL);
  await page.content();
  await expect(page.locator(".jasmine-overall-result")).toHaveText(
    /0 failures/,
  );
});
