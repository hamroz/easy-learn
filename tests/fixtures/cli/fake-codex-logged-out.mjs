#!/usr/bin/env node
// Behaves like `codex exec --json` for a signed-out account.
process.stdin.resume();
process.stdin.on("end", () => {
  console.log(JSON.stringify({ type: "turn.failed", error: { message: "401 Unauthorized: please run codex login" } }));
  process.exit(1);
});
