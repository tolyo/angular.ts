import { test, expect } from "@playwright/test";

test("lexer unit tests contain no errors", async ({ page }) => {
  await page.goto("src/core/parser/lexer.html");
  await page.content();
  await page.waitForTimeout(100);
  await expect(page.locator(".jasmine-overall-result")).toHaveText(
    /0 failures/,
  );
});

test("parser unit tests contain no errors", async ({ page }) => {
  await page.goto("src/core/parser/parse.html");
  await page.content();
  await page.waitForTimeout(100);
  await expect(page.locator(".jasmine-overall-result")).toHaveText(
    /0 failures/,
  );
});
