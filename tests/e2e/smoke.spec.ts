import { expect, test } from "@playwright/test";

test("health endpoint reports ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ status: "ok" });
});

test("home page renders on a mobile viewport", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Murliganj Food Delivery/i }),
  ).toBeVisible();
});
