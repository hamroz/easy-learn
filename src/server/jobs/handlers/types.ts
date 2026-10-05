import type { Job } from "@/server/db/schema";

export interface JobHandler {
  run(job: Job): Promise<void>;
  /** Called once the job has failed for good, to mark the affected entity. */
  onFailed?(job: Job, message: string): Promise<void>;
}
