# Ed-Fi Data Standard MCP Server

An MCP Server for the Ed-Fi Data Standard that helps developers build client applications that interact with Ed-Fi APIs through AI assistants like GitHub Copilot, Claude Code, Cursor, etc.

## Features

- **Version Selection**: Choose from Ed-Fi Data Standard versions 4.0, 5.0, 5.1, or 5.2
- **OpenAPI Integration**: Automatically fetches and parses OpenAPI specifications from Ed-Fi APIs
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

## Available Tools

The MCP server provides the following tools:

### 1. `list_available_versions`
Lists all supported Ed-Fi Data Standard versions and their corresponding OpenAPI specification URLs.

### 2. `set_data_standard_version`
Loads the OpenAPI specification for a specific Ed-Fi Data Standard version.

**Parameters:**
- `version` (required): One of "4.0", "5.0", "5.1", or "5.2"

### 3. `search_endpoints`
Searches for API endpoints that match a query term.

**Parameters:**
- `query` (required): Search term (e.g., "student", "school", "assessment")

### 4. `get_endpoint_details`
Gets detailed information about a specific API endpoint.

**Parameters:**
- `path` (required): The API endpoint path (e.g., "/ed-fi/students")
- `method` (optional): HTTP method (default: "GET")

### 5. `search_schemas`
Searches for data models/schemas that match a query term.

**Parameters:**
- `query` (required): Search term (e.g., "Student", "School", "Assessment")

### 6. `get_schema_details`
Gets detailed information about a specific data model/schema.

**Parameters:**
- `schemaName` (required): The name of the schema

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

2. **Select a version:**
   Use `set_data_standard_version` with your desired version (e.g., "5.2").

3. **Explore endpoints:**
   Use `search_endpoints` to find API endpoints related to your needs (e.g., search for "student").

4. **Get endpoint details:**
   Use `get_endpoint_details` to learn about request/response formats for specific endpoints.

5. **Explore data models:**
   Use `search_schemas` and `get_schema_details` to understand the data structures.

## License

This project is licensed under the ISC License - see the LICENSE file for details.
