export const ROOT = process.cwd();
export const PROJECTS_DIR = `${ROOT}/projects`;
export const VAULT_DIR = `${ROOT}/vault`;
export const CACHE_DIR = `${ROOT}/.cache`;
export const CACHE_FILE = `${CACHE_DIR}/project-index.json`;
export const VAULT_GRAPH_CACHE = `${CACHE_DIR}/vault-graph.json`;

export const ALLOWED_STATUS = new Set([
  "idea",
  "planning",
  "active",
  "blocked",
  "done"
]);

export const ENABLE_AUTO_COMMIT = process.env.ENABLE_AUTO_COMMIT === "true";
