import { loadAllProjects } from "../src/markdown-store.js";

function argDays() {
  const idx = process.argv.indexOf("--days");
  if (idx === -1) return 14;
  return Number(process.argv[idx + 1] || 14);
}

const days = argDays();
const projects = await loadAllProjects();

if (!projects.length) {
  console.log("No projects found.");
  process.exit(0);
}

const now = Date.now();
const staleMs = days * 24 * 60 * 60 * 1000;
const stale = projects.filter((project) => {
  const d = new Date(project.lastUpdated || project.modifiedAt).getTime();
  return now - d > staleMs;
});

if (!stale.length) {
  console.log(`No stale projects older than ${days} days.`);
  process.exit(0);
}

console.log(`Stale projects (>${days} days):`);
for (const project of stale) {
  console.log(`- ${project.slug} | status=${project.status} | lastUpdated=${project.lastUpdated}`);
}
