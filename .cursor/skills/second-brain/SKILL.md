---
name: second-brain
description: >-
  Manages the Obsidian-style vault under vault/: markdown notes, wiki [[links]], Mermaid and Excalidraw
  embeds, backlinks, graph cache. Uses MCP vault_* tools (vault_list_tree, vault_get_note,
  vault_create_note, vault_update_note, vault_delete_note, vault_move_note), HTTP /api/vault/* when
  npm run dev is running, and npm run vault:crud without a server. Use when the user mentions notes,
  knowledge base, vault, backlinks, notes.html, or personal wiki. Not for projects/ task boards — use
  the markdown-projects skill.
compatibility: >-
  Node.js 18+ and npm at repo root. MCP stdio optional. npm run dev optional for /notes.html and
  /api/vault/*. vault:crud CLI works without the HTTP server.
metadata:
  skill-spec: https://agentskills.io/specification
  repository-domain: vault
---

# Second brain (vault)

Follow [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices): default to MCP `vault_*` tools; open **`references/REFERENCE.md`** when you need exact HTTP routes, CLI flags, or long examples.

## Instructions

1. **Paths** — Vault-relative, forward slashes (e.g. `Concepts/Idea.md`). No `..`. Writable leaves: `.md`, `.mmd`, `.mermaid`. Details: [`references/source-index.md`](references/source-index.md) → `src/vault-store.js`.
2. **Default tooling** — `vault_list_tree` → `vault_get_note` / `vault_create_note` / `vault_update_note` (full file source, including frontmatter) / `vault_move_note` / `vault_delete_note`.
3. **HTTP** — With `npm run dev`: `/notes.html`; `GET|POST|PUT|DELETE /api/vault/file`, `POST /api/vault/move`, tree/search/graph/backlinks — see [`references/source-index.md`](references/source-index.md) → `src/server.js`.
4. **CLI without server** — `npm run vault:crud` — subcommands in [`references/cli-ops-reference.md`](references/cli-ops-reference.md).
5. **Graph cache** — After large link changes, `npm run vault:graph` refreshes `.cache/vault-graph.json`. Embeds: [`references/readme.md`](references/readme.md) (vault section).
6. **CRUD map** — [`references/crud-reference.md`](references/crud-reference.md) or MCP `resource://docs/crud`.

## Examples

- Create: `vault_create_note` — `path`: `"Journal/2026-03-29.md"`, `title`: `"Daily"`, optional `content` with `[[Welcome]]`.
- Move: `vault_move_note` — `from`: `"Inbox/Note.md"`, `to`: `"Archive/Note.md"`.

## Gotchas

- **`vault_create_note`** targets new `.md` notes (see store); `.mmd`/`.mermaid` creation must follow the same path rules as in `vault-store`.
- **`vault_update_note`** replaces the **entire** file body — include frontmatter in `content` if the note uses it.
- **Case sensitivity** — Paths are normalized to forward slashes; on case-insensitive disks, duplicate paths differing only by case can collide.

## Boundaries

`projects/`, task boards, and portfolio MCP tools belong to **[markdown-projects](../markdown-projects/SKILL.md)**.

## References

- **[references/REFERENCE.md](references/REFERENCE.md)** — when to load each duplicated doc (progressive disclosure).
- **Related skill:** [markdown-projects](../markdown-projects/SKILL.md).

Spec: [agentskills.io/specification](https://agentskills.io/specification). Optional validator: [`skills-ref validate`](https://github.com/agentskills/agentskills/tree/main/skills-ref).
