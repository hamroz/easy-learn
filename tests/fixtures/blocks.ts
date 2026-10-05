export const svg = '<svg viewBox="0 0 10 10"><circle id="c" cx="5" cy="5" r="4"/></svg>';

export const everyBlock = [
  { type: "paragraph", id: "p1", md: "Light is **fast**." },
  { type: "heading", id: "h1", text: "A thought experiment" },
  { type: "callout", id: "c1", variant: "analogy", title: "Like a train", md: "Imagine..." },
  { type: "math", id: "m1", tex: "E = mc^2" },
  { type: "list", id: "l1", ordered: true, items: ["one", "two"] },
  { type: "quote", id: "q1", md: "Imagination is more important than knowledge.", cite: "Einstein" },
  { type: "code", id: "k1", lang: "python", code: "print(1)" },
  { type: "diagram", id: "d1", svg, steps: [{ label: "Start", show: ["c"] }], caption: "A circle" },
  { type: "scrolly", id: "s1", svg, steps: [{ md: "First", show: ["c"] }, { md: "Second", show: [] }] },
  {
    type: "plot",
    id: "pl1",
    x: { label: "v", min: 0, max: 1 },
    y: { label: "γ", min: 0, max: 10 },
    params: [{ name: "k", label: "k", min: 0, max: 2, value: 1 }],
    curves: [{ expr: "k/sqrt(1-x^2)", label: "γ" }],
  },
  { type: "chart", id: "ch1", kind: "bar", series: [{ name: "s", data: [{ x: "a", y: 1 }, { x: "b", y: 2 }] }] },
  {
    type: "timeline",
    id: "t1",
    events: [
      { date: "1905", title: "Special relativity", md: "..." },
      { date: "1915", title: "General relativity", md: "..." },
    ],
  },
  { type: "formula", id: "f1", tex: "\\htmlClass{p1}{E}=mc^2", parts: [{ id: "p1", label: "Energy", md: "..." }] },
  { type: "compare", id: "cmp1", columns: [{ title: "Newton", md: "a" }, { title: "Einstein", md: "b" }] },
  { type: "cards", id: "cd1", cards: [{ front: "a", back: "b" }, { front: "c", back: "d" }] },
  { type: "reveal", id: "r1", prompt: "What happens?", answer: "It slows." },
  { type: "steps", id: "st1", steps: [{ title: "1", md: "a" }, { title: "2", md: "b", svg }] },
  {
    type: "custom",
    id: "cu1",
    brief: "A light clock on a moving train",
    fallback: { type: "reveal", id: "cu1-fb", prompt: "p", answer: "a" },
  },
];

