# Ed-Fi Data Standard MCP Server

An MCP Server for the Ed-Fi Data Standard that helps developers build client applications that interact with Ed-Fi APIs through AI assistants like GitHub Copilot, Claude Code, Cursor, etc.

## Features

- **Version Selection**: Choose from Ed-Fi Data Standard versions 4.0, 5.0, 5.1, or 5.2
- **Custom URL Support**: Configure alternative URLs for custom Ed-Fi Data Standard instances
- **OpenAPI Integration**: Automatically fetches and parses OpenAPI specifications from Ed-Fi APIs
- **Intelligent Caching**: Caches OpenAPI specs locally to reduce network requests and improve response times
- **Endpoint Discovery**: Search and explore available API endpoints
- **Schema Exploration**: Browse and understand data models and schemas
- **Detailed Documentation**: Get comprehensive information about endpoints and data structures

## Installation

```bash
npm install
npm run build
```

## Usage

### As an MCP Server

The server implements the Model Context Protocol (MCP) and can be used with AI assistants that support MCP.

```bash
npm start
```

### Development

```bash
npm run dev
```

## AI Assistant Integration

This MCP server can be integrated with popular AI coding assistants to provide Ed-Fi Data Standard context during development.

### Claude Desktop

Add the following to your Claude Desktop configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "ed-fi-data-standard": {
      "command": "npx",
      "args": ["ed-fi-data-standard-mcp-server"],
      "env": {}
    }
  }
}
```

### VS Code with Cline

1. Install the Cline extension in VS Code
2. Configure the MCP server in Cline's settings:
   - Command: `npx ed-fi-data-standard-mcp-server`
   - Transport: stdio

### Continue.dev

Add the following to your Continue configuration:

```json
{
  "mcp": {
    "servers": {
      "ed-fi-data-standard": {
        "command": "npx",
        "args": ["ed-fi-data-standard-mcp-server"]
      }
    }
  }
}
```

### Cursor

Configure the MCP server in Cursor's MCP settings:
- Server name: ed-fi-data-standard
- Command: `npx ed-fi-data-standard-mcp-server`

### Custom Installation

If you've installed the package globally or locally, you can also use:

```bash
# Global installation
npm install -g ed-fi-data-standard-mcp-server

# Then reference it directly
ed-fi-mcp-server
```

## Available Tools

The MCP server provides the following tools:

### 1. `list_available_versions`
Lists all supported Ed-Fi Data Standard versions and their corresponding OpenAPI specification URLs.

### 2. `set_data_standard_version`
Loads the OpenAPI specification for a specific Ed-Fi Data Standard version.

**Parameters:**
- `version` (required): One of "4.0", "5.0", "5.1", or "5.2"

### 3. `set_custom_data_standard_url`
Loads the OpenAPI specification from a custom URL (e.g., for custom Ed-Fi implementations).

**Parameters:**
- `url` (required): The URL to the custom OpenAPI specification
- `name` (required): A descriptive name for this custom data standard

### 4. `search_endpoints`
Searches for API endpoints that match a query term.

**Parameters:**
- `query` (required): Search term (e.g., "student", "school", "assessment")

### 5. `get_endpoint_details`
Gets detailed information about a specific API endpoint.

**Parameters:**
- `path` (required): The API endpoint path (e.g., "/ed-fi/students")
- `method` (optional): HTTP method (default: "GET")

### 6. `search_schemas`
Searches for data models/schemas that match a query term.

**Parameters:**
- `query` (required): Search term (e.g., "Student", "School", "Assessment")

### 7. `get_schema_details`
Gets detailed information about a specific data model/schema.

**Parameters:**
- `schemaName` (required): The name of the schema

## Configuration

The MCP server supports the following environment variables for configuration:

### Environment Variables

- **`ED_FI_CUSTOM_BASE_URL`** (optional): Set a custom base URL for Ed-Fi API instances. When set, standard version URLs will be rewritten to use this base instead of `https://api.ed-fi.org`.
  
  Example: `ED_FI_CUSTOM_BASE_URL=https://my-ed-fi-instance.org/v7.3`

- **`ED_FI_CACHE_DIR`** (optional): Specify a custom directory for caching OpenAPI specifications. Defaults to the system temporary directory.
  
  Example: `ED_FI_CACHE_DIR=/home/user/.cache/ed-fi-mcp`

### Example Usage with Custom Configuration

```bash
# Using a custom Ed-Fi instance
ED_FI_CUSTOM_BASE_URL=https://my-ed-fi.org/v7.3 npx ed-fi-data-standard-mcp-server

# Custom cache directory
ED_FI_CACHE_DIR=/opt/cache/ed-fi npx ed-fi-data-standard-mcp-server

# Both options together
ED_FI_CUSTOM_BASE_URL=https://my-ed-fi.org/v7.3 ED_FI_CACHE_DIR=/opt/cache/ed-fi npx ed-fi-data-standard-mcp-server
```

## Supported Ed-Fi Data Standard Versions

| Version | OpenAPI Specification URL |
|---------|---------------------------|
| 4.0 | https://api.ed-fi.org/v6.2/api/metadata/data/v3/resources/swagger.json |
| 5.0 | https://api.ed-fi.org/v7.1/api/metadata/data/v3/resources/swagger.json |
| 5.1 | https://api.ed-fi.org/v7.2/api/metadata/data/v3/resources/swagger.json |
| 5.2 | https://api.ed-fi.org/v7.3/api/metadata/data/v3/resources/swagger.json |

## Example Workflow

1. **Start by listing available versions:**
   Use `list_available_versions` to see all supported Ed-Fi Data Standard versions.

2. **Select a version or custom URL:**
   - Use `set_data_standard_version` with your desired version (e.g., "5.2") for standard Ed-Fi API.
   - Use `set_custom_data_standard_url` to load from a custom Ed-Fi implementation.

3. **Explore endpoints:**
   Use `search_endpoints` to find API endpoints related to your needs (e.g., search for "student").

4. **Get endpoint details:**
   Use `get_endpoint_details` to learn about request/response formats for specific endpoints.

5. **Explore data models:**
   Use `search_schemas` and `get_schema_details` to understand the data structures.

### Custom Ed-Fi Instance Example

If you're working with a custom Ed-Fi implementation, you can load specifications directly:

```
1. Use set_custom_data_standard_url with:
   - url: "https://your-ed-fi.org/api/metadata/data/v3/resources/swagger.json"
   - name: "My Custom Ed-Fi Instance"

2. Continue with normal workflow (search_endpoints, etc.)
```

## License

Copyright (c) 2025, Ed-Fi Alliance, LLC. All rights reserved.

This project is licensed under the Apache License, Version 2.0 - see the LICENSE file for details.
