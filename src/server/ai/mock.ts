import type { AIProvider, CompleteRequest, ProviderHealth } from "./types";

/**
 * Deterministic offline provider for tests and UI work. Content is plausible but generic;
 * it exercises every block and widget type so the reader can be checked without a real model.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SVG = `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="320" height="160" fill="var(--surface)"/>
  <line x1="20" y1="130" x2="300" y2="130" stroke="var(--muted)" stroke-width="2"/>
  <circle id="ball" cx="60" cy="110" r="18" fill="var(--accent)"/>
  <rect id="box" x="200" y="80" width="60" height="50" rx="6" fill="var(--accent2)"/>
  <path id="arrow" d="M90 110 L180 110" stroke="var(--text)" stroke-width="3" marker-end="url(#head)"/>
  <defs><marker id="head" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--text)"/></marker></defs>
</svg>`;

function outline(topic: string) {
  return {
    title: topic,
    subtitle: `A calm, intuitive introduction to ${topic.toLowerCase()}`,
    language: "en",
    theme: {
      name: "Night observatory",
      mood: "curious, quiet",
      fontPair: "editorial",
      scheme: "light",
      light: { bg: "#f7f5f0", surface: "#ffffff", text: "#1c1b19", muted: "#5e5a52", accent: "#2f5bd3", accent2: "#b4541f", highlight: "#fde68a", border: "#e6e1d8" },
      dark: { bg: "#0f1115", surface: "#171a20", text: "#ebe9e4", muted: "#a19d95", accent: "#8aa4ff", accent2: "#f59e5b", highlight: "#6b5313", border: "#262a33" },
      texture: "dots",
      radius: "soft",
    },
    lessons: [
      { title: "Where the story begins", summary: `What ${topic} is about, and why it surprised everyone.` },
      { title: "The key idea", summary: "The one idea everything else rests on, built from everyday intuition." },
      { title: "Seeing it in action", summary: "Playing with the idea until it feels obvious." },
      { title: "Surprising consequences", summary: "Where the idea leads when we follow it all the way." },
      { title: "Putting it together", summary: "A map of what we learned and where to go next." },
    ],
  };
}

function lessons(prefix: string) {
  return {
    lessons: [
      { title: `${prefix}: a gentler start`, summary: "Rebuilt from the instruction." },
      { title: `${prefix}: the heart of it`, summary: "The central idea, slowly." },
      { title: `${prefix}: in the real world`, summary: "Where it shows up around us." },
    ],
  };
}

function lessonPlan() {
  return {
    sections: [
      { heading: "A question to start with", goal: "Spark curiosity", keyPoints: ["the puzzle"], interactive: "plot" },
      { heading: "Building the picture", goal: "Form a mental model", keyPoints: ["the model"], interactive: "diagram" },
      { heading: "Two ways of seeing", goal: "Contrast old and new views", keyPoints: ["contrast"], interactive: "compare" },
      { heading: "A short history", goal: "Put the idea in context", keyPoints: ["history"], interactive: "timeline" },
    ],
  };
}

function section(position: number) {
  const p = (id: string, md: string) => ({ type: "paragraph", id, md });
  const sets = [
    [
      p("s0p1", "Imagine you are standing on a train platform as a train rushes past. **Everything you know about motion** says that speeds simply add up."),
      p("s0p2", "But light refuses to play along. No matter how fast you move, light always passes you at the same speed, $c \\approx 300{,}000$ km/s."),
      { type: "callout", id: "s0c1", variant: "analogy", title: "An analogy", md: "It is like a runner who is always exactly one step ahead of you, however fast you sprint." },
      {
        type: "plot",
        id: "s0w1",
        title: "How much time stretches",
        x: { label: "speed as a fraction of c", min: 0, max: 0.99 },
        y: { label: "time stretch γ", min: 0, max: 8 },
        params: [{ name: "k", label: "exaggeration", min: 0.5, max: 2, step: 0.1, value: 1 }],
        curves: [{ expr: "k / sqrt(1 - x^2)", label: "γ", color: "accent" }],
        caption: "Drag the slider and watch the curve bend upward near the speed of light.",
      },
      { type: "math", id: "s0m1", tex: "\\gamma = \\frac{1}{\\sqrt{1 - v^2/c^2}}" },
    ],
    [
      p("s1p1", "Let us build a picture of what happens, one step at a time."),
      { type: "diagram", id: "s1w1", svg: SVG, steps: [{ label: "A ball", show: ["ball"] }, { label: "It moves", show: ["ball", "arrow"] }, { label: "It arrives", show: ["ball", "arrow", "box"] }], caption: "Step through the picture." },
      { type: "formula", id: "s1w2", tex: "\\htmlClass{p1}{E} = \\htmlClass{p2}{m}\\htmlClass{p3}{c^2}", parts: [{ id: "p1", label: "Energy", md: "How much *work* something can do." }, { id: "p2", label: "Mass", md: "How much stuff there is." }, { id: "p3", label: "Speed of light, squared", md: "A very large conversion factor." }] },
      { type: "reveal", id: "s1w3", prompt: "Before reading on: what do you think happens to a clock on a fast train?", answer: "It ticks *slower*, as seen from the platform." },
      { type: "list", id: "s1l1", ordered: false, items: ["Speeds do not simply add.", "Light sets the limit.", "Time adapts to keep light's speed fixed."] },
    ],
    [
      p("s2p1", "There are two ways to look at the same situation, and both are right in their own frame."),
      { type: "scrolly", id: "s2w1", svg: SVG, steps: [{ md: "First, notice the ball on the left.", show: ["ball"] }, { md: "Now it starts to move toward the box.", show: ["ball", "arrow"] }, { md: "Finally it reaches the box.", show: ["ball", "arrow", "box"] }] },
      { type: "compare", id: "s2w2", columns: [{ title: "Newton", md: "Time is the same for everyone.", points: ["absolute time", "speeds add"] }, { title: "Einstein", md: "Time depends on how you move.", points: ["relative time", "light speed fixed"] }] },
      { type: "cards", id: "s2w3", cards: [{ front: "Frame of reference", back: "The point of view from which you measure things." }, { front: "Simultaneity", back: "Whether two events happen *at the same time* — which depends on the observer." }] },
      { type: "quote", id: "s2q1", md: "The distinction between past, present and future is only a stubbornly persistent illusion.", cite: "Albert Einstein" },
    ],
    [
      p("s3p1", "The idea did not appear out of nowhere; it grew over decades."),
      { type: "timeline", id: "s3w1", events: [{ date: "1887", title: "Michelson–Morley", md: "No sign of the ether." }, { date: "1905", title: "Special relativity", md: "Einstein's annus mirabilis." }, { date: "1915", title: "General relativity", md: "Gravity becomes geometry." }] },
      { type: "chart", id: "s3w2", kind: "bar", title: "Clock drift per day", yLabel: "microseconds", series: [{ name: "GPS satellite", data: [{ x: "speed", y: -7 }, { x: "gravity", y: 45 }, { x: "total", y: 38 }] }] },
      { type: "steps", id: "s3w3", steps: [{ title: "Send a signal", md: "A satellite sends the time." }, { title: "Receive it", md: "Your phone compares times.", svg: SVG }, { title: "Correct for relativity", md: "Without the correction, GPS drifts ~10 km a day." }] },
      { type: "custom", id: "s3w4", brief: "A light clock on a moving train: a photon bouncing between two mirrors, with a speed slider.", height: 360, fallback: { type: "reveal", id: "s3w4fb", prompt: "Picture a photon bouncing between two mirrors on a moving train.", answer: "From the platform its path is longer, so each tick takes longer." } },
      { type: "code", id: "s3k1", lang: "python", code: "gamma = 1 / (1 - v**2 / c**2) ** 0.5" },
    ],
  ];
  return { blocks: sets[position % sets.length] };
}

const WIDGET_HTML = `<!doctype html><html><body style="margin:0;font-family:system-ui;background:var(--surface);color:var(--text)">
<canvas id="c" width="600" height="300" style="width:100%;height:auto"></canvas>
<script>
const c = document.getElementById('c'), x = c.getContext('2d'); let t = 0;
function draw(){ t += 0.03; x.clearRect(0,0,600,300); x.fillStyle = getComputedStyle(document.body).getPropertyValue('--accent') || '#36c';
x.beginPath(); x.arc(300 + Math.sin(t)*200, 150, 14, 0, 7); x.fill(); requestAnimationFrame(draw); }
draw(); parent.postMessage({ type: 'ready' }, '*');
</script></body></html>`;

const COVER = `<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="400" fill="var(--bg)"/><circle cx="560" cy="180" r="120" fill="var(--accent)" opacity="0.18"/><circle cx="600" cy="220" r="60" fill="var(--accent2)" opacity="0.35"/><path d="M0 320 Q200 240 400 300 T800 280" stroke="var(--accent)" stroke-width="3" fill="none"/></svg>`;

function respond(req: CompleteRequest): string {
  const meta = req.meta ?? {};
  switch (req.task) {
    case "outline":
      return JSON.stringify(outline(String(meta.topic ?? "A new topic")));
    case "reshape":
      return JSON.stringify(lessons("Reshaped"));
    case "steer":
      return JSON.stringify(lessons("Steered"));
    case "lesson_plan":
      return JSON.stringify(lessonPlan());
    case "section":
      return JSON.stringify(section(Number(meta.position ?? 0)));
    case "widget":
      return JSON.stringify({ html: WIDGET_HTML });
    case "cover":
      return JSON.stringify({ svg: COVER });
    case "variant":
      return JSON.stringify({ md: meta.kind === "deeper" ? "A **deeper** version: the same idea, with the mathematics behind it, $t' = \\gamma t$." : "A **simpler** version: moving clocks tick a little slower." });
    case "quiz":
      return JSON.stringify({
        questions: [
          { q: "What stays the same for every observer?", options: ["The speed of light", "Time", "Length"], answer: 0, explanation: "Light's speed is the fixed point everything else adjusts around." },
          { q: "A fast-moving clock, seen from the platform, ticks…", options: ["faster", "slower", "the same"], answer: 1, explanation: "This is time dilation." },
          { q: "γ near the speed of light becomes…", options: ["small", "one", "very large"], answer: 2, explanation: "The curve shoots upward as v approaches c." },
        ],
      });
    case "answer":
      return `Good question. **${meta.quote ?? "This passage"}** means, in plain words: the idea holds because light's speed never changes, so something else — time — has to give. Think of it as the universe keeping one promise and bending the rest to keep it.`;
    case "repair":
      return "{}";
  }
}

export class MockProvider implements AIProvider {
  readonly id = "mock" as const;
  private readonly delayMs: number;
  constructor(opts: { delayMs?: number } = {}) {
    this.delayMs = opts.delayMs ?? Number(process.env.MOCK_DELAY_MS ?? 0);
  }

  async complete(req: CompleteRequest): Promise<string> {
    const text = respond(req);
    if (this.delayMs) await sleep(this.delayMs);
    if (req.onDelta) {
      const parts = text.match(/\S+\s*/g) ?? [text];
      for (const part of parts) {
        if (req.signal?.aborted) break;
        req.onDelta(part);
        if (this.delayMs) await sleep(Math.min(30, this.delayMs / 10));
      }
    }
    return text;
  }

  async listModels() {
    return [{ id: "mock", name: "Sample content", efforts: [] }];
  }

  async health(): Promise<ProviderHealth> {
    return { ok: true, message: "Mock provider (offline, canned content)" };
  }
}
