import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const projectsDir = path.join(process.cwd(), "projects");
const entries = await fs.readdir(projectsDir, { withFileTypes: true }).catch(() => []);
let updated = 0;

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const readmePath = path.join(projectsDir, entry.name, "README.md");
  try {
    const raw = await fs.readFile(readmePath, "utf8");
    const parsed = matter(raw);
    if (!parsed.data.schemaVersion) {
      parsed.data.schemaVersion = 1;
      await fs.writeFile(readmePath, matter.stringify(parsed.content, parsed.data), "utf8");
      updated += 1;
    }
  } catch {}
}

console.log(`Schema migration complete. Updated ${updated} project(s).`);
