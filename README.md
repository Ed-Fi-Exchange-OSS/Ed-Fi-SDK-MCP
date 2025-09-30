# Ed-Fi Software Development Kit MCP Server

[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/Ed-Fi-Exchange-OSS/Ed-Fi-SDK-MCP/badge)](https://securityscorecards.dev/viewer/?uri=github.com/Ed-Fi-Exchange-OSS/Ed-Fi-SDK-MCP)

An MCP Server that helps developers build client applications that interact with Ed-Fi APIs through AI assistants like GitHub Copilot, Claude Code, Cursor, etc.

## Features

- **Version Selection**: Choose from Ed-Fi Data Standard versions 4.0, 5.0, 5.1, or 5.2
- **Custom URL Support**: Configure alternative URLs for custom Ed-Fi Data Standard instances
- **OpenAPI Integration**: Automatically fetches and parses OpenAPI specifications from Ed-Fi APIs
- **Intelligent Caching**: Caches OpenAPI specs locally to reduce network requests and improve response times
- **Endpoint Discovery**: Search and explore available API endpoints
- **Schema Exploration**: Browse and understand data models and schemas
- **Detailed Documentation**: Get comprehensive information about endpoints and data structures
- **🆕 Schema Visualization**: Generate entity relationship diagrams in multiple formats (Mermaid, PlantUML, Graphviz)
- **🆕 Interactive Entity Analysis**: Explore relationships between core entities (students, schools, assessments, etc.)
- **🆕 Domain Filtering**: Filter diagrams by entity type or domain area
- **🆕 Multiple Export Formats**: Export diagrams as text for use in various visualization tools
- **🆕 Prompt Documentation**: Access comprehensive guides and best practices through AI prompts

## Documentation & Prompts

The MCP server includes built-in prompt templates that provide detailed guidance on working with Ed-Fi APIs:

- **ed-fi-authentication-guide**: Complete OAuth 2.0 authentication guide with code examples
- **ed-fi-api-quickstart**: Quick start guide for common API operations (GET, POST, PUT, DELETE)
- **ed-fi-data-validation**: Data validation strategies and error handling techniques

These prompts can be accessed through any MCP-compatible AI assistant and provide contextual help for Ed-Fi development tasks.

For more information on using this server, see:

- [Local Usage](./docs/local-usage.md)
- [Schema Visualization Guide](./docs/schema-visualization.md)
- [Requirements](./docs/requirements/)

## AI Assistant Integration

> [!WARNING]
> These installation instructions are not ready for usage yet.
>
> 1. Written by Copilot and not verified, other than the VS Code instructions.
> 2. They will only work once `ed-fi-sdk-mcp` has been published to npmjs.com.

This MCP server can be integrated with popular AI coding assistants to provide Ed-Fi Data Standard context during development.

### Claude Desktop

Add the following to your Claude Desktop configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

### VS Code with Cline

1. Install the Cline extension in VS Code
2. Configure the MCP server in Cline's settings:
   - Command: `npx ed-fi-sdk-mcp`
   - Transport: stdio

### Continue.dev

Add the following to your Continue configuration:

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

### Cursor

Configure the MCP server in Cursor's MCP settings:

- Server name: ed-fi-data-standard
- Command: `npx ed-fi-sdk-mcp`

### GitHub Copilot

#### VS Code

1. Ensure you have the GitHub Copilot and GitHub Copilot Chat extensions installed
2. Create or update your VS Code settings file (`.vscode/mcp.json` in your workspace or global settings):

    ```json
    {
     "servers": {
      "ed-fi-sdk-mcp": {
       "type": "stdio",
       "command": "npx",
       "args": [
        "ed-fi-sdk-mcp"
       ]
      }
     },
     "inputs": []
    }
    ```

3. Restart VS Code and use `@ed-fi-data-standard` in GitHub Copilot Chat to access Ed-Fi Data Standard tools

#### Visual Studio

1. Ensure you have the GitHub Copilot extension installed
2. See instructions in [Use MCP servers](https://learn.microsoft.com/en-us/visualstudio/ide/mcp-servers?view=vs-2022).

### Custom Installation

If you've installed the package globally or locally, you can also use:

```bash
# Global installation
npm install -g ed-fi-sdk-mcp

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

## 🎨 Schema Visualization Tools

### 8. `generate_entity_diagram`

Generate entity relationship diagrams from the OpenAPI specification.

**Parameters:**

- `format` (optional): Diagram format - "mermaid", "plantuml", or "graphviz" (default: "mermaid")
- `includeProperties` (optional): Include entity properties in diagram (default: true)
- `includeDescriptions` (optional): Include entity descriptions (default: false)
- `filterDomains` (optional): Array of domain names to filter by (e.g., ["student", "school"])
- `maxEntities` (optional): Maximum number of entities to include (default: 20)

### 9. `list_entity_relationships`

List relationships between entities in the current specification.

**Parameters:**

- `entityName` (optional): Show relationships for a specific entity only
- `relationshipType` (optional): Filter by relationship type ("one-to-one", "one-to-many", "many-to-one", "many-to-many")

### 10. `get_entities_by_domain`

Get entities grouped by domain areas (Student, School, Staff, Assessment, etc.).

**Parameters:**

- `domain` (optional): Get entities for a specific domain only

### 11. `export_diagram_as_text`

Export a diagram as text that can be rendered by various visualization tools.

**Parameters:**

- `format` (required): Diagram format - "mermaid", "plantuml", or "graphviz"
- `filename` (optional): Filename to save the diagram text
- `filterDomains` (optional): Filter entities by domain areas
- `maxEntities` (optional): Maximum number of entities to include (default: 15)

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
ED_FI_CUSTOM_BASE_URL=https://my-ed-fi.org/v7.3 npx ed-fi-sdk-mcp

# Custom cache directory
ED_FI_CACHE_DIR=/opt/cache/ed-fi npx ed-fi-sdk-mcp

# Both options together
ED_FI_CUSTOM_BASE_URL=https://my-ed-fi.org/v7.3 ED_FI_CACHE_DIR=/opt/cache/ed-fi npx ed-fi-sdk-mcp
```

## Supported Ed-Fi Data Standard Versions

| Version | OpenAPI Specification URL |
|---------|---------------------------|
| 4.0 | <https://api.ed-fi.org/v6.2/api/metadata/data/v3/resources/swagger.json> |
| 5.0 | <https://api.ed-fi.org/v7.1/api/metadata/data/v3/resources/swagger.json> |
| 5.1 | <https://api.ed-fi.org/v7.2/api/metadata/data/v3/resources/swagger.json> |
| 5.2 | <https://api.ed-fi.org/v7.3/api/metadata/data/v3/resources/swagger.json> |

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

6. **🆕 Visualize entity relationships:**
   Use `generate_entity_diagram` to create visual representations of the data model.

7. **🆕 Analyze entity domains:**
   Use `get_entities_by_domain` to understand how entities are organized by functional areas.

8. **🆕 Export diagrams:**
   Use `export_diagram_as_text` to save diagrams for documentation or further analysis.

### Custom Ed-Fi Instance Example

If you're working with a custom Ed-Fi implementation, you can load specifications directly:

1. Use set_custom_data_standard_url with:
   - `url: "https://your-ed-fi.org/api/metadata/data/v3/resources/swagger.json"`
   - `name: "My Custom Ed-Fi Instance"`

2. Continue with normal workflow (search_endpoints, etc.)

### Visualization Workflow Example

For data architects working with Ed-Fi schemas:

1. **Load the specification:**
   ```
   set_data_standard_version("5.2")
   ```

2. **Explore domain structure:**
   ```
   get_entities_by_domain()
   ```

3. **Generate a student-focused diagram:**
   ```
   generate_entity_diagram({
     "format": "mermaid",
     "filterDomains": ["student", "school"],
     "maxEntities": 15
   })
   ```

4. **Examine specific relationships:**
   ```
   list_entity_relationships({
     "entityName": "edfi_student"
   })
   ```

5. **Export for documentation:**
   ```
   export_diagram_as_text({
     "format": "plantuml",
     "filename": "student-entities.puml",
     "filterDomains": ["student"]
   })
   ```

The generated diagrams can be used in:
- GitHub/GitLab documentation (Mermaid)
- Technical documentation (PlantUML)
- System architecture documents (Graphviz)
- Presentation materials (exported as images)

## License

Copyright (c) 2025, Ed-Fi Alliance, LLC. All rights reserved.

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](./LICENSE) file for details.
