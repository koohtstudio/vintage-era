import { expect, test } from "@playwright/test";
import { admin, card, checkout, refreshShop } from "./helpers";

test.beforeEach(refreshShop);

/**
 * The pitch: two shoppers, two windows.
 *   A bags a piece     -> B sees "In a bag" live
 *   A pays             -> B sees the Sold stamp live
 *   A hold lapses      -> piece comes back live in B
 * Run on a fresh seed:  pnpm db:reset
 */
test("in a bag -> sold -> hold expires, live in a second window", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await Promise.all([a.goto("/shop"), b.goto("/shop")]);
  await expect(card(b, "Colour-block Windbreaker")).toBeVisible();
  // B's realtime channel starts after idle; wait until it reports connected
  await expect(b.locator("html")).toHaveAttribute("data-live", "1", { timeout: 15_000 });
  await expect(a.locator("html")).toHaveAttribute("data-live", "1", { timeout: 15_000 });

  // A adds to bag
  await card(a, "Colour-block Windbreaker").getByRole("button", { name: /Add/ }).click();
  await expect(card(a, "Colour-block Windbreaker").locator(".badge")).toHaveText("In your bag");
  await expect(card(b, "Colour-block Windbreaker").locator(".badge")).toHaveText("In a bag", { timeout: 10_000 });
  await expect(card(b, "Colour-block Windbreaker").getByRole("button")).toBeDisabled();

  // A checks out -> B sees Sold
  await checkout(a, { name: "Window A", email: "a@example.test" });
  await expect(card(b, "Colour-block Windbreaker").locator(".sold-stamp")).toBeVisible({ timeout: 10_000 });

  // The DB refuses a second shopper even if the UI is bypassed
  const { data } = await admin().rpc("create_hold", { p_piece: await pieceId("colour-block-windbreaker"), p_session: crypto.randomUUID() });
  expect((data as { ok: boolean }).ok).toBe(false);

  // Hold expiry: B takes a piece, the hold lapses, it returns to the shop for A
  await a.goto("/shop"); // A is on its order page after paying
  await expect(a.locator("html")).toHaveAttribute("data-live", "1", { timeout: 15_000 });
  await card(b, "Navy Satin Starter Jacket").getByRole("button", { name: /Add/ }).click();
  await expect(card(a, "Navy Satin Starter Jacket").locator(".badge")).toHaveText("In a bag", { timeout: 10_000 });
  const db = admin();
  const id = await pieceId("navy-satin-starter-jacket");
  await db.from("holds").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("piece_id", id);
  await db.rpc("expire_holds");
  await expect(card(a, "Navy Satin Starter Jacket").getByRole("button", { name: "Add" })).toBeEnabled({ timeout: 10_000 });
});

async function pieceId(slug: string) {
  const { data } = await admin().from("pieces").select("id").eq("slug", slug).single();
  return data!.id;
}
