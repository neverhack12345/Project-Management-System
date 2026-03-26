import { processIncomingEvents } from "../src/intake-automation.js";

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx === -1 ? fallback : process.argv[idx + 1] || fallback;
}

const dryRun = process.argv.includes("--dryRun");
const maxEvents = Math.max(0, Number(arg("maxEvents", "25")) || 25);

const result = await processIncomingEvents({ dryRun, maxEvents });
console.log(JSON.stringify(result, null, 2));
