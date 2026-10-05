import { runMigrations } from "./migrate";
import { closeDb } from "./client";

runMigrations()
  .then(() => console.log("migrations applied"))
  .finally(closeDb);
