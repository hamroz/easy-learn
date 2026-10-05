import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { runCli } from "@/server/ai/spawn";
import { ProviderError } from "@/server/ai/types";

describe("runCli", () => {
  it("streams stdout lines and passes stdin", async () => {
    const seen: string[] = [];
    const r = await runCli({
      cmd: process.execPath,
      args: ["-e", "process.stdin.on('data', d => { process.stdout.write('a\\n' + d.toString().trim() + '\\n'); })"],
      stdin: "hello",
      timeoutMs: 5000,
      onLine: (l) => seen.push(l),
    });
    expect(r.code).toBe(0);
    expect(seen).toEqual(["a", "hello"]);
  });

  it("kills a process that exceeds the timeout", async () => {
    const started = Date.now();
    const err = await runCli({ cmd: process.execPath, args: ["-e", "setInterval(() => {}, 1000)"], timeoutMs: 300 }).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.kind).toBe("timeout");
    expect(Date.now() - started).toBeLessThan(5000);
  });

  it("reports a missing binary", async () => {
    const err = await runCli({ cmd: "definitely-not-a-real-cli-xyz", args: [], timeoutMs: 1000 }).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.kind).toBe("missing");
  });

  it("stops when aborted", async () => {
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 100);
    const err = await runCli({ cmd: process.execPath, args: ["-e", "setInterval(() => {}, 1000)"], timeoutMs: 5000, signal: ac.signal }).catch((e) => e);
    expect(err.kind).toBe("aborted");
  });

  it("finishes on timeout even when a grandchild keeps the output pipe open", async () => {
    const started = Date.now();
    const bin = new URL("../fixtures/cli/hung-wrapper.mjs", import.meta.url).pathname;
    const err = await runCli({ cmd: bin, args: [], timeoutMs: 300 }).catch((e) => e);
    expect(err.kind).toBe("timeout");
    expect(Date.now() - started).toBeLessThan(8000);
  });

  it("kills the whole process group, including grandchildren that ignore SIGTERM", async () => {
    const bin = new URL("../fixtures/cli/hung-wrapper.mjs", import.meta.url).pathname;
    await runCli({ cmd: bin, args: [], timeoutMs: 300 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 3600));
    const left = spawnSync("pgrep", ["-f", "process.on\\('SIGTERM'"]).stdout.toString().trim();
    expect(left).toBe("");
  }, 10_000);
});
