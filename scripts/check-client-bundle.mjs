// Fails if the built client bundle references privileged variables.
// Run after `npm run build`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const staticDir = path.resolve(import.meta.dirname, "..", ".next", "static");

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

let files;
try {
  files = listFiles(staticDir);
} catch {
  console.error(
    `No build output at ${staticDir}. Run \`npm run build\` first.`,
  );
  process.exit(1);
}

// Legacy name kept so an old-style key can never slip into a client bundle either.
const forbidden = ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
const secretValues = [
  process.env.SUPABASE_SECRET_KEY,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
].filter((value) => value && value.length >= 20);
forbidden.push(...secretValues);

const offenders = [];
for (const file of files) {
  if (!/\.(js|css|html|json|txt)$/.test(file)) continue;
  const content = readFileSync(file, "utf8");
  for (const needle of forbidden) {
    if (content.includes(needle)) {
      // Never print the matched value itself.
      const label = secretValues.includes(needle)
        ? "<secret key value>"
        : needle;
      offenders.push(`${path.relative(staticDir, file)}: ${label}`);
    }
  }
}

if (offenders.length > 0) {
  console.error("Privileged variables found in the client bundle:");
  for (const line of offenders) console.error(`  ${line}`);
  process.exit(1);
}

console.log(`Client bundle check passed (${files.length} files scanned).`);
