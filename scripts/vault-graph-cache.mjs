import fs from "node:fs/promises";
import { CACHE_DIR, VAULT_GRAPH_CACHE } from "../src/constants.js";
import { buildVaultIndex } from "../src/vault-store.js";

const index = await buildVaultIndex();
await fs.mkdir(CACHE_DIR, { recursive: true });
await fs.writeFile(
  VAULT_GRAPH_CACHE,
  JSON.stringify({ generatedAt: index.generatedAt, graph: index.graph }, null, 2),
  "utf8"
);
console.log(`Wrote ${VAULT_GRAPH_CACHE} (${index.graph.nodes.length} nodes, ${index.graph.edges.length} edges).`);
