// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CourseCard } from "@/components/home/CourseCard";

afterEach(cleanup);

describe("CourseCard", () => {
  it("shows a failed single-page item as failed, not as ready", () => {
    const { container } = render(
      <CourseCard
        fonts={["literata"]}
        course={{ id: "c", title: "GPS", subtitle: null, status: "failed", busy: null, theme: null, coverSvg: null, lessonCount: 0, completedCount: 0, next: null, format: "explainer" }}
      />,
    );
    expect(container.textContent).toMatch(/went wrong/);
  });
});
