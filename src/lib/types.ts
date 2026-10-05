import type { CourseView, LessonView } from "@/server/services/courses";

/** JSON-serialised shapes passed from server components to client components. */
type Jsonify<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Jsonify<U>[]
    : T extends object
      ? { [K in keyof T]: Jsonify<T[K]> }
      : T;

export type CourseViewJson = Jsonify<CourseView>;
export type LessonViewJson = Jsonify<LessonView>;
export type ThreadJson = LessonViewJson["threads"][number];
export type VariantJson = LessonViewJson["variants"][number];
export type SectionJson = LessonViewJson["sections"][number];
