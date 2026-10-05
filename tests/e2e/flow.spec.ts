import { expect, test } from "@playwright/test";

/**
 * The whole owner journey against the mock provider:
 * setup → create course → edit outline → start → read → select text → ask → highlight survives reload.
 */
test("owner can create a course, read a lesson and ask about a passage", async ({ page }) => {
  // Owner setup (registration closes afterwards).
  await page.goto("/setup?token=e2e-token");
  await page.getByLabel("Email").fill("owner@e2e.test");
  await page.getByLabel("Password").fill("a-long-e2e-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "What do you want to learn?" })).toBeVisible();

  // Create a course.
  await page.getByLabel("What do you want to learn?").fill("Special relativity");
  await page.getByRole("button", { name: "Create course" }).click();
  await expect(page.getByLabel("Lesson 1 title")).toHaveValue("Where the story begins");

  // Edit the outline, then start.
  await page.getByLabel("Lesson 1 title").fill("Where it all begins");
  await page.getByRole("button", { name: "Start learning" }).click();
  await page.getByRole("link", { name: /Begin · Lesson 1/ }).click();

  // The lesson is written section by section.
  await expect(page.getByRole("heading", { name: "Where it all begins", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A question to start with" })).toBeVisible();
  await expect(page.getByText("How much time stretches")).toBeVisible();

  // Select a phrase and ask about it.
  const para = page.locator('p[data-block-id="s0p1"]');
  await para.scrollIntoViewIfNeeded();
  await para.evaluate((el) => {
    const text = el.firstChild!;
    const range = document.createRange();
    range.setStart(text, 8);
    range.setEnd(text, 24);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    document.dispatchEvent(new MouseEvent("mouseup"));
  });
  await page.getByRole("toolbar", { name: "Selection actions" }).getByRole("button", { name: "Ask" }).click();
  const popover = page.getByRole("dialog", { name: "Ask about this passage" });
  await popover.getByLabel("Your question").fill("What does this mean?");
  await popover.getByLabel("Your question").press("Enter");
  await expect(popover.getByText("Good question.")).toBeVisible();
  await popover.getByRole("button", { name: "Close" }).click();

  // After a reload the passage is still highlighted and listed under "My questions".
  await page.reload();
  await expect(page.getByRole("button", { name: /My questions 1/ })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (CSS as unknown as { highlights: Map<string, Set<Range>> }).highlights.get("el-thread")?.size ?? 0))
    .toBe(1);
});
