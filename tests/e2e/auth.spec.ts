import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  provisionAdmin,
  provisionRider,
} from "../../scripts/lib/provision.mjs";
import {
  TEST_OTP_CODE,
  deleteUserByEmail,
  deleteUserByPhone,
  secretClient,
} from "../helpers/supabase";

// Numbers listed under [auth.sms.test_otp] in supabase/config.toml. Each test uses its own so the
// per-number OTP cooldown never interferes, and users are deleted before and after each test.
const PHONES = {
  customer: { local: "9999900010", e164: "+919999900010" },
  rider: { local: "9999900011", e164: "+919999900011" },
  unknownRider: { local: "9999900012", e164: "+919999900012" },
};

const admin = secretClient();
const adminEmail = `e2e-admin-${randomUUID()}@example.test`;
const adminPassword = "Str0ngAdminPassw0rd";

// Next.js also renders a role="alert" route announcer, so target the form's own error message.
const formAlert = (page: Page) => page.locator("p[role='alert']");

async function removeAll() {
  for (const { e164 } of Object.values(PHONES)) {
    await deleteUserByPhone(admin, e164);
  }
  await deleteUserByEmail(admin, adminEmail);
}

test.beforeEach(removeAll);
test.afterEach(removeAll);
test.setTimeout(60_000);

async function signInWithOtp(page: Page, loginPath: string, local: string) {
  await page.goto(loginPath);
  await page.getByLabel("Mobile number").fill(local);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel(/Code sent to/).fill(TEST_OTP_CODE);
  await page.getByRole("button", { name: "Verify and sign in" }).click();
}

test.describe("anonymous visitors", () => {
  for (const [path, login] of [
    ["/account", "/login"],
    ["/rider", "/rider/login"],
    ["/admin", "/admin/login"],
  ]) {
    test(`are sent from ${path} to ${login}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${login}$`));
    });
  }
});

test("a customer signs in with OTP, stays out of other areas, and signs out", async ({
  page,
}) => {
  await signInWithOtp(page, "/login", PHONES.customer.local);
  await expect(page).toHaveURL(/\/account$/, { timeout: 20_000 });
  await expect(
    page.getByText(`Signed in as ${PHONES.customer.e164}`),
  ).toBeVisible();

  // Wrong areas bounce back to the customer's own home.
  await page.goto("/rider");
  await expect(page).toHaveURL(/\/account$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/account$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);
});

test("a wrong code is rejected with a clear message", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Mobile number").fill(PHONES.customer.local);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel(/Code sent to/).fill("000000");
  await page.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(formAlert(page)).toContainText(/incorrect or has expired/i);
  await expect(page).toHaveURL(/\/login$/);
});

test("an invalid phone number is rejected before any code is sent", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Mobile number").fill("12345");
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(formAlert(page)).toContainText(/valid 10-digit/i);
});

test("a pre-created rider signs in and cannot enter other areas", async ({
  page,
}) => {
  await provisionRider(admin, {
    phone: PHONES.rider.e164,
    fullName: "E2E Rider",
  });
  await signInWithOtp(page, "/rider/login", PHONES.rider.local);
  await expect(page).toHaveURL(/\/rider$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Rider area" })).toBeVisible();

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/rider$/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/rider$/);
});

test("an unregistered number cannot sign in as a rider and is not told whether it exists", async ({
  page,
}) => {
  await page.goto("/rider/login");
  await page.getByLabel("Mobile number").fill(PHONES.unknownRider.local);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("status")).toContainText(
    /if this number is registered/i,
  );

  await page.getByLabel(/Code sent to/).fill(TEST_OTP_CODE);
  await page.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(formAlert(page)).toContainText(/incorrect or has expired/i);
  await expect(page).toHaveURL(/\/rider\/login$/);
});

test("a customer number cannot sign in through the rider portal", async ({
  page,
}) => {
  // A plain CUSTOMER account (created directly, so only one OTP request is made for this number).
  await admin.auth.admin.createUser({
    phone: PHONES.customer.e164,
    phone_confirm: true,
  });

  await signInWithOtp(page, "/rider/login", PHONES.customer.local);
  await expect(formAlert(page)).toContainText(/not registered as a rider/i);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);
});

test.describe("administrator", () => {
  test("signs in with email and password", async ({ page }) => {
    await provisionAdmin(admin, {
      email: adminEmail,
      password: adminPassword,
      fullName: "E2E Admin",
    });
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(adminEmail);
    await page.getByLabel("Password").fill(adminPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: "Administration" }),
    ).toBeVisible();

    await page.goto("/rider");
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/account");
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("a wrong password shows a generic error", async ({ page }) => {
    await provisionAdmin(admin, {
      email: adminEmail,
      password: adminPassword,
      fullName: "E2E Admin",
    });
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(adminEmail);
    await page.getByLabel("Password").fill("Wrong-Password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(formAlert(page)).toContainText(/incorrect email or password/i);
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("a non-admin account cannot sign in through the admin form", async ({
    page,
  }) => {
    const email = `e2e-customer-${randomUUID()}@example.test`;
    const { error } = await admin.auth.admin.createUser({
      email,
      password: adminPassword,
      email_confirm: true,
    });
    expect(error).toBeNull();
    try {
      await page.goto("/admin/login");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(adminPassword);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(formAlert(page)).toContainText(
        /incorrect email or password/i,
      );
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/admin\/login$/);
    } finally {
      await deleteUserByEmail(admin, email);
    }
  });
});
