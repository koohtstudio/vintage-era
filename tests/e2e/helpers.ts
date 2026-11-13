import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

process.loadEnvFile(".env.local");

/** Test-only service client for arranging state (never used by the app code paths under test). */
export const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export const card = (page: Page, title: string) => page.locator("article.card", { hasText: title }).first();

export async function checkout(page: Page, who: { name: string; email: string }) {
  await page.goto("/checkout");
  await page.getByLabel("Name").fill(who.name);
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Phone").fill("4165550199");
  await page.getByRole("button", { name: "Pay securely" }).click();
  await page.waitForURL(/\/mock\/pay/);
  await page.getByRole("button", { name: /^Pay \$/ }).click();
  await page.waitForURL(/\/order\//);
}
