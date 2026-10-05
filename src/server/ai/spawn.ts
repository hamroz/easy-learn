import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ProviderError } from "./types";

export interface RunCliOptions {
  cmd: string;
  args: string[];
  stdin?: string;
  timeoutMs: number;
  signal?: AbortSignal;
  onLine?: (line: string) => void;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

export interface RunCliResult {
  code: number | null;
  lines: string[];
  stderr: string;
}

/** Empty working directory for CLI agents, so they never see project files. */
export function scratchDir() {
  const dir = path.join(os.tmpdir(), "easy-learn-cli");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Minimal environment for the CLIs: their own HOME (sign-ins live there) and nothing app-secret. */
export function cliEnv(): NodeJS.ProcessEnv {
  const home = process.env.CLI_HOME || process.env.HOME || os.homedir();
  const keep = ["PATH", "LANG", "LC_ALL", "USER", "LOGNAME", "TMPDIR", "SHELL", "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY"];
  const env: Record<string, string | undefined> = { HOME: home, TERM: "dumb", NO_COLOR: "1" };
  for (const k of keep) if (process.env[k]) env[k] = process.env[k];
  if (process.env.CLI_HOME) {
    env.XDG_CONFIG_HOME = path.join(home, ".config");
    env.XDG_CACHE_HOME = path.join(home, ".cache");
    env.XDG_STATE_HOME = path.join(home, ".local/state");
  }
  return env as NodeJS.ProcessEnv;
}

/**
 * Run a CLI, feed it stdin, stream stdout line by line. Kills the process (TERM, then KILL) on
 * timeout or abort, and maps those to ProviderError kinds.
 */
export function runCli(opts: RunCliOptions): Promise<RunCliResult> {
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) return reject(new ProviderError("aborted", "Request was cancelled"));

    // Own process group, so a timeout also kills grandchildren (npm shims spawn the native binary).
    const child = spawn(opts.cmd, opts.args, {
      cwd: opts.cwd ?? scratchDir(),
      env: opts.env ?? cliEnv(),
      stdio: ["pipe", "pipe", "pipe"],
      detached: true,
    });
    const signalGroup = (sig: NodeJS.Signals) => {
      try {
        if (child.pid) process.kill(-child.pid, sig);
      } catch {
        /* group already gone */
      }
    };

    const lines: string[] = [];
    let stderr = "";
    let buffer = "";
    let settled = false;
    let killReason: "timeout" | "aborted" | null = null;

    const kill = (reason: "timeout" | "aborted") => {
      if (killReason || settled) return;
      killReason = reason;
      signalGroup("SIGTERM");
      // Always finish the group off, even if the call already settled: grandchildren may ignore TERM.
      setTimeout(() => signalGroup("SIGKILL"), 3000).unref();
    };

    const timer = setTimeout(() => kill("timeout"), opts.timeoutMs);
    const onAbort = () => kill("aborted");
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
      fn();
    };

    const emit = (line: string) => {
      lines.push(line);
      opts.onLine?.(line);
    };

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      buffer += chunk;
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).replace(/\r$/, "");
        buffer = buffer.slice(nl + 1);
        if (line) emit(line);
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      if (stderr.length < 64_000) stderr += chunk;
    });

    child.on("error", (err: NodeJS.ErrnoException) =>
      finish(() =>
        reject(
          err.code === "ENOENT"
            ? new ProviderError("missing", `The \`${opts.cmd}\` command is not installed on this machine`)
            : new ProviderError("failed", err.message),
        ),
      ),
    );

    // If the process exited but something still holds its pipes, stop waiting after a grace period.
    child.on("exit", () => {
      setTimeout(() => {
        child.stdout.destroy();
        child.stderr.destroy();
        onClose(child.exitCode);
      }, 1500).unref();
    });

    const onClose = (code: number | null) =>
      finish(() => {
        if (buffer.trim()) emit(buffer.trim());
        if (killReason === "timeout")
          return reject(new ProviderError("timeout", `\`${opts.cmd}\` did not finish within ${Math.round(opts.timeoutMs / 1000)}s`));
        if (killReason === "aborted") return reject(new ProviderError("aborted", "Request was cancelled"));
        resolve({ code, lines, stderr });
      });
    child.on("close", onClose);

    child.stdin.on("error", () => {});
    child.stdin.end(opts.stdin ?? "");
  });
}
