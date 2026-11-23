// Shared helpers for the provisioning CLIs.
import readline from "node:readline";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export function isLocalUrl(url) {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    }),
  );
}

// Reads a line without echoing it when stdin is a terminal.
export function askHidden(question) {
  if (!process.stdin.isTTY) return ask(question);
  return new Promise((resolve) => {
    process.stdout.write(question);
    let value = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") process.exit(130); // Ctrl+C
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    process.stdin.on("data", onData);
  });
}

// Refuses to touch a non-local project unless the operator explicitly confirms.
export async function confirmTarget(url) {
  console.log(`Target Supabase project: ${url}`);
  if (isLocalUrl(url)) return;
  const answer = await ask(
    "This is NOT a local project. Type 'yes' to continue: ",
  );
  if (answer.trim().toLowerCase() !== "yes") {
    console.log("Cancelled.");
    process.exit(1);
  }
}
