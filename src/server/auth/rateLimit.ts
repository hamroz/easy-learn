const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 10;

/** In-memory login throttle: 10 failures per key (IP) per 15 minutes. Fine for a single instance. */
export class LoginLimiter {
  private readonly hits = new Map<string, number[]>();
  constructor(private readonly now: () => number = Date.now) {}

  private recent(key: string) {
    const cutoff = this.now() - WINDOW_MS;
    const list = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    if (list.length) this.hits.set(key, list);
    else this.hits.delete(key);
    return list;
  }

  failures(key: string) {
    return this.recent(key).length;
  }
  isLimited(key: string) {
    return this.failures(key) >= MAX_FAILURES;
  }
  fail(key: string) {
    this.hits.set(key, [...this.recent(key), this.now()]);
  }
  succeed(key: string) {
    this.hits.delete(key);
  }
}

const g = globalThis as unknown as { __elLimiter?: LoginLimiter };
export const loginLimiter = (g.__elLimiter ??= new LoginLimiter());
