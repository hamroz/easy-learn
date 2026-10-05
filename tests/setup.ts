process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? "postgres://easylearn:easylearn@127.0.0.1:5433/easylearn_test";
process.env.AI_PROVIDER ??= "mock";

// Browser APIs jsdom lacks (only relevant for component tests).
if (typeof window !== "undefined") {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  const w = window as unknown as Record<string, unknown>;
  w.IntersectionObserver ??= NoopObserver;
  w.ResizeObserver ??= NoopObserver;
  w.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
}
