import fs from "node:fs/promises";
import path from "node:path";
import { PROJECTS_DIR } from "../src/constants.js";

function arg(name, fallback = "") {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] || fallback;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const name = arg("name");
const owner = arg("owner", "unassigned");
const days = Number(arg("dueDays", "30"));

if (!name) {
  console.error('Usage: npm run new:project -- --name "Project Name" --owner "you" [--dueDays 30]');
  process.exit(1);
}

const slug = slugify(name);
const today = new Date();
const due = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
const todayStr = today.toISOString().slice(0, 10);
const dueStr = due.toISOString().slice(0, 10);

const templateDir = path.join(process.cwd(), "templates", "project");
const targetDir = path.join(PROJECTS_DIR, slug);
await fs.mkdir(targetDir, { recursive: true });

for (const file of ["README.md", "spec.md", "research.md", "milestones.md", "tasks.md"]) {
  const source = path.join(templateDir, file);
  const target = path.join(targetDir, file);
  let content = await fs.readFile(source, "utf8");
  content = content
    .replaceAll("{{slug}}", slug)
    .replaceAll("{{name}}", name)
    .replaceAll("{{owner}}", owner)
    .replaceAll("{{today}}", todayStr)
    .replaceAll("{{dueDate}}", dueStr);
  await fs.writeFile(target, content, "utf8");
}

console.log(`Created project at projects/${slug}`);
