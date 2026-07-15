"""Ed-Fi Data Standard MCP server."""

from __future__ import annotations

import asyncio
import json
import os
import re
import tempfile
import time
from pathlib import Path
from typing import Any

import httpx
from mcp import McpError, types
from mcp.server.lowlevel import Server
from mcp.server.stdio import stdio_server

from ed_fi_mcp.diagram_generator import DiagramFormat, DiagramGenerator, DiagramOptions

CACHE_TTL_SECONDS = 60 * 60  # 1 hour

DATA_STANDARD_VERSIONS: list[dict[str, str]] = [
    {
        "version": "4.0",
        "url": "https://api.ed-fi.org/v6.2/api/metadata/data/v3/resources/swagger.json",
    },
    {
        "version": "5.0",
        "url": "https://api.ed-fi.org/v7.1/api/metadata/data/v3/resources/swagger.json",
    },
    {
        "version": "5.1",
        "url": "https://api.ed-fi.org/v7.2/api/metadata/data/v3/resources/swagger.json",
    },
    {
        "version": "5.2",
        "url": "https://api.ed-fi.org/v7.3/api/metadata/data/v3/resources/swagger.json",
    },
]

CUSTOM_BASE_URL_PATTERN = re.compile(r"https://api\.ed-fi\.org/[^/]+")


def _text(text: str) -> list[types.TextContent]:
    return [types.TextContent(type="text", text=text)]


def _mcp_error(code: int, message: str) -> McpError:
    return McpError(types.ErrorData(code=code, message=message))


