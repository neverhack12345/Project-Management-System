import fs from "node:fs/promises";
import {
  buildVaultTree,
  createVaultNote,
  deleteVaultNote,
  ensureVaultDir,
  getVaultFilePayload,
  listVaultTreeRelPaths,
  moveVaultNote,
  writeVaultNote
} from "../src/vault-store.js";

const [, , cmd, ...rest] = process.argv;

function usage() {
  console.error(`Usage (run from repo root):
  node scripts/vault-crud.mjs tree
  node scripts/vault-crud.mjs get --path <vault-relative-path>
  node scripts/vault-crud.mjs create --path <path.md> [--title "T"] [--file <body-file>]
  node scripts/vault-crud.mjs update --path <path> --file <full-source-file>
  node scripts/vault-crud.mjs delete --path <path>
  node scripts/vault-crud.mjs move --from <path> --to <path> [--overwrite]`);
  process.exit(1);
}

function arg(name) {
  const idx = rest.indexOf(`--${name}`);
  if (idx === -1) return "";
  return rest[idx + 1] || "";
}

function hasFlag(name) {
  return rest.includes(`--${name}`);
}

if (!cmd) usage();

try {
  await ensureVaultDir();
  switch (cmd) {
    case "tree": {
      const paths = await listVaultTreeRelPaths();
      console.log(JSON.stringify({ paths, tree: buildVaultTree(paths) }, null, 2));
      break;
    }
    case "get": {
      const path = arg("path");
      if (!path) usage();
      const payload = await getVaultFilePayload(path);
      console.log(JSON.stringify(payload, null, 2));
      break;
    }
    case "create": {
      const path = arg("path");
      if (!path) usage();
      const title = arg("title");
      const file = arg("file");
      let content;
      if (file) {
        content = await fs.readFile(file, "utf8");
      }
      const result = await createVaultNote(path, {
        title: title || undefined,
        content: content !== undefined ? content : undefined
      });
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "update": {
      const path = arg("path");
      const file = arg("file");
      if (!path || !file) usage();
      const content = await fs.readFile(file, "utf8");
      const result = await writeVaultNote(path, content);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "delete": {
      const path = arg("path");
      if (!path) usage();
      const result = await deleteVaultNote(path);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "move": {
      const from = arg("from");
      const to = arg("to");
      if (!from || !to) usage();
      const result = await moveVaultNote(from, to, { overwrite: hasFlag("overwrite") });
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    default:
      usage();
  }
} catch (e) {
  console.error(e.message || String(e));
  if (e.code) console.error("code:", e.code);
  process.exit(1);
}
