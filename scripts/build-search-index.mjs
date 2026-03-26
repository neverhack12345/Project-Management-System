import fs from "node:fs/promises";
import path from "node:path";
import { loadAllProjects } from "../src/markdown-store.js";

const projects = await loadAllProjects();
const docs = [];
for (const project of projects) {
  for (const file of ["README.md", "spec.md", "research.md", "tasks.md", "milestones.md"]) {
    try {
      const p = path.join(project.path, file);
      const content = await fs.readFile(p, "utf8");
      docs.push({ slug: project.slug, file, content: content.slice(0, 8000) });
    } catch {}
  }
}
await fs.mkdir(".cache", { recursive: true });
await fs.writeFile(".cache/search-index.json", JSON.stringify({ generatedAt: new Date().toISOString(), docs }, null, 2), "utf8");
console.log(`Indexed ${docs.length} document(s).`);
