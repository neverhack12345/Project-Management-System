import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const REPORTS_DIR = path.join(process.cwd(), "reports");
const STATE_PATH = path.join(REPORTS_DIR, "ops-state.json");
const LOCK_PATH = path.join(REPORTS_DIR, "ops-state.lock");
const COOLDOWN_MS = 5 * 60 * 1000;

let lastCheckMs = 0;
let runningPromise = null;

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey() {
  return new Date().toISOString().slice(0, 7);
}

function mondayOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  return date.toISOString().slice(0, 10);
}

async function ensureReportsDir() {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
}

export async function readOpsState() {
  await ensureReportsDir();
  try {
    const raw = await fs.readFile(STATE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {
      lastDailyRun: "",
      lastWeeklyRun: "",
      lastMonthlyRun: "",
      lastRunStatus: "never",
      lastRunError: "",
      lastRunAt: "",
      lastRunSource: "",
      lastRunTasks: []
    };
  }
}

async function writeOpsState(next) {
  await ensureReportsDir();
  await fs.writeFile(STATE_PATH, JSON.stringify(next, null, 2), "utf8");
}

async function acquireLock() {
  await ensureReportsDir();
  try {
    const handle = await fs.open(LOCK_PATH, "wx");
    await handle.close();
    return true;
  } catch {
    return false;
  }
}

async function releaseLock() {
  await fs.rm(LOCK_PATH, { force: true });
}

async function runScript(script) {
  const scriptPath = path.join(process.cwd(), "scripts", script);
  const { stdout, stderr } = await execFileAsync("node", [scriptPath], { cwd: process.cwd() });
  return { script, stdout, stderr };
}

function dueTasks(state) {
  const now = new Date();
  const tasks = [];
  const today = todayDate();
  const thisMonday = mondayOfWeek(now);
  const thisMonth = monthKey();

  if (state.lastMonthlyRun !== thisMonth) {
    tasks.push("migrate-schema.mjs", "build-search-index.mjs");
  }
  if (now.getDay() === 1 && state.lastWeeklyRun !== thisMonday) {
    tasks.push("impact-check.mjs", "pr-summary.mjs");
  }
  if (state.lastDailyRun !== today) {
    tasks.push("validate.mjs", "alerts.mjs", "weekly-review.mjs", "snapshot.mjs");
  }
  return Array.from(new Set(tasks));
}

export async function runDueOps({ source = "web" } = {}) {
  const nowMs = Date.now();
  if (nowMs - lastCheckMs < COOLDOWN_MS) return readOpsState();
  if (runningPromise) return runningPromise;

  runningPromise = (async () => {
    lastCheckMs = nowMs;
    const lock = await acquireLock();
    if (!lock) return readOpsState();

    const state = await readOpsState();
    const tasks = dueTasks(state);
    if (!tasks.length) {
      await releaseLock();
      return state;
    }

    const next = { ...state };
    try {
      const results = [];
      for (const task of tasks) {
        results.push(await runScript(task));
      }
      const now = new Date();
      next.lastDailyRun = todayDate();
      if (now.getDay() === 1) next.lastWeeklyRun = mondayOfWeek(now);
      next.lastMonthlyRun = monthKey();
      next.lastRunStatus = "ok";
      next.lastRunError = "";
      next.lastRunAt = now.toISOString();
      next.lastRunSource = source;
      next.lastRunTasks = tasks;
      await writeOpsState(next);
      await releaseLock();
      return next;
    } catch (error) {
      next.lastRunStatus = "error";
      next.lastRunError = error.message || String(error);
      next.lastRunAt = new Date().toISOString();
      next.lastRunSource = source;
      next.lastRunTasks = tasks;
      await writeOpsState(next);
      await releaseLock();
      return next;
    }
  })();

  const result = await runningPromise;
  runningPromise = null;
  return result;
}
