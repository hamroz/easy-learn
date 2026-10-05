process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? "postgres://easylearn:easylearn@127.0.0.1:5433/easylearn_test";
process.env.AI_PROVIDER ??= "mock";
