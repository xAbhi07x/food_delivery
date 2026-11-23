// Creates the first (or any) administrator account. Run by a developer; the app never does this.
//   npm run user:create-admin -- --email owner@example.com --name "Owner Name"
// The password is read from a hidden prompt, or from ADMIN_PASSWORD for non-interactive use.
import { parseArgs } from "node:util";
import { askHidden, confirmTarget } from "./lib/cli.mjs";
import { createAdminClient, provisionAdmin } from "./lib/provision.mjs";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
  },
});

if (!values.email || !values.name) {
  console.error(
    'Usage: npm run user:create-admin -- --email <email> --name "<full name>"',
  );
  process.exit(2);
}

try {
  const client = createAdminClient();
  await confirmTarget(process.env.NEXT_PUBLIC_SUPABASE_URL);

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await askHidden(
      "Password (min 12 chars, upper, lower, digit): ",
    );
    const again = await askHidden("Repeat password: ");
    if (password !== again) throw new Error("Passwords do not match.");
  }

  const admin = await provisionAdmin(client, {
    email: values.email,
    password,
    fullName: values.name,
  });
  console.log(`Created administrator ${admin.full_name} (id ${admin.id}).`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
