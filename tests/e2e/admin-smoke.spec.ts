import { expect, test } from "@playwright/test";

/** Every owner page renders for the owner, and staff are bounced from owner-only pages. */
test("owner can open every admin page; staff cannot open owner pages", async ({ browser }) => {
  const owner = await (await browser.newContext()).newPage();
  await owner.goto("/admin/login");
  await owner.getByRole("button", { name: /Owner/ }).click();
  await owner.waitForURL("**/admin");
  for (const path of ["/admin", "/admin/pieces", "/admin/pieces/new", "/admin/orders", "/admin/drops", "/admin/homepage", "/admin/subscribers", "/admin/sellers", "/admin/settings", "/admin/outbox"]) {
    const res = await owner.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(owner.locator("h1").first(), path).toBeVisible();
    await expect(owner.getByText(/Application error|Internal Server Error/), path).toHaveCount(0);
  }

  const staff = await (await browser.newContext()).newPage();
  await staff.goto("/admin/login");
  await staff.getByRole("button", { name: /Toronto staff/ }).click();
  await staff.waitForURL("**/admin");
  await staff.goto("/admin/settings");
  await expect(staff).toHaveURL(/\/admin\?denied=owner/);
  const csv = await staff.request.get("/api/subscribers/export");
  expect(csv.status()).toBe(403);
  // anonymous visitors never see the console
  const anon = await (await browser.newContext()).newPage();
  await anon.goto("/admin/orders");
  await expect(anon).toHaveURL(/\/admin\/login/);
});
