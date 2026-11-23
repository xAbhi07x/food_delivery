import { existsSync } from "node:fs";

// Makes local runs work without exporting variables by hand. Real environment variables
// (for example in CI) take precedence because loadEnvFile never overrides existing ones.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
