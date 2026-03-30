# AGENTS.md — Using the Ed‑Fi SDK MCP Server

This document is a ready-to-drop `AGENTS.md` for other repositories that want to integrate or instruct AI assistants and developer workflows to use the Ed‑Fi SDK MCP Server. It explains quick-start steps, environment configuration, CLI usage, example workflows, and common troubleshooting tips.

**Overview**
- **Purpose:** Provide instructions for using the Ed‑Fi SDK MCP Server to explore Ed‑Fi OpenAPI specifications, discover endpoints and schemas, and generate schema visualizations.
- **Run Modes:** Use the shipped CLI via `npx ed-fi-sdk-mcp` for quick usage, `npm run cli:dev` for local development, or install the package globally.

**Prerequisites**
- **Node:** Install Node.js (LTS recommended).
- **npm:** `npm` comes with Node.js; or use `yarn`/`pnpm` if preferred.
- **Network:** Outbound HTTP(s) access to the Ed‑Fi OpenAPI URLs or an accessible `swagger.json` for custom instances.

**Install & Run (Quick Start)**
- **Run with npx:** Run the server on-demand (recommended for other repos):

```bash
npx ed-fi-sdk-mcp
```

- **Run locally (repo clone):**

```bash
git clone https://github.com/Ed-Fi-Exchange-OSS/Ed-Fi-SDK-MCP.git
cd Ed-Fi-SDK-MCP
npm install
# Development (no build):
npm run cli:dev
# Production-like (build then run):
npm run cli
```

**Environment Variables**
- **ED_FI_CUSTOM_BASE_URL:** Override the base URL used for the standard version OpenAPI resource URLs. Example:

```bash
ED_FI_CUSTOM_BASE_URL=https://my-edfi.example.org/v7.3 npx ed-fi-sdk-mcp
```

- **ED_FI_CACHE_DIR:** Change the cache directory (default uses the system temp dir):

```bash
ED_FI_CACHE_DIR=/home/user/.cache/ed-fi npx ed-fi-sdk-mcp
```

**CLI Workflow & Examples**
Start the CLI and use these commands at the `ed-fi>` prompt.
- **List versions:**

```
versions
```

- **Load a standard version:**

```
version 5.2
```

- **Load a custom OpenAPI spec:**

```
custom https://your-edfi.org/api/metadata/data/v3/resources/swagger.json "My Ed-Fi" 
```

- **Search endpoints:**

```
search endpoints student
```

- **Get endpoint details:**

```
endpoint /ed-fi/students GET
```

- **Search schemas:**

```
search schemas Student
```

- **Get schema details:**

```
schema edfi_student
```

- **Generate a diagram (Mermaid):**

```
diagram mermaid student school
```

- **Export diagram as PlantUML to file:**

```
export plantuml student-entities.puml
```

**AI Assistant Integration Examples**
Use `npx ed-fi-sdk-mcp` as the MCP server command for AI tools that support external MCP servers.

- **Claude Desktop** (example config snippet):

```json
{
  "mcpServers": {
    "ed-fi-data-standard": {
      "command": "npx",
      "args": ["ed-fi-sdk-mcp"],
      "env": {}
    }
  }
}
```

- **VS Code (Cline)**:

- **Command:** `npx ed-fi-sdk-mcp`
- **Transport:** `stdio`

- **GitHub Copilot Chat (workspace `.vscode/mcp.json`)**:

```json
{
 "servers": {
  "ed-fi-sdk-mcp": {
   "type": "stdio",
   "command": "npx",
   "args": ["ed-fi-sdk-mcp"]
  }
 },
 "inputs": []
}
```

- **Continue.dev** (snippet):

```json
{
  "mcp": {
    "servers": {
      "ed-fi-data-standard": {
        "command": "npx",
        "args": ["ed-fi-sdk-mcp"]
      }
    }
  }
}
```

- **Cursor:** Register `npx ed-fi-sdk-mcp` under Cursor's MCP servers UI.

Notes:
- These configurations make the Ed‑Fi context (endpoints, schemas, diagrams) available to the assistant so it can provide richer, schema-aware suggestions.
- If you run into permission or network issues, prefer hosting a local copy of your `swagger.json` and use the `custom` CLI command.

**Programmatic / CI Usage**
- Use `npx ed-fi-sdk-mcp` as a short-lived tool in CI to fetch and export diagrams or to run automated schema checks.
- Example: export a Mermaid diagram in a CI step, commit to docs:

```bash
# run the CLI non-interactively by piping commands
printf "version 5.2
export mermaid docs/edfi-diagram.md
exit
" | npx ed-fi-sdk-mcp
```

**Custom/OpenAPI Privately Hosted**
- If your Ed‑Fi API is hosted behind auth or firewalls, publish a copy of the API spec (swagger.json) to a location accessible from where you run the MCP, then run:

```
custom https://internal.example.org/swagger.json "Internal Ed-Fi"
```

- Alternatively, download the JSON locally and use a `file://` URL or host it briefly via a simple HTTP server and point `custom` at that address.

**Caching & TTL**
- The MCP caches downloaded OpenAPI specs in `ED_FI_CACHE_DIR` or the system temp directory by default.
- Cache TTL is roughly 1 hour (the CLI prefers cached specs when recent).

**Troubleshooting**
- **Network timeouts:** Increase network reliability or download the `swagger.json` and use `custom`.
- **Spec parsing errors:** Verify the `swagger.json` is valid JSON and conforms to OpenAPI expected structure.
- **Large outputs:** Diagram exports cap entity counts (`maxEntities`) to reasonable defaults—adjust by using the CLI's `diagram` options.
- **Permission errors:** Ensure the running user can write to `ED_FI_CACHE_DIR` if set.

**Best Practices**
- **Development:** Use `npm run cli:dev` when actively iterating on diagrams or the CLI.
- **Documentation:** Commit exported Mermaid diagrams into your repo docs (GitHub/GitLab render Mermaid).
- **Security:** Do not publish private `swagger.json` files to public locations.

**Reference & Links**
- **Upstream repo:** https://github.com/Ed-Fi-Exchange-OSS/Ed-Fi-SDK-MCP
- **Ed‑Fi Docs:** https://docs.ed-fi.org/

**License**
- Follow the upstream repository's license (Apache‑2.0).

---

If you want, I can also add this `AGENTS.md` to another repository (provide path or repo), or create a trimmed copy for direct inclusion into a CONTRIBUTING or docs site.