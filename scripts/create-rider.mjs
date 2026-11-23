// Pre-creates a rider account so the rider can sign in with phone OTP (decision D-02).
//   npm run user:create-rider -- --phone 9876543210 --name "Rider Name"
// A full admin UI for this arrives in a later phase; this is the minimal path.
import { parseArgs } from "node:util";
import { confirmTarget } from "./lib/cli.mjs";
import { createAdminClient, provisionRider } from "./lib/provision.mjs";

const { values } = parseArgs({
  options: {
    phone: { type: "string" },
    name: { type: "string" },
  },
});

if (!values.phone || !values.name) {
  console.error(
    'Usage: npm run user:create-rider -- --phone <mobile> --name "<full name>"',
  );
  process.exit(2);
}

try {
  const client = createAdminClient();
  await confirmTarget(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const rider = await provisionRider(client, {
    phone: values.phone,
    fullName: values.name,
  });
  console.log(
    `Created rider ${rider.full_name} (${rider.phone}, id ${rider.id}).`,
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
