import { deleteProject } from "../src/markdown-store.js";

function arg(name, fallback = "") {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] || fallback;
}

const slug = arg("slug");
const confirmSlug = arg("confirm-slug");

if (!slug || !confirmSlug) {
  console.error('Usage: node scripts/project-delete.mjs --slug <slug> --confirm-slug <same-as-slug>');
  process.exit(1);
}

try {
  const result = await deleteProject(slug, { confirmSlug });
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(e.message || String(e));
  process.exit(1);
}