class EdFiMCPServer:
    def __init__(self) -> None:
        self.current_spec: dict[str, Any] | None = None
        self.current_version: str | None = None
        self.current_version_number: str | None = None

        self.custom_base_url: str | None = os.environ.get("ED_FI_CUSTOM_BASE_URL")
        self.cache_dir: str = os.environ.get("ED_FI_CACHE_DIR") or str(
            Path(tempfile.gettempdir()) / "ed-fi-mcp-cache"
        )

        self.diagram_generator = DiagramGenerator()
        self._ensure_cache_directory()

        self.server = Server(
            name="ed-fi-sdk-py",
            version="0.1.0",
            instructions=(
                "This MCP server provides tools for working with Ed-Fi Data Standard "
                "APIs and schemas. Use the available tools to explore endpoints, "
                "schemas, and generate entity relationship diagrams. Four helpful "
                "prompt templates are available: 'ed-fi-help-and-usage' for "
                "comprehensive help and troubleshooting, 'ed-fi-auth-discovery-guide' "
                "for OAuth 2.0 setup, 'ed-fi-api-quickstart' for common operations, "
                "and 'ed-fi-data-validation' for data validation strategies. Start by "
                "setting a data standard version using set_data_standard_version."
            ),
        )

        self._setup_tool_handlers()
        self._setup_prompt_handlers()

    # ------------------------------------------------------------------
    # Cache helpers
    # ------------------------------------------------------------------

    def _ensure_cache_directory(self) -> None:
        os.makedirs(self.cache_dir, exist_ok=True)

    def _get_cache_file_path(self, url: str) -> str:
        filename = re.sub(r"[^a-zA-Z0-9]", "_", url) + ".json"
        return str(Path(self.cache_dir) / filename)

    def _load_from_cache(self, url: str) -> dict[str, Any] | None:
        try:
            cache_file = self._get_cache_file_path(url)
            if os.path.exists(cache_file):
                cache_age = time.time() - os.path.getmtime(cache_file)
                if cache_age < CACHE_TTL_SECONDS:
                    with open(cache_file, encoding="utf-8") as fh:
                        return json.load(fh)
        except Exception:
            # Ignore cache errors, will fetch fresh data
            pass
        return None

    def _save_to_cache(self, url: str, spec: dict[str, Any]) -> None:
        try:
            cache_file = self._get_cache_file_path(url)
            with open(cache_file, "w", encoding="utf-8") as fh:
                json.dump(spec, fh, indent=2)
        except Exception:
            # Ignore cache save errors
            pass

    # ------------------------------------------------------------------
    # Tool handlers
    # ------------------------------------------------------------------

    def _setup_tool_handlers(self) -> None:
        @self.server.list_tools()
        async def list_tools() -> list[types.Tool]:
            return [
                types.Tool(
                    name="set_data_standard_version",
                    description="Set the Ed-Fi Data Standard version to use (4.0, 5.0, 5.1, or 5.2)",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "version": {
                                "type": "string",
                                "enum": ["4.0", "5.0", "5.1", "5.2"],
                                "description": "The Ed-Fi Data Standard version",
                            },
                        },
                        "required": ["version"],
                    },
                ),
                types.Tool(
                    name="set_custom_data_standard_url",
                    description="Set a custom OpenAPI specification URL for the Ed-Fi Data Standard",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "url": {
                                "type": "string",
                                "description": "The URL to the custom OpenAPI specification",
                            },
                            "name": {
                                "type": "string",
                                "description": "A descriptive name for this custom data standard",
                            },
                        },
                        "required": ["url", "name"],
                    },
                ),
                types.Tool(
                    name="list_available_versions",
                    description="List all available Ed-Fi Data Standard versions",
                    inputSchema={"type": "object", "properties": {}},
                ),
                types.Tool(
                    name="search_endpoints",
                    description="Search for API endpoints in the current OpenAPI specification",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search term to find matching endpoints (e.g., 'student', 'school', 'assessment')",
                            },
                        },
                        "required": ["query"],
                    },
                ),
                types.Tool(
                    name="get_endpoint_details",
                    description="Get detailed information about a specific API endpoint",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "The API endpoint path (e.g., '/ed-fi/students')",
                            },
                            "method": {
                                "type": "string",
                                "enum": ["GET", "POST", "PUT", "DELETE"],
                                "description": "HTTP method for the endpoint",
                                "default": "GET",
                            },
                        },
                        "required": ["path"],
                    },
                ),
                types.Tool(
                    name="search_schemas",
                    description="Search for data models/schemas in the current OpenAPI specification",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search term to find matching schemas (e.g., 'Student', 'School', 'Assessment')",
                            },
                        },
                        "required": ["query"],
                    },
                ),
                types.Tool(
                    name="get_schema_details",
                    description="Get detailed information about a specific data model/schema",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "schemaName": {
                                "type": "string",
                                "description": "The name of the schema to get details for",
                            },
                        },
                        "required": ["schemaName"],
                    },
                ),
                types.Tool(
                    name="generate_entity_diagram",
                    description="Generate entity relationship diagrams from the current OpenAPI specification",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "format": {
                                "type": "string",
                                "enum": ["mermaid", "plantuml", "graphviz"],
                                "description": "The diagram format to generate",
                                "default": "mermaid",
                            },
                            "includeProperties": {
                                "type": "boolean",
                                "description": "Whether to include entity properties in the diagram",
                                "default": True,
                            },
                            "includeDescriptions": {
                                "type": "boolean",
                                "description": "Whether to include entity descriptions",
                                "default": False,
                            },
                            "filterDomains": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Filter entities by domain areas (e.g., 'student', 'school', 'assessment')",
                            },
                            "maxEntities": {
                                "type": "number",
                                "description": "Maximum number of entities to include in the diagram",
                                "default": 20,
                            },
                        },
                    },
                ),
                types.Tool(
                    name="list_entity_relationships",
                    description="List relationships between entities in the current OpenAPI specification",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "entityName": {
                                "type": "string",
                                "description": "Optional: Show relationships for a specific entity only",
                            },
                            "relationshipType": {
                                "type": "string",
                                "enum": ["one-to-one", "one-to-many", "many-to-one", "many-to-many"],
                                "description": "Optional: Filter by relationship type",
                            },
                        },
                    },
                ),
                types.Tool(
                    name="get_entities_by_domain",
                    description="Get entities grouped by domain areas (Student, School, Staff, etc.)",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "domain": {
                                "type": "string",
                                "description": "Optional: Get entities for a specific domain only",
                            },
                        },
                    },
                ),
                types.Tool(
                    name="export_diagram_as_text",
                    description="Export a diagram as text that can be rendered by various tools",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "format": {
                                "type": "string",
                                "enum": ["mermaid", "plantuml", "graphviz"],
                                "description": "The diagram format to export",
                                "default": "mermaid",
                            },
                            "filename": {
                                "type": "string",
                                "description": "Optional: Filename to save the diagram text",
                            },
                            "filterDomains": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Filter entities by domain areas",
                            },
                            "maxEntities": {
                                "type": "number",
                                "description": "Maximum number of entities to include",
                                "default": 15,
                            },
                        },
                        "required": ["format"],
                    },
                ),
            ]

        @self.server.call_tool()
        async def call_tool(name: str, arguments: dict[str, Any]) -> list[types.TextContent]:
            arguments = arguments or {}

            if name == "list_available_versions":
                return await self._list_available_versions()

            if name == "set_data_standard_version":
                return await self._set_data_standard_version(arguments.get("version"))

            if name == "set_custom_data_standard_url":
                return await self._set_custom_data_standard_url(
                    arguments.get("url"), arguments.get("name")
                )

            if name == "search_endpoints":
                return await self._search_endpoints(arguments.get("query"))

            if name == "get_endpoint_details":
                return await self._get_endpoint_details(
                    arguments.get("path"), arguments.get("method") or "GET"
                )

            if name == "search_schemas":
                return await self._search_schemas(arguments.get("query"))

            if name == "get_schema_details":
                return await self._get_schema_details(arguments.get("schemaName"))

            if name == "generate_entity_diagram":
                return await self._generate_entity_diagram(arguments)

            if name == "list_entity_relationships":
                return await self._list_entity_relationships(arguments)

            if name == "get_entities_by_domain":
                return await self._get_entities_by_domain(arguments.get("domain"))

            if name == "export_diagram_as_text":
                return await self._export_diagram_as_text(arguments)

            raise _mcp_error(types.METHOD_NOT_FOUND, f"Unknown tool: {name}")

    # ------------------------------------------------------------------
    # Prompt handlers
    # ------------------------------------------------------------------

    def _setup_prompt_handlers(self) -> None:
        @self.server.list_prompts()
        async def list_prompts() -> list[types.Prompt]:
            return [
                types.Prompt(
                    name="ed-fi-help-and-usage",
                    description=(
                        "Comprehensive help and usage guidance for the Ed-Fi SDK MCP "
                        "Server, including commands, examples, troubleshooting, and "
                        "getting started"
                    ),
                ),
                types.Prompt(
                    name="ed-fi-auth-discovery-guide",
                    description=(
                        "A comprehensive guide on how to authenticate with Ed-Fi APIs, "
                        "including OAuth 2.0 setup and best practices for using the "
                        "Discovery API"
                    ),
                ),
                types.Prompt(
                    name="ed-fi-api-quickstart",
                    description=(
                        "Quick start guide for using Ed-Fi APIs, including common "
                        "endpoints and data operations"
                    ),
                ),
                types.Prompt(
                    name="ed-fi-data-validation",
                    description=(
                        "Guidelines for validating Ed-Fi data submissions and "
                        "understanding error responses"
                    ),
                ),
            ]

        @self.server.get_prompt()
        async def get_prompt(name: str, arguments: dict[str, str] | None) -> types.GetPromptResult:
            if name == "ed-fi-help-and-usage":
                return types.GetPromptResult(
                    description="Ed-Fi SDK MCP Server Help and Usage Guide",
                    messages=[
                        types.PromptMessage(
                            role="user",
                            content=types.TextContent(
                                type="text",
                                text=(
                                    "I need help understanding how to use the Ed-Fi SDK "
                                    "MCP Server. Can you provide guidance on commands, "
                                    "examples, and troubleshooting?"
                                ),
                            ),
                        ),
                        types.PromptMessage(
                            role="assistant",
                            content=types.TextContent(
                                type="text", text=self._get_help_and_usage_guide_content()
                            ),
                        ),
                    ],
                )

            if name == "ed-fi-auth-discovery-guide":
                return types.GetPromptResult(
                    description="Ed-Fi API Authentication and Discovery Guide",
                    messages=[
                        types.PromptMessage(
                            role="user",
                            content=types.TextContent(
                                type="text", text="How do I authenticate with Ed-Fi APIs?"
                            ),
                        ),
                        types.PromptMessage(
                            role="assistant",
                            content=types.TextContent(
                                type="text", text=self._get_authentication_guide_content()
                            ),
                        ),
                    ],
                )

            if name == "ed-fi-api-quickstart":
                return types.GetPromptResult(
                    description="Ed-Fi API Quick Start Guide",
                    messages=[
                        types.PromptMessage(
                            role="user",
                            content=types.TextContent(
                                type="text",
                                text=(
                                    "I'm new to Ed-Fi APIs. How do I get started with "
                                    "common operations?"
                                ),
                            ),
                        ),
                        types.PromptMessage(
                            role="assistant",
                            content=types.TextContent(
                                type="text", text=self._get_quick_start_guide_content()
                            ),
                        ),
                    ],
                )

            if name == "ed-fi-data-validation":
                return types.GetPromptResult(
                    description="Ed-Fi Data Validation Guidelines",
                    messages=[
                        types.PromptMessage(
                            role="user",
                            content=types.TextContent(
                                type="text",
                                text=(
                                    "How do I validate data before submitting to Ed-Fi "
                                    "APIs and understand error responses?"
                                ),
                            ),
                        ),
                        types.PromptMessage(
                            role="assistant",
                            content=types.TextContent(
                                type="text", text=self._get_data_validation_guide_content()
                            ),
                        ),
                    ],
                )

            raise _mcp_error(types.INVALID_REQUEST, f"Unknown prompt: {name}")

    # ------------------------------------------------------------------
    # Tool implementations
    # ------------------------------------------------------------------

    async def _list_available_versions(self) -> list[types.TextContent]:
        versions_list = "\n".join(
            f"• Version {v['version']}: {v['url']}" for v in DATA_STANDARD_VERSIONS
        )
        versions_text = f"Available Ed-Fi Data Standard versions:\n\n{versions_list}"

        if self.custom_base_url:
            versions_text += (
                f"\n\n📝 Custom base URL configured: {self.custom_base_url}\n"
                "You can use set_custom_data_standard_url to load specifications "
                "from your custom instance."
            )

        versions_text += (
            "\n\nUse set_data_standard_version to select a version and load its "
            "OpenAPI specification.\nUse set_custom_data_standard_url to load a "
            "custom OpenAPI specification."
        )

        return _text(versions_text)

    async def _set_data_standard_version(self, version: str | None) -> list[types.TextContent]:
        version_info = next((v for v in DATA_STANDARD_VERSIONS if v["version"] == version), None)

        if not version_info:
            available = ", ".join(v["version"] for v in DATA_STANDARD_VERSIONS)
            raise _mcp_error(
                types.INVALID_PARAMS,
                f"Invalid version: {version}. Available versions: {available}",
            )

        url = version_info["url"]
        if self.custom_base_url:
            url = CUSTOM_BASE_URL_PATTERN.sub(self.custom_base_url, url, count=1)

        self.current_version_number = version
        return await self._load_openapi_spec(url, f"Ed-Fi Data Standard {version}")

    async def _set_custom_data_standard_url(
        self, url: str | None, name: str | None
    ) -> list[types.TextContent]:
        if not url or not name:
            raise _mcp_error(
                types.INVALID_PARAMS,
                "Both URL and name are required for custom data standard",
            )

        self.current_version_number = None  # Custom URLs don't have a defined version
        return await self._load_openapi_spec(url, name)

    async def _load_openapi_spec(self, url: str, display_name: str) -> list[types.TextContent]:
        try:
            spec = self._load_from_cache(url)
            from_cache = True

            if spec is None:
                async with httpx.AsyncClient() as client:
                    response = await client.get(url)
                    response.raise_for_status()
                    spec = response.json()
                from_cache = False

                if spec is not None:
                    self._save_to_cache(url, spec)

            self.current_spec = spec
            self.current_version = display_name

            self.diagram_generator.analyze_openapi_spec(spec)

            stats = None
            if self.current_version_number:
                stats = self.diagram_generator.get_stats(self.current_version_number)

            paths = (self.current_spec or {}).get("paths") or {}
            schemas = ((self.current_spec or {}).get("components") or {}).get("schemas") or {}
            endpoint_count = len(paths)
            schema_count = len(schemas)

            info = (self.current_spec or {}).get("info") or {}
            cache_suffix = " (from cache)" if from_cache else ""

            if stats:
                domain_summary = (
                    f"• Entities analyzed: {stats['entityCount']}\n"
                    f"• Relationships found: {stats['relationshipCount']}\n"
                    f"• Domain areas: {', '.join(stats['domains'].keys())}"
                )
            else:
                domain_summary = "• Domain information not available for this version"

            return _text(
                f"✅ Successfully loaded {display_name}{cache_suffix}\n\n"
                "📋 API Overview:\n"
                f"• Title: {info.get('title', 'Ed-Fi API')}\n"
                f"• Version: {info.get('version', 'Unknown')}\n"
                f"• Endpoints: {endpoint_count}\n"
                f"• Data Models: {schema_count}\n"
                f"• Source: {url}\n\n"
                "📊 Entity Relationship Analysis:\n"
                f"{domain_summary}\n\n"
                "You can now:\n"
                "• Search for endpoints using search_endpoints\n"
                "• Get endpoint details using get_endpoint_details  \n"
                "• Search for data models using search_schemas\n"
                "• Get schema details using get_schema_details\n"
                "• Generate entity diagrams using generate_entity_diagram\n"
                "• List entity relationships using list_entity_relationships\n"
                "• Get entities by domain using get_entities_by_domain"
            )
        except McpError:
            raise
        except Exception as error:
            raise _mcp_error(
                types.INTERNAL_ERROR,
                f"Failed to load OpenAPI specification from {url}: {error}",
            ) from error

    async def _search_endpoints(self, query: str | None) -> list[types.TextContent]:
        if not self.current_spec:
            raise _mcp_error(
                types.INVALID_REQUEST,
                "No Data Standard version loaded. Use set_data_standard_version first.",
            )

        search_term = (query or "").lower()
        matching_endpoints: list[dict[str, Any]] = []

        for path, path_obj in (self.current_spec.get("paths") or {}).items():
            methods = [
                m for m in path_obj if m.lower() in ("get", "post", "put", "delete", "patch")
            ]

            if search_term in path.lower():
                summary = (
                    (path_obj.get("get") or {}).get("summary")
                    or (path_obj.get("post") or {}).get("summary")
                    or "No summary available"
                )
                matching_endpoints.append(
                    {"path": path, "methods": [m.upper() for m in methods], "summary": summary}
                )
                continue

            for method in methods:
                operation = path_obj[method] or {}
                tags = operation.get("tags") or []
                if (
                    search_term in (operation.get("summary") or "").lower()
                    or search_term in (operation.get("description") or "").lower()
                    or any(search_term in tag.lower() for tag in tags)
                ):
                    matching_endpoints.append(
                        {
                            "path": path,
                            "methods": [m.upper() for m in methods],
                            "summary": operation.get("summary") or "No summary available",
                        }
                    )
                    break

        if not matching_endpoints:
            return _text(
                f'No endpoints found matching "{query}". Try a different search term '
                "or use list_available_versions to see what's available."
            )

        shown = matching_endpoints[:20]
        entries = "\n\n".join(
            f"• {e['path']} [{', '.join(e['methods'])}]\n  {e['summary']}" for e in shown
        )
        more = (
            "\n... and more. Try a more specific search term."
            if len(matching_endpoints) > 20
            else ""
        )

        return _text(
            f'Found {len(matching_endpoints)} endpoint(s) matching "{query}":\n\n'
            f"{entries}\n{more}\n\n"
            "Use get_endpoint_details with a specific path to get more information."
        )

    async def _get_endpoint_details(
        self, path: str | None, method: str
    ) -> list[types.TextContent]:
        if not self.current_spec:
            raise _mcp_error(
                types.INVALID_REQUEST,
                "No Data Standard version loaded. Use set_data_standard_version first.",
            )

        path_obj = (self.current_spec.get("paths") or {}).get(path)
        if not path_obj:
            raise _mcp_error(
                types.INVALID_PARAMS,
                f"Endpoint not found: {path}. Use search_endpoints to find available endpoints.",
            )

        operation = path_obj.get(method.lower())
        if not operation:
            available_methods = [
                m for m in path_obj if m.lower() in ("get", "post", "put", "delete", "patch")
            ]
            raise _mcp_error(
                types.INVALID_PARAMS,
                f"Method {method} not available for {path}. "
                f"Available methods: {', '.join(available_methods)}",
            )

        details_text = (
            f"# {method} {path}\n\n"
            f"**Summary:** {operation.get('summary') or 'No summary available'}\n\n"
            f"**Description:** {operation.get('description') or 'No description available'}"
        )

        tags = operation.get("tags")
        if tags:
            details_text += f"\n\n**Tags:** {', '.join(tags)}"

        parameters = operation.get("parameters")
        if parameters:
            param_lines = "\n".join(
                f"• **{p.get('name')}** ({p.get('in')}) - {p.get('description') or 'No description'} "
                f"{'[Required]' if p.get('required') else '[Optional]'}"
                for p in parameters
            )
            details_text += f"\n\n## Parameters:\n{param_lines}"

        request_body = operation.get("requestBody")
        if request_body:
            details_text += "\n\n## Request Body:"
            content = request_body.get("content")
            if content:
                for media_type, media_type_obj in content.items():
                    details_text += f"\n**{media_type}:**"
                    schema = (media_type_obj or {}).get("schema")
                    if schema:
                        if schema.get("$ref"):
                            schema_name = schema["$ref"].rsplit("/", 1)[-1]
                            details_text += f" Schema reference: {schema_name}"
                        elif schema.get("type"):
                            details_text += f" Type: {schema['type']}"

        responses = operation.get("responses")
        if responses:
            details_text += "\n\n## Responses:"
            for status_code, resp in responses.items():
                details_text += f"\n**{status_code}:** {(resp or {}).get('description') or 'No description'}"

        return _text(details_text)

    async def _search_schemas(self, query: str | None) -> list[types.TextContent]:
        schemas = ((self.current_spec or {}).get("components") or {}).get("schemas")
        if not self.current_spec or not schemas:
            raise _mcp_error(
                types.INVALID_REQUEST,
                "No Data Standard version loaded or no schemas available. "
                "Use set_data_standard_version first.",
            )

        search_term = (query or "").lower()
        matching_schemas: list[dict[str, str]] = []

        for schema_name, schema in schemas.items():
            schema = schema or {}
            if (
                search_term in schema_name.lower()
                or search_term in (schema.get("description") or "").lower()
                or search_term in (schema.get("title") or "").lower()
            ):
                matching_schemas.append(
                    {
                        "name": schema_name,
                        "description": schema.get("description")
                        or schema.get("title")
                        or "No description available",
                    }
                )

        if not matching_schemas:
            return _text(f'No schemas found matching "{query}". Try a different search term.')

        shown = matching_schemas[:20]
        entries = "\n\n".join(f"• **{s['name']}**\n  {s['description']}" for s in shown)
        more = (
            "\n... and more. Try a more specific search term."
            if len(matching_schemas) > 20
            else ""
        )

        return _text(
            f'Found {len(matching_schemas)} schema(s) matching "{query}":\n\n'
            f"{entries}\n{more}\n\n"
            "Use get_schema_details with a specific schema name to get more information."
        )

    async def _get_schema_details(self, schema_name: str | None) -> list[types.TextContent]:
        schemas = ((self.current_spec or {}).get("components") or {}).get("schemas")
        if not self.current_spec or not schemas:
            raise _mcp_error(
                types.INVALID_REQUEST,
                "No Data Standard version loaded or no schemas available. "
                "Use set_data_standard_version first.",
            )

        schema = schemas.get(schema_name)
        if not schema:
            raise _mcp_error(
                types.INVALID_PARAMS,
                f"Schema not found: {schema_name}. Use search_schemas to find available schemas.",
            )

        details_text = f"# {schema_name} Schema"

        if schema.get("title"):
            details_text += f"\n\n**Title:** {schema['title']}"

        if schema.get("description"):
            details_text += f"\n\n**Description:** {schema['description']}"

        details_text += f"\n\n**Type:** {schema.get('type') or 'object'}"

        properties = schema.get("properties")
        required = schema.get("required") or []
        if properties:
            details_text += "\n\n## Properties:"
            for prop_name, prop in properties.items():
                prop = prop or {}
                details_text += f"\n• **{prop_name}** ({prop.get('type') or 'unknown'})"
                if prop.get("description"):
                    details_text += f" - {prop['description']}"
                if prop_name in required:
                    details_text += " [Required]"
                if prop.get("format"):
                    details_text += f" (format: {prop['format']})"
                if prop.get("enum"):
                    details_text += f" (enum: {', '.join(prop['enum'])})"

        if required:
            required_lines = "\n".join(f"• {r}" for r in required)
            details_text += f"\n\n## Required Properties:\n{required_lines}"

        return _text(details_text)

    async def _generate_entity_diagram(self, args: dict[str, Any]) -> list[types.TextContent]:
        if not self.current_spec:
            raise _mcp_error(
                types.INVALID_REQUEST,
                "No Data Standard version loaded. Use set_data_standard_version first.",
            )

        options: DiagramOptions = {
            "format": args.get("format") or "mermaid",
            "includeProperties": args.get("includeProperties") is not False,
            "includeDescriptions": args.get("includeDescriptions") or False,
            "filterDomains": args.get("filterDomains") or [],
            "maxEntities": args.get("maxEntities") or 20,
        }

        try:
            diagram_text = self.diagram_generator.generate_diagram(options)

            stats = None
            if self.current_version_number:
                stats = self.diagram_generator.get_stats(self.current_version_number)

            if stats:
                stats_text = (
                    f"• Total entities: {stats['entityCount']}\n"
                    f"• Total relationships: {stats['relationshipCount']}"
                )
            else:
                stats_text = "• Domain information not available"

            filter_line = (
                f"• Filtered domains: {', '.join(options['filterDomains'])}"
                if options["filterDomains"]
                else ""
            )

            response_text = (
                f"# Entity Relationship Diagram ({options['format'].upper()})\n\n"
                f"Generated from **{self.current_version}**\n\n"
                "## Statistics:\n"
                f"{stats_text}\n"
                f"• Entities in diagram: {options['maxEntities']}\n"
                f"• Format: {options['format']}\n"
                f"{filter_line}\n\n"
                "## Diagram:\n\n"
                f"```{options['format']}\n{diagram_text}\n```\n\n"
                "## Usage Notes:\n"
                f"- Copy the diagram code above and paste it into a {options['format']} viewer\n"
                "- For Mermaid: Use GitHub, GitLab, or Mermaid Live Editor\n"
                "- For PlantUML: Use PlantUML online editor or IDE plugins\n"
                "- For Graphviz: Use Graphviz online or local installation\n\n"
                "Use export_diagram_as_text to save this diagram to a file."
            )

            return _text(response_text)
        except McpError:
            raise
        except Exception as error:
            raise _mcp_error(types.INTERNAL_ERROR, f"Failed to generate diagram: {error}") from error

    async def _list_entity_relationships(self, args: dict[str, Any]) -> list[types.TextContent]:
        if not self.current_spec:
            raise _mcp_error(
                types.INVALID_REQUEST,
                "No Data Standard version loaded. Use set_data_standard_version first.",
            )

        entity_name = args.get("entityName")
        relationship_type = args.get("relationshipType")

        if entity_name:
            relationships = self.diagram_generator.get_entity_relationships(entity_name)
        else:
            relationships = list(self.diagram_generator.relationships)

        if relationship_type:
            relationships = [r for r in relationships if r.type == relationship_type]

        if not relationships:
            filter_info = f' for entity "{entity_name}"' if entity_name else ""
            type_info = f' of type "{relationship_type}"' if relationship_type else ""
            return _text(f"No relationships found{filter_info}{type_info}.")

        arrows = {
            "one-to-many": "→○",
            "many-to-one": "○→",
            "many-to-many": "○→○",
        }

        shown = relationships[:50]
        entries = "\n\n".join(
            f"• **{rel.from_entity}** {arrows.get(rel.type, '→')} **{rel.to_entity}** "
            f"({rel.property})\n  Type: {rel.type}"
            + (f"\n  Description: {rel.description}" if rel.description else "")
            for rel in shown
        )

        more = (
            "\n... and more. Use more specific filters to see additional relationships."
            if len(relationships) > 50
            else ""
        )

        header = f"for {entity_name}" if entity_name else ""
        type_suffix = f' of type "{relationship_type}"' if relationship_type else ""

        return _text(
            f"# Entity Relationships {header}\n\n"
            f"Found {len(relationships)} relationship(s){type_suffix}:\n\n"
            f"{entries}\n{more}\n\n"
            "## Legend:\n"
            "• → : one-to-one\n"
            "• →○ : one-to-many  \n"
            "• ○→ : many-to-one\n"
            "• ○→○ : many-to-many"
        )

    async def _get_entities_by_domain(self, domain: str | None) -> list[types.TextContent]:
        if not self.current_spec:
            raise _mcp_error(
                types.INVALID_REQUEST,
                "No Data Standard version loaded. Use set_data_standard_version first.",
            )

        if not self.current_version_number:
            raise _mcp_error(
                types.INVALID_REQUEST,
                "Domain information is not available for custom data standards. "
                "Use a standard version (4.0, 5.0, 5.1, or 5.2) to access domain information.",
            )

        entities_by_domain = self.diagram_generator.get_entities_by_domain(
            self.current_version_number
        )

        if domain:
            lower = domain.lower()
            domain_entities = entities_by_domain.get(lower)
            if not domain_entities:
                return _text(
                    f'Domain "{domain}" not found. '
                    f"Available domains: {', '.join(entities_by_domain.keys())}"
                )

            entity_lines = "\n".join(f"• {e}" for e in domain_entities)
            return _text(
                f"# {domain} Domain Entities\n\n"
                f"Found {len(domain_entities)} entities in the {domain} domain:\n\n"
                f"{entity_lines}\n\n"
                "Use get_schema_details to get more information about any entity."
            )

        result_text = "# Entities by Domain\n\n"
        for domain_name, entities in entities_by_domain.items():
            result_text += f"## {domain_name} ({len(entities)} entities)\n"
            result_text += "\n".join(f"• {e}" for e in entities[:10])
            if len(entities) > 10:
                result_text += f"\n... and {len(entities) - 10} more"
            result_text += "\n\n"

        result_text += "Use get_entities_by_domain with a specific domain name to see all entities in that domain."

        return _text(result_text)

    async def _export_diagram_as_text(self, args: dict[str, Any]) -> list[types.TextContent]:
        if not self.current_spec:
            raise _mcp_error(
                types.INVALID_REQUEST,
                "No Data Standard version loaded. Use set_data_standard_version first.",
            )

        format_: DiagramFormat = args.get("format") or "mermaid"
        filename = args.get("filename")
        filter_domains = args.get("filterDomains") or []
        max_entities = args.get("maxEntities") or 15

        options: DiagramOptions = {
            "format": format_,
            "includeProperties": True,
            "includeDescriptions": False,
            "filterDomains": filter_domains,
            "maxEntities": max_entities,
        }

        try:
            diagram_text = self.diagram_generator.generate_diagram(options)

            export_path = ""
            if filename:
                export_path = str(Path(self.cache_dir) / filename)
                with open(export_path, "w", encoding="utf-8") as fh:
                    fh.write(diagram_text)

            stats = None
            if self.current_version_number:
                stats = self.diagram_generator.get_stats(self.current_version_number)

            entities_included = (
                min(max_entities, stats["entityCount"]) if stats else "Unknown"
            )
            filter_line = (
                f"**Filtered domains:** {', '.join(filter_domains)}" if filter_domains else ""
            )
            saved_line = f"**Saved to:** {export_path}" if filename else ""
            footer = (
                f"The diagram has been saved to {export_path} for your convenience."
                if filename
                else "Use the filename parameter to save this diagram to a file."
            )

            response_text = (
                f"# Diagram Export ({format_.upper()})\n\n"
                f"**Generated from:** {self.current_version}\n"
                f"**Entities included:** {entities_included}\n"
                f"**Format:** {format_}\n"
                f"{filter_line}\n"
                f"{saved_line}\n\n"
                "## Diagram Text:\n\n"
                f"```{format_}\n{diagram_text}\n```\n\n"
                "## Instructions:\n"
                "1. Copy the diagram text above\n"
                f"2. Paste into your preferred {format_} viewer:\n"
                "   - **Mermaid**: GitHub/GitLab markdown, Mermaid Live Editor, VS Code with Mermaid extension\n"
                "   - **PlantUML**: PlantUML online server, IDE plugins\n"
                "   - **Graphviz**: Graphviz online, local dot command\n\n"
                f"{footer}"
            )

            return _text(response_text)
        except McpError:
            raise
        except Exception as error:
            raise _mcp_error(types.INTERNAL_ERROR, f"Failed to export diagram: {error}") from error

    # ------------------------------------------------------------------
    # Prompt content
    # ------------------------------------------------------------------

    @staticmethod
    def _get_help_and_usage_guide_content() -> str:
        return """# Ed-Fi SDK MCP Server Help and Usage Guide

## Overview
The Ed-Fi SDK MCP Server provides comprehensive tools for working with Ed-Fi Data Standard APIs and schemas. This guide covers all available commands, common use cases, troubleshooting, and getting started information.

## Version Information
- **CLI Tool Version**: 0.1.0
- **MCP Server**: ed-fi-sdk v0.1.0
- **Supported Ed-Fi Data Standard Versions**: 4.0, 5.0, 5.1, 5.2

## Getting Started

### 1. Using the CLI Interface
Run the CLI to explore Ed-Fi APIs interactively:
```bash
npm run cli
```

### 2. Using as MCP Server
The server provides tools that can be called by MCP clients to interact with Ed-Fi APIs programmatically.

## Available Commands (CLI)

### Basic Commands
- **`help`** - Show all available commands and documentation links
- **`info`** - Display version and build information
- **`exit`/`quit`** - Exit the CLI

### Version Management
- **`version <4.0|5.0|5.1|5.2>`** - Set Ed-Fi Data Standard version
- **`versions`** - List all available versions
- **`custom <url> <name>`** - Set custom OpenAPI specification URL

### Search and Discovery
- **`search endpoints <query>`** - Search for API endpoints
- **`search schemas <query>`** - Search for data schemas
- **`endpoint <path> [method]`** - Get detailed endpoint information
- **`schema <name>`** - Get detailed schema information

### Domain Analysis
- **`domains`** - List all domains with entity counts
- **`domains <domain>`** - Get entities for a specific domain
- **`relationships [entity]`** - List entity relationships

### Diagram Generation
- **`diagram [format] [domains...]`** - Generate entity diagram
  - Formats: `mermaid`, `plantuml`, `graphviz`
  - Example: `diagram mermaid Student Staff`
- **`export <format> [filename]`** - Export diagram to file

## Available Tools (MCP Server)

### Core Tools
- **`set_data_standard_version`** - Set the Ed-Fi Data Standard version
- **`set_custom_data_standard_url`** - Use custom OpenAPI specification
- **`list_available_versions`** - List all available versions

### Search Tools
- **`search_endpoints`** - Search for API endpoints
- **`search_schemas`** - Search for data models/schemas
- **`get_endpoint_details`** - Get detailed endpoint information
- **`get_schema_details`** - Get detailed schema information

### Analysis Tools
- **`generate_entity_diagram`** - Generate entity relationship diagrams
- **`list_entity_relationships`** - List relationships between entities
- **`get_entities_by_domain`** - Get entities grouped by domain
- **`export_diagram_as_text`** - Export diagrams as text

## Common Use Cases

### 1. Exploring a New Ed-Fi Implementation
```
version 5.2
domains
search endpoints student
search schemas Student
```

### 2. Understanding Data Relationships
```
relationships Student
domains Student
diagram mermaid Student
```

### 3. API Endpoint Analysis
```
search endpoints school
endpoint /ed-fi/schools GET
```

### 4. Generating Documentation
```
diagram mermaid Student Staff Assessment
export mermaid ed-fi-entities.md
```

## Context-Sensitive Help

### When You Get Errors
- **"No Data Standard version loaded"** → Use `version <version>` first
- **"Endpoint not found"** → Use `search endpoints <query>` to find available endpoints
- **"Schema not found"** → Use `search schemas <query>` to find available schemas
- **"Unknown command"** → Type `help` to see all available commands

### Usage Examples
- **Wrong**: `search student` → **Correct**: `search endpoints student`
- **Wrong**: `endpoint students` → **Correct**: `endpoint /ed-fi/students`
- **Wrong**: `diagram` → **Better**: `diagram mermaid Student`

## Troubleshooting Guide

### Common Issues

#### 1. Network Connection Problems
**Problem**: "getaddrinfo ENOTFOUND api.ed-fi.org"
**Solution**:
- Check internet connection
- Verify firewall/proxy settings
- Try using a custom URL if accessing a local Ed-Fi API

#### 2. No Data Available
**Problem**: Commands return "No Data Standard version loaded"
**Solution**:
- Run `version 5.2` (or your desired version) first
- Wait for the OpenAPI specification to download
- Check for network connectivity

#### 3. Search Returns No Results
**Problem**: Search commands return no results
**Solution**:
- Try broader search terms (e.g., "student" instead of "studentschoolassociation")
- Use `versions` to ensure correct version is loaded
- Check spelling and use partial matches

#### 4. Diagram Generation Issues
**Problem**: Diagrams are too large or complex
**Solution**:
- Filter by specific domains: `diagram mermaid Student`
- Use smaller entity limits in MCP tools
- Focus on specific relationships: `relationships Student`

### Performance Tips
- API specifications are cached for 1 hour
- Use domain filtering for faster diagram generation
- Search with specific terms to get relevant results quickly

## Additional Resources

### Documentation Links
- **CLI Usage Guide**: CLI-USAGE.md in the project root
- **Ed-Fi Documentation**: https://docs.ed-fi.org/
- **Ed-Fi API Client Guide**: https://docs.ed-fi.org/reference/ods-api/
- **GitHub Repository**: https://github.com/Ed-Fi-Exchange-OSS/Ed-Fi-SDK-MCP

### Helpful Prompts
Use these MCP prompts for specific guidance:
- **`ed-fi-auth-discovery-guide`** - OAuth 2.0 setup and authentication
- **`ed-fi-api-quickstart`** - Common API operations and endpoints
- **`ed-fi-data-validation`** - Data validation and error handling

### Support
- **Report Issues**: https://github.com/Ed-Fi-Exchange-OSS/Ed-Fi-SDK-MCP/issues
- **Documentation Questions**: Check the Ed-Fi community forums
- **API Questions**: Refer to your Ed-Fi implementation documentation

## Quick Reference

### Most Used Commands
1. `version 5.2` - Load the latest Ed-Fi Data Standard
2. `help` - Show available commands
3. `search endpoints <term>` - Find relevant API endpoints
4. `domains` - Explore available data domains
5. `info` - Check current status and version

### Best Practices
- Always set a version first: `version 5.2`
- Use specific search terms for better results
- Generate focused diagrams by domain
- Export diagrams for documentation
- Read CLI-USAGE.md for detailed examples

This comprehensive guide should help you effectively use the Ed-Fi SDK MCP Server for exploring and working with Ed-Fi Data Standard APIs."""

    @staticmethod
    def _get_authentication_guide_content() -> str:
        return """# Ed-Fi API Authentication and Discovery Guide

## Overview
Ed-Fi APIs use OAuth 2.0 Client Credentials flow for authentication. This guide covers the authentication process and best practices in using the Discovery API.

## Authentication Steps

### 1. Obtain Credentials and API Endpoints
First, the Ed-Fi API platform host needs to provide you with the necessary credentials and API endpoints:

- **Client ID**: Unique identifier for your application (aka "key")
- **Client Secret**: Secret key for your application (aka "secret")
- **Discovery API URL**: The Ed-Fi API base URL (e.g., https://api.example.org/v7.3/api)

Example Discovery API response:

```
{
  "version": "7.3",
  "build": "7.3.1574.0",
  "dataModels": [
    {
      "name": "Ed-Fi",
      "version": "5.2.0",
      "informationalVersion": "The Ed-Fi Data Model 5.2"
    }
  ],
  "urls": {
    "dependencies": "https://api.example.org/v7.3/api/metadata/data/v3/dependencies",
    "openApiMetadata": "https://api.example.org/v7.3/api/metadata/",
    "oauth": "https://api.example.org/v7.3/api/oauth/token",
    "oauthTokenIntrospection": "https://api.example.org/v7.3/api/oauth/token_info",
    "dataManagementApi": "https://api.example.org/v7.3/api/data/v3/"
  }
}
```

### 2. Request Access Token
Make a POST request to the `oauth` token endpoint listed in the Discovery API response:

```http
POST https://api.example.org/v7.3/api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET
```

### 3. Use Access Token

The Ed-Fi API resource endpoints are hosted under the `dataManagementApi` URL. For example, the Ed-Fi API path `/ed-fi/students` would be accessed at:

```http
GET https://api.example.org/v7.3/api/data/v3/ed-fi/students
```

Include the access token in subsequent API requests:

```http
GET https://api.example.org/v7.3/api/data/v3/ed-fi/students
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 4. Dependencies

The `$.urls.dependencies` endpoint provides information about the relationships between different resources in the Ed-Fi API. Use this endpoint to explore resource dependencies and understand how they are interconnected.

Resources with order 1 can be loaded without any pre-requisites. Those with order 2 have one or more dependencies on order 1 resources, and so forth. Use this information to plan the sequence of data loading operations. Below is a partial example of the dependencies endpoint response:

```
[
  {
    "resource": "/ed-fi/sourceSystemDescriptors",
    "order": 1,
    "operations": [
      "Create",
      "Update"
    ]
  },
  {
    "resource": "/ed-fi/people",
    "order": 2,
    "operations": [
      "Create",
      "Update"
    ]
  },
  {
    "resource": "/ed-fi/contacts",
    "order": 3,
    "operations": [
      "Create"
    ]
  }
]
```

## Best Practices

### Security
- **Never expose credentials**: Store client credentials securely (environment variables, key vaults)
- **Use HTTPS**: All API calls must use HTTPS
- **Reuse tokens**: Do not issue a new authentication request until the current token is expired
- **Token expiration**: Access tokens typically expire in 1 hour, implement refresh logic

### Error Handling
- **400 Bad Request**: Invalid request format or parameters - check response body for details
- **401 Unauthorized**: Token expired or invalid - refresh token
- **403 Forbidden**: Insufficient permissions - check access scope by using the `oauthTokenIntrospection` endpoint.
- **404 Not Found**: Resource not found - verify endpoint URL
- **429 Too Many Requests**: Implement exponential backoff

### Example Implementation (Python)

```python
import time
import httpx


class EdFiClient:
    def __init__(self, base_url, client_id, client_secret):
        self.base_url = base_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        self.token_expiry = None
        self.oauth_url = None
        self.data_management_api_url = None

    async def discover_endpoints(self, client: httpx.AsyncClient):
        if self.oauth_url and self.data_management_api_url:
            return

        response = await client.get(self.base_url)
        response.raise_for_status()
        api_info = response.json()

        # for brevity, this example does not inspect for unexpected API response shapes
        self.oauth_url = api_info["urls"]["oauth"]
        self.data_management_api_url = api_info["urls"]["dataManagementApi"]

    async def authenticate(self, client: httpx.AsyncClient):
        await self.discover_endpoints(client)

        response = await client.post(
            self.oauth_url,
            data={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
        )
        response.raise_for_status()
        payload = response.json()

        self.access_token = payload["access_token"]
        self.token_expiry = time.time() + payload["expires_in"]

        return self.access_token

    async def make_request(self, client: httpx.AsyncClient, endpoint, method="GET", data=None):
        await self.discover_endpoints(client)

        if not self.access_token or time.time() >= self.token_expiry:
            await self.authenticate(client)

        full_url = self.data_management_api_url + endpoint.lstrip("/")
        headers = {"Authorization": f"Bearer {self.access_token}"}

        response = await client.request(method, full_url, json=data, headers=headers)
        if response.status_code == 401:
            # Token expired, try once more
            await self.authenticate(client)
            headers["Authorization"] = f"Bearer {self.access_token}"
            response = await client.request(method, full_url, json=data, headers=headers)

        response.raise_for_status()
        return response.json()


# Usage example
async def get_students():
    import os

    client_wrapper = EdFiClient(
        os.environ["EDFI_BASE_URL"],
        os.environ["EDFI_CLIENT_ID"],
        os.environ["EDFI_CLIENT_SECRET"],
    )

    async with httpx.AsyncClient() as client:
        # Get students - endpoints will be automatically discovered
        students = await client_wrapper.make_request(client, "/ed-fi/students")

        # Note: does not handle paging
        print("Students:", students)
```

## Common Endpoints

After authentication, you can access these common endpoints:

- **Students**: `/ed-fi/students`
- **Schools**: `/ed-fi/schools`
- **Staff**: `/ed-fi/staffs`
- **Assessments**: `/ed-fi/assessments`
- **Student School Associations**: `/ed-fi/studentSchoolAssociations`

## Troubleshooting

### Common Issues
1. **Invalid client credentials**: Double-check client ID and secret
2. **SSL certificate errors**: Ensure proper certificate validation
3. **Rate limiting**: Implement proper throttling (typically 100 requests/minute)
4. **Data format errors**: Use proper JSON formatting for POST/PUT requests

### Environment Variables
Set up these environment variables for secure credential management:

```bash
EDFI_BASE_URL=https://api.example.org/v7.3/api
EDFI_CLIENT_ID=your_client_id_here
EDFI_CLIENT_SECRET=your_client_secret_here
```

This authentication approach ensures secure and reliable access to Ed-Fi APIs while following OAuth 2.0 best practices."""

    @staticmethod
    def _get_quick_start_guide_content() -> str:
        return """# Ed-Fi API Quick Start Guide

## Getting Started with Ed-Fi APIs

This guide helps you quickly get started with the most common Ed-Fi API operations.

## Prerequisites
1. Ed-Fi API credentials (Client ID and Client Secret, aka "key and secret")
2. Base API URL from your district/vendor
3. Access to the Ed-Fi API documentation (usually at `/docs`)

## Essential API Patterns

### 1. Reading Data (GET Operations)

#### Get All Students
```http
GET {dataManagementApiUrl}/ed-fi/students
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Get Students with Filtering
```http
GET {dataManagementApiUrl}/ed-fi/students?schoolId=123&limit=100&offset=0
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Get Student by resource identifier

TIP: this URL is in the `location` response header after submitting a POST request.

```http
GET {dataManagementApiUrl}/ed-fi/students/RESOURCE_IDENTIFIER
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 2. Creating Data (POST Operations)

#### Create a New Student
```http
POST {dataManagementApiUrl}/ed-fi/students
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "studentUniqueId": "12345",
  "personalTitlePrefix": "Mr",
  "firstName": "John",
  "lastSurname": "Doe",
  "birthDate": "2010-05-15"
}
```

### 3. Updating Data (PUT Operations)

#### Update Student Information
```http
PUT {dataManagementApiUrl}/ed-fi/students/12345
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "studentUniqueId": "12345",
  "personalTitlePrefix": "Mr",
  "firstName": "John",
  "middleName": "Michael",
  "lastSurname": "Doe",
  "birthDate": "2010-05-15",
  "birthSexDescriptor": "uri://ed-fi.org/BirthSexDescriptor#Male"
}
```

### 4. Deleting Data (DELETE Operations)

#### Delete a Student
```http
DELETE {dataManagementApiUrl}/ed-fi/students/12345
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Common Query Parameters

### Pagination
- `limit`: Number of records to return (default: 25, max: usually 500)
- `offset`: Number of records to skip

### Filtering
- Use resource properties as query parameters
- Example: `?schoolId=123&gradeLevel=Fifth grade`

## Essential Endpoints by Domain

### Student Information
- **Students**: `/ed-fi/students`
- **Student School Associations**: `/ed-fi/studentSchoolAssociations`
- **Student Education Organization Associations**: `/ed-fi/studentEducationOrganizationAssociations`

### School & Staff Information
- **Schools**: `/ed-fi/schools`
- **Education Organizations**: `/ed-fi/educationOrganizations`
- **Staff**: `/ed-fi/staffs`
- **Staff Education Organization Assignments**: `/ed-fi/staffEducationOrganizationAssignmentAssociations`

### Academic Information
- **Courses**: `/ed-fi/courses`
- **Sections**: `/ed-fi/sections`
- **Student Section Associations**: `/ed-fi/studentSectionAssociations`
- **Grades**: `/ed-fi/grades`

### Assessment Information
- **Assessments**: `/ed-fi/assessments`
- **Student Assessments**: `/ed-fi/studentAssessments`
- **Assessment Items**: `/ed-fi/assessmentItems`

## Best Practices

### 1. Start Small
Begin with read operations (GET) before attempting writes (POST/PUT)

### 2. Use the Discovery API
Leverage the Discovery API to understand available resources and their relationships; see the ed-fi-auth-discovery-guide guide for more help.

### 3. Use the Swagger/OpenAPI Documentation
Most Ed-Fi APIs provide interactive documentation at `/docs`

### 4. Understand Dependencies
Some resources depend on others existing first:

- Students must exist before Student School Associations
- Schools must exist before Student School Associations
- Courses must exist before Sections

Use the `dependencies` endpoint to explore resource relationships in more detail.

### 5. Handle Errors Gracefully
Common HTTP status codes:
- **200**: Success
- **201**: Created successfully
- **400**: Bad request (validation errors)
- **401**: Unauthorized (authentication issue)
- **404**: Not found
- **409**: Conflict (duplicate key)

### 6. Use Descriptors Correctly
Ed-Fi uses URI-based descriptors for standardized values:
```python
grade_level = "uri://ed-fi.org/GradeLevelDescriptor#Fifth grade"
sex_descriptor = "uri://ed-fi.org/SexDescriptor#Female"
```

## Sample Workflow: Enrolling a Student

```python
# 1. Create the student
student = {
    "studentUniqueId": "12345",
    "firstName": "Jane",
    "lastSurname": "Smith",
    "birthDate": "2010-03-15",
}

await client_wrapper.make_request(client, "/ed-fi/students", "POST", student)

# 2. Associate student with school
association = {
    "studentReference": {"studentUniqueId": "12345"},
    "schoolReference": {"schoolId": 123},
    "entryDate": "2023-08-15",
    "entryGradeLevelDescriptor": "uri://ed-fi.org/GradeLevelDescriptor#Fifth grade",
}

await client_wrapper.make_request(client, "/ed-fi/studentSchoolAssociations", "POST", association)
```

## Next Steps
1. Review the complete API documentation for your Ed-Fi version
2. Set up proper error handling and logging
3. Implement data validation before API calls
4. Consider caching strategies for frequently accessed data
5. Test thoroughly in a sandbox environment

💡 For more help, visit the [Interacting with an Ed-Fi API Tutorial](https://docs.ed-fi.org/reference/data-exchange/tutorial) or [API Client Developers' Guide](https://docs.ed-fi.org/reference/ods-api/7.2/client-developers-guide).

🔔 Remember: Always test API operations in a development environment before using in production."""

    @staticmethod
    def _get_data_validation_guide_content() -> str:
        return """# Ed-Fi Data Validation Guidelines

## Overview
Proper data validation is crucial for successful Ed-Fi API operations. This guide covers validation strategies and error interpretation.

## Pre-Submission Validation

### 1. Required Fields Validation
Always validate that required fields are present and non-empty:

```python
def validate_student(student: dict) -> None:
    required = ["studentUniqueId", "firstName", "lastSurname", "birthDate"]
    missing = [field for field in required if not student.get(field)]

    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")
```

### 2. Data Type Validation
Ensure data types match Ed-Fi specifications:

```python
import re

def validate_data_types(data: dict) -> None:
    # Dates should be in YYYY-MM-DD format
    date_pattern = re.compile(r"^\\d{4}-\\d{2}-\\d{2}$")
    if data.get("birthDate") and not date_pattern.match(data["birthDate"]):
        raise ValueError("Birth date must be in YYYY-MM-DD format")

    # Numbers should be actual numbers
    if data.get("schoolId") is not None and not isinstance(data["schoolId"], (int, float)):
        raise ValueError("School ID must be a number")
```

### 3. Descriptor Validation
Validate that descriptors use correct URIs:

```python
VALID_GRADE_LEVELS = [
    "uri://ed-fi.org/GradeLevelDescriptor#Kindergarten",
    "uri://ed-fi.org/GradeLevelDescriptor#First grade",
    "uri://ed-fi.org/GradeLevelDescriptor#Second grade",
    # ... etc
]


def validate_descriptors(data: dict) -> None:
    if data.get("gradeLevel") and data["gradeLevel"] not in VALID_GRADE_LEVELS:
        raise ValueError(f"Invalid grade level descriptor: {data['gradeLevel']}")
```

## Understanding API Error Responses

### Common HTTP Status Codes

#### 400 Bad Request
Indicates validation errors in your request data.

**Example Response:**
```json
{
  "detail": "Data validation failed. See 'validationErrors' for details.",
  "type": "urn:ed-fi:api:bad-request:data-validation-failed",
  "title": "Data Validation Failed",
  "status": 400,
  "correlationId": "3ba4019d-5f0c-437e-b81d-b0b41b440df5",
  "validationErrors": {
    "$.birthDate": [
      "The supplied value is invalid."
    ]
  }
}
```

**How to Handle:**
```python
try:
    await client_wrapper.make_request(client, "/ed-fi/students", "POST", student_data)
except httpx.HTTPStatusError as error:
    if error.response.status_code == 400:
        validation_errors = error.response.json().get("validationErrors", {})
        print("Validation errors:", validation_errors)

        # Fix each validation error
        for field, messages in validation_errors.items():
            print(f"Field '{field}': {', '.join(messages)}")
```

## Error Recovery Strategies

### 1. Retry Logic
Implement intelligent retry for transient errors:

```python
import asyncio

async def make_request_with_retry(client_wrapper, client, endpoint, method, data, max_retries=3):
    for attempt in range(1, max_retries + 1):
        try:
            return await client_wrapper.make_request(client, endpoint, method, data)
        except httpx.HTTPStatusError as error:
            if attempt == max_retries:
                raise

            # Retry on server errors (5xx) but not client errors (4xx)
            if error.response.status_code >= 500:
                await asyncio.sleep(attempt)
                continue

            raise  # Don't retry client errors
```

## Validation Checklist

Before submitting data to Ed-Fi APIs, verify:

- [ ] All required fields are present and valid
- [ ] Data types match specification (strings, numbers, dates)
- [ ] Dates are in YYYY-MM-DD format
- [ ] Descriptors use proper URI format
- [ ] Referenced entities exist (for associations)
- [ ] Business rules are satisfied
- [ ] No duplicate keys exist
- [ ] Field lengths don't exceed limits
- [ ] Numeric values are within valid ranges

Remember: Validation is your first line of defense against API errors. Implement comprehensive validation to ensure smooth data operations and better error handling."""

    # ------------------------------------------------------------------
    # Entrypoint
    # ------------------------------------------------------------------

    async def run(self) -> None:
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream, write_stream, self.server.create_initialization_options()
            )


def main() -> None:
    server = EdFiMCPServer()
    asyncio.run(server.run())


if __name__ == "__main__":
    main()
