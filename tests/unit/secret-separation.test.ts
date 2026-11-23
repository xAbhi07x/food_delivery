import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { publicEnvSchema, serverEnvSchema } from "@/lib/env/schema";

const root = path.resolve(import.meta.dirname, "..", "..");

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return listSourceFiles(full);
    return /\.(ts|tsx|mjs|js)$/.test(name) ? [full] : [];
  });
}

const privilegedName = /service_role|secret|private/i;

describe("secret separation", () => {
  it("keeps privileged names out of the public env schema", () => {
    for (const key of Object.keys(publicEnvSchema.shape)) {
      expect(key.startsWith("NEXT_PUBLIC_")).toBe(true);
      expect(key).not.toMatch(privilegedName);
    }
  });

  it("keeps every server env variable free of the NEXT_PUBLIC_ prefix", () => {
    for (const key of Object.keys(serverEnvSchema.shape)) {
      expect(key.startsWith("NEXT_PUBLIC_")).toBe(false);
    }
  });

  it("never exposes a privileged variable through NEXT_PUBLIC_ in source or .env.example", () => {
    const files = [
      ...listSourceFiles(path.join(root, "src")),
      path.join(root, ".env.example"),
    ];
    const offenders = files.filter((file) =>
      /NEXT_PUBLIC_\w*(SERVICE_ROLE|SECRET|PRIVATE)/i.test(
        readFileSync(file, "utf8"),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("marks the server env module as server-only", () => {
    const source = readFileSync(
      path.join(root, "src", "lib", "env", "server.ts"),
      "utf8",
    );
    expect(source).toMatch(/^import "server-only";/m);
  });

  it("does not import server-only modules from client components", () => {
    const offenders = listSourceFiles(path.join(root, "src")).filter((file) => {
      const source = readFileSync(file, "utf8");
      return (
        /^["']use client["']/m.test(source) &&
        /lib\/env\/server|lib\/supabase\/server|current-user|SUPABASE_SECRET_KEY/.test(
          source,
        )
      );
    });
    expect(offenders).toEqual([]);
  });

  it("references the secret key only inside the env module", () => {
    const offenders = listSourceFiles(path.join(root, "src"))
      .filter((file) => !file.includes(path.join("src", "lib", "env")))
      .filter((file) =>
        /SUPABASE_SECRET_KEY|SERVICE_ROLE/.test(readFileSync(file, "utf8")),
      );
    expect(offenders).toEqual([]);
  });

  it("marks modules that read the signed-in user as server-only", () => {
    for (const file of [
      ["src", "lib", "supabase", "server.ts"],
      ["src", "modules", "auth", "current-user.ts"],
    ]) {
      const source = readFileSync(path.join(root, ...file), "utf8");
      expect(source, file.join("/")).toMatch(/^import "server-only";/m);
    }
  });
});
