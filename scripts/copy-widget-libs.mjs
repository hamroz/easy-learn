// Copy the libraries custom widgets may load into public/widget-libs (served same-origin, CORS-enabled).
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "public", "widget-libs");
mkdirSync(out, { recursive: true });

const files = [
  ["node_modules/d3/dist/d3.min.js", "d3.min.js"],
  ["node_modules/three/build/three.module.js", "three.module.js"],
  ["node_modules/three/build/three.core.js", "three.core.js"],
];
for (const [from, name] of files) copyFileSync(path.join(root, from), path.join(out, name));
console.log("widget libs copied to public/widget-libs");
