import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgres://easylearn:easylearn@127.0.0.1:5433/easylearn_e2e";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", ...devices["Desktop Chrome"] },
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      DATABASE_URL,
      APP_ORIGIN: `http://localhost:${PORT}`,
      SETUP_TOKEN: "e2e-token",
      AI_PROVIDER: "mock",
      MOCK_DELAY_MS: "60",
      AI_CONCURRENCY: "3",
    },
  },
});
