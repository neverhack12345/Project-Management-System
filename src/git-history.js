import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ROOT } from "./constants.js";

const execFileAsync = promisify(execFile);

export async function getProjectHistory(slug, { limit = 10, skip = 0 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 50));
  const safeSkip = Math.max(0, Number(skip) || 0);
  const targetPath = `projects/${slug}`;
  const format = "%H%x1f%an%x1f%ad%x1f%s%x1f";

  const { stdout } = await execFileAsync(
    "git",
    [
      "log",
      "--date=iso-strict",
      `--max-count=${safeLimit}`,
      `--skip=${safeSkip}`,
      `--pretty=format:${format}`,
      "--name-only",
      "--",
      targetPath
    ],
    { cwd: ROOT }
  );

  const lines = stdout.split("\n");
  const commits = [];
  let current = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.includes("\x1f")) {
      if (current) commits.push(current);
      const [sha, author, date, subject] = line.split("\x1f");
      current = { sha, author, date, subject, changedFiles: [] };
    } else if (current) {
      current.changedFiles.push(line.trim());
    }
  }
  if (current) commits.push(current);

  return { commits, limit: safeLimit, skip: safeSkip };
}

export async function getPortfolioActivity({ limit = 30, skip = 0 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 30, 100));
  const safeSkip = Math.max(0, Number(skip) || 0);
  const { stdout } = await execFileAsync(
    "git",
    [
      "log",
      "--date=iso-strict",
      `--max-count=${safeLimit}`,
      `--skip=${safeSkip}`,
      "--pretty=format:%H%x1f%an%x1f%ad%x1f%s",
      "--name-only",
      "--",
      "projects"
    ],
    { cwd: ROOT }
  );
  const lines = stdout.split("\n");
  const events = [];
  let current = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.includes("\x1f")) {
      if (current) events.push(current);
      const [sha, author, date, subject] = line.split("\x1f");
      current = { sha, author, date, subject, changedFiles: [] };
    } else if (current) {
      current.changedFiles.push(line.trim());
    }
  }
  if (current) events.push(current);
  return { events, limit: safeLimit, skip: safeSkip };
}
