import type { JobType } from "../queue";
import { coverHandler } from "./cover";
import { lessonPlanHandler } from "./lessonPlan";
import { outlineHandler } from "./outline";
import { reshapeHandler, steerHandler } from "./rewrite";
import { sectionHandler } from "./section";
import type { JobHandler } from "./types";
import { widgetHandler } from "./widget";

export const handlers: Record<JobType, JobHandler> = {
  outline: outlineHandler,
  cover: coverHandler,
  reshape: reshapeHandler,
  steer: steerHandler,
  lesson_plan: lessonPlanHandler,
  section: sectionHandler,
  widget: widgetHandler,
};
