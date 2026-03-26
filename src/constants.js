export const ROOT = process.cwd();
export const PROJECTS_DIR = `${ROOT}/projects`;
export const CACHE_DIR = `${ROOT}/.cache`;
export const CACHE_FILE = `${CACHE_DIR}/project-index.json`;

export const ALLOWED_STATUS = new Set([
  "idea",
  "planning",
  "active",
  "blocked",
  "done"
]);

export const ENABLE_AUTO_COMMIT = process.env.ENABLE_AUTO_COMMIT === "true";
