import { ALLOWED_STATUS } from "../src/constants.js";
import { loadAllProjects, isIsoDate } from "../src/markdown-store.js";

const requiredProjectFields = [
  "slug",
  "name",
  "status",
  "owner",
  "startDate",
  "dueDate",
  "lastUpdated",
  "nextAction"
];

const errors = [];
const projects = await loadAllProjects();

for (const project of projects) {
  for (const field of requiredProjectFields) {
    if (!project[field]) {
      errors.push(`${project.slug}: missing field "${field}" in README frontmatter`);
    }
  }
  if (!ALLOWED_STATUS.has(project.status)) {
    errors.push(`${project.slug}: invalid status "${project.status}"`);
  }
  for (const key of ["startDate", "dueDate", "lastUpdated"]) {
    if (project[key] && !isIsoDate(project[key])) {
      errors.push(`${project.slug}: ${key} is not ISO YYYY-MM-DD`);
    }
  }
  for (const ms of project.milestones) {
    if (!ms.id || !ms.name) errors.push(`${project.slug}: milestone missing id or name`);
    if (!ALLOWED_STATUS.has(ms.status)) {
      errors.push(`${project.slug}: milestone ${ms.id} invalid status "${ms.status}"`);
    }
    if (ms.startDate && !isIsoDate(ms.startDate)) {
      errors.push(`${project.slug}: milestone ${ms.id} startDate invalid`);
    }
    if (ms.dueDate && !isIsoDate(ms.dueDate)) {
      errors.push(`${project.slug}: milestone ${ms.id} dueDate invalid`);
    }
  }

  const idSet = new Set(project.milestones.map((ms) => ms.id));
  for (const ms of project.milestones) {
    for (const dep of ms.dependsOn || []) {
      const localDep = dep.includes(":") ? dep.split(":")[1] : dep;
      if (!idSet.has(localDep) && !dep.includes(":")) {
        errors.push(`${project.slug}: milestone ${ms.id} dependsOn missing local milestone ${dep}`);
      }
    }
  }
}

if (!projects.length) {
  console.log("No projects found in projects/.");
  process.exit(0);
}

if (!errors.length) {
  console.log(`Validation passed for ${projects.length} project(s).`);
  process.exit(0);
}

console.error("Validation failed:");
for (const error of errors) console.error(`- ${error}`);
process.exit(1);
