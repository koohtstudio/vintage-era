import path from "node:path";
import { expect, test } from "@playwright/test";
import { card } from "./helpers";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

/** Staff can list a piece from a phone-sized screen in under a minute, and it shows up live on the shop. */
test("barrie staff lists a piece on a phone in under a minute", async ({ browser, page }) => {
  const shopper = await (await browser.newContext()).newPage();
  await shopper.goto("/shop");
  await shopper.waitForTimeout(3000);

  await page.goto("/admin/login");
  await page.getByRole("button", { name: /Barrie staff/ }).click();
  await page.waitForURL("**/admin");

  const started = Date.now();
  await page.goto("/admin/pieces/new");
  await page.locator("input[name=photos]").setInputFiles(path.resolve("public/photos/jackets-flatlay.jpg"));
  await page.getByLabel("Title").fill("E2E Phone Satin Jacket");
  await page.getByRole("button", { name: "L", exact: true }).click();
  await page.getByLabel(/Pit to pit/).fill("23");
  await page.getByLabel(/Length/).fill("28");
  await page.getByLabel(/Price/).first().fill("120");
  await page.getByRole("button", { name: "Put it on the site" }).click();
  await expect(page.getByText("Live on the site.")).toBeVisible({ timeout: 30_000 });
  const seconds = (Date.now() - started) / 1000;
  expect(seconds).toBeLessThan(60);

  await expect(card(shopper, "E2E Phone Satin Jacket")).toBeVisible({ timeout: 15_000 });
});
