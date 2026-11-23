// Runs once when the server starts, so a misconfigured environment fails immediately.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getServerEnv } = await import("@/lib/env/server");
    getServerEnv();
  }
}
