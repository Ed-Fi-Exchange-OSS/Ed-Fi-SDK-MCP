# Design: Python port of the Ed-Fi SDK MCP server

## Goal

Produce a behavioral clone of the JavaScript/TypeScript MCP server in `src/`
(excluding the standalone `cli.ts` REPL) as Python, under a new `src-py/`
directory. Same tools, same prompts, same schemas, same cache behavior —
different language.

## Scope

In scope: `src/index.ts` (server + tool/prompt handlers), `src/diagram-generator.ts`,
`src/domains/*.ts` (domain reference data for versions 4.0, 5.0, 5.1, 5.2).

Out of scope: `src/cli.ts` (interactive terminal REPL) — not ported.

## Package layout

```
src-py/
  pyproject.toml
  ed_fi_mcp/
    __init__.py
    __main__.py
    server.py
    diagram_generator.py
    domains/
      __init__.py
      types.py
      v4_0.py
      v5_0.py
      v5_1.py
      v5_2.py
```

## Component mapping

- **MCP protocol**: official `mcp` Python SDK (`mcp.server.lowlevel.Server`),
  confirmed against the installed package (v1.x) rather than assumed:
  - `@server.list_tools()` / `@server.call_tool()` / `@server.list_prompts()` /
    `@server.get_prompt()` decorators replace the TS
    `setRequestHandler(XRequestSchema, ...)` calls.
  - `call_tool` handlers have signature `async def handler(name: str, arguments: dict) -> list[types.TextContent]`
    and may return an iterable of content blocks directly (no wrapper dict
    needed) — the SDK builds the `CallToolResult` itself.
  - `get_prompt` handlers have signature `async def handler(name: str, arguments: dict | None) -> types.GetPromptResult`,
    with `types.GetPromptResult(description=..., messages=[types.PromptMessage(role=..., content=types.TextContent(type="text", text=...))])`.
  - Errors: there is no `ErrorCode` enum class. Use the module-level int
    constants `mcp.types.INVALID_PARAMS`, `INVALID_REQUEST`,
    `METHOD_NOT_FOUND`, `INTERNAL_ERROR`, and raise
    `mcp.types.McpError(mcp.types.ErrorData(code=..., message=...))`
    (constructor takes a single `ErrorData`, not positional `(code, message)`).
  - `mcp.server.stdio.stdio_server()` is an async context manager yielding
    `(read_stream, write_stream)`, replacing `StdioServerTransport`. Call
    `server.run(read_stream, write_stream, server.create_initialization_options())`.
- **HTTP + caching**: `httpx.AsyncClient` replaces `axios` for downloading
  OpenAPI specs. Config mirrors the TS `ServerConfig`:
  - `ED_FI_CUSTOM_BASE_URL` (optional): overrides the host portion of the
    built-in version URLs, same regex-substitution behavior as
    `index.ts` lines 1330-1332 (`https://api.ed-fi.org/<segment>` → custom
    base), applied only in `set_data_standard_version`, not in
    `set_custom_data_standard_url`.
  - `ED_FI_CACHE_DIR` (optional, defaults to
    `tempfile.gettempdir()/ed-fi-mcp-cache`): cache directory.
  - Cache file per URL: `re.sub(r'[^a-zA-Z0-9]', '_', url) + '.json'`, 1-hour
    TTL check on file mtime, same as `loadFromCache`/`saveToCache`.
- **Domain data**: `DOMAIN_DATA_4_0`/`5_0`/`5_1`/`5_2` become plain Python
  `list[dict]` literals — pure data, ported 1:1, no behavior.
- **DiagramGenerator**: Python class mirroring the full public surface of the
  TS class, not just what `index.ts` currently calls: `analyze_openapi_spec`,
  `generate_diagram` (mermaid/plantuml/graphviz), `get_entity_details`,
  `get_entity_relationships`, `get_entities_by_domain`, `get_stats`.
  `Map`/array state becomes `dict`/`list`. The TS `index.ts` reaches into the
  generator's private `relationships` array via bracket-notation
  (`this.diagramGenerator['relationships']`, line 1774) to implement
  `list_entity_relationships` — since Python has no real private fields, the
  Python `server.py` will instead call the generator's existing public
  `get_entity_relationships(entity_name)` when filtering by entity, and fall
  back to reading the generator's `relationships` list attribute directly
  (which is not underscore-prefixed, so this is an intentional, ordinary
  attribute read, not a hack) when no entity filter is given.
- **Tools & prompts**: all 11 tools (`set_data_standard_version`,
  `set_custom_data_standard_url`, `list_available_versions`,
  `search_endpoints`, `get_endpoint_details`, `search_schemas`,
  `get_schema_details`, `generate_entity_diagram`, `list_entity_relationships`,
  `get_entities_by_domain`, `export_diagram_as_text`) and all 4 prompts
  (`ed-fi-help-and-usage`, `ed-fi-auth-discovery-guide`,
  `ed-fi-api-quickstart`, `ed-fi-data-validation`) keep identical names,
  descriptions, input schemas, and response text to the TS version.

## Entry point

`python -m ed_fi_mcp` (via `ed_fi_mcp/__main__.py`) runs the stdio server,
equivalent to `node dist/index.js`. `pyproject.toml` also declares a
`ed-fi-sdk-mcp` console-script entry point.

## Testing

Manual smoke test: run the server, exercise `list_available_versions` and
`set_data_standard_version` against a live Ed-Fi metadata URL, confirm tool
list/schemas match the TS server.

## Non-goals

No feature changes, no new tools, no packaging/publishing to PyPI in this pass.
