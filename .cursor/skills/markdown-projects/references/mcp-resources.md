# MCP resources vs local reference

When the MCP server is connected, these URIs return content. The matching **local snapshot** in this folder is listed for offline reading inside the skill.

| MCP resource URI | Local duplicate |
|------------------|-----------------|
| `resource://schema` | [schema.md](./schema.md) |
| `resource://docs/crud` | [crud-reference.md](./crud-reference.md) |
| `resource://readme` | [readme.md](./readme.md) |

Also available from the server but not always duplicated here: `resource://scripts`, `resource://reports/latest-weekly`, `resource://reports/alerts` (see [mcp-tool-reference.md](./mcp-tool-reference.md)).
