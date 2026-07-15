# Ed-Fi SDK MCP Server (Python)

Python port of the [Ed-Fi SDK MCP Server](../src) — a Model Context Protocol
server for exploring Ed-Fi Data Standard OpenAPI specifications: searching
endpoints and schemas, and generating entity relationship diagrams.

This is a behavioral clone of the TypeScript server in `../src`. The
standalone interactive CLI (`../src/cli.ts`) is not ported here; this package
only implements the MCP server.

## Install

```bash
cd src-py
pip install -e .
```

## Run

```bash
python -m ed_fi_mcp
```

or, after install, via the console script:

```bash
ed-fi-sdk-mcp
```

## Environment Variables

- `ED_FI_CUSTOM_BASE_URL` — override the host used for the built-in Data
  Standard version URLs.
- `ED_FI_CACHE_DIR` — override the OpenAPI spec cache directory (defaults to
  a subdirectory of the system temp directory). Cached specs expire after 1
  hour.

## Development

```bash
pip install -e .
pip install mypy
python -m mypy ed_fi_mcp
```
