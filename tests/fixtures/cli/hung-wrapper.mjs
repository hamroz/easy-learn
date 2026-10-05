#!/usr/bin/env node
// A wrapper whose child keeps stdout open and ignores SIGTERM (like an npm shim around a native binary).
// Prints the grandchild's pid on stderr so tests can check it was cleaned up.
import { spawn } from "node:child_process";
const child = spawn(process.execPath, ["-e", "process.on('SIGTERM',()=>{}); setInterval(()=>{}, 1000)"], { stdio: ["ignore", "inherit", "inherit"] });
process.stderr.write(`grandchild:${child.pid}\n`);
setInterval(() => {}, 1000);
