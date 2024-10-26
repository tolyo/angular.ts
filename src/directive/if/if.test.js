import { test, expect } from "@playwright/test";

const TEST_URL = "src/directive/if/if.html";

test("unit tests contain no errors", async ({ page }) => {
  await page.goto(TEST_URL);
  await page.content();

  await expect(page.locator(".jasmine-overall-result")).toHaveText(
    /0 failures/,
  );
});

test.describe("animations", () => {
  test("it should add enter and leave classes when animation is enabled", async ({
    page,
  }) => {
    await page.goto("src/directive/if/if-animate-css.html");
    await page.content();
    // when if attribute has `data-animate` set to true
    await page.click('button:has-text("Fade In!")');
    let animated = await page.locator("#data-animate");

    await expect(animated).toBeVisible();
    await expect(animated).toHaveClass(/ng-enter/);
    await expect(animated).toHaveClass(/ng-enter-active/);

    // Wait for the transition to complete
    await page.waitForTimeout(500);
    await expect(animated).not.toHaveClass(/ng-enter/);
    await expect(animated).not.toHaveClass(/ng-enter-active/);

    await page.click('button:has-text("Fade Out!")');
    await expect(animated).toHaveClass(/ng-leave/);
    await expect(animated).toHaveClass(/ng-leave-active/);
    await page.waitForTimeout(500);
    // should be invisible
    await expect(animated).not.toBeVisible();

    // when if attribute has `animate` set to true
    await page.click('button:has-text("Fade In!")');
    animated = await page.locator("#animate");

    await expect(animated).toBeVisible();
    await expect(animated).toHaveClass(/ng-enter/);
    await expect(animated).toHaveClass(/ng-enter-active/);

    // Wait for the transition to complete
    await page.waitForTimeout(500);
    await expect(animated).not.toHaveClass(/ng-enter/);
    await expect(animated).not.toHaveClass(/ng-enter-active/);

    await page.click('button:has-text("Fade Out!")');
    await expect(animated).toHaveClass(/ng-leave/);
    await expect(animated).toHaveClass(/ng-leave-active/);
    await page.waitForTimeout(500);
    // should be invisible
    await expect(animated).not.toBeVisible();

    // when if attribute has no animate antributes
    await page.click('button:has-text("Fade In!")');
    let nonAnimated = await page.locator("#no-animate");

    await expect(nonAnimated).toBeVisible();
    await expect(nonAnimated).not.toHaveClass(/ng-enter/);
    await expect(nonAnimated).not.toHaveClass(/ng-enter-active/);

    // Wait for the transition to complete
    await page.waitForTimeout(100);

    await page.click('button:has-text("Fade Out!")');
    // should be instantly invisible
    await expect(nonAnimated).not.toBeVisible();
  });

  test("should destroy the previous leave animation if a new one takes place", async ({
    page,
  }) => {
    await page.goto("src/directive/if/if-animate-css.html");
    await page.content();
    // when if attribute has `data-animate` set to true
    await page.click('button:has-text("Fade In!")');
    let animated = await page.locator("#data-animate");

    await expect(animated).toBeVisible();
    await expect(animated).toHaveClass(/ng-enter/);
    await expect(animated).toHaveClass(/ng-enter-active/);

    // Wait for the transition to complete
    await page.waitForTimeout(100);
    await expect(animated).not.toHaveClass(/ng-enter/);
    await expect(animated).not.toHaveClass(/ng-enter-active/);

    await page.click('button:has-text("Fade Out!")');
    await page.click('button:has-text("Fade In!")');
    // should be visible
    await page.waitForTimeout(500);
    await expect(animated).toBeVisible();
    await expect(animated).not.toHaveClass(/ng-leave/);
    await expect(animated).not.toHaveClass(/ng-leave-active/);
  });

  test("should work with svg elements when the svg container is transcluded", async ({
    page,
  }) => {
    await page.goto("src/directive/if/if-animate-css.html");
    await page.content();
    await page.click('button:has-text("Fade In!")');
    let animated = await page.locator("#circle");
    await expect(animated).not.toHaveClass(/ng-enter/);
    await expect(animated).not.toHaveClass(/ng-enter-active/);
  });
});
