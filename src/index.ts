#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";

interface DataStandardVersion {
  version: string;
  url: string;
}

interface ServerConfig {
  customBaseUrl?: string;
  cacheDirectory?: string;
}

interface OpenAPISpec {
  paths: Record<string, any>;
  components?: {
    schemas: Record<string, any>;
  };
  info?: {
    title: string;
    version: string;
    description?: string;
  };
}

class EdFiMCPServer {
  private server: Server;
  private currentSpec: OpenAPISpec | null = null;
  private currentVersion: string | null = null;
  private config: ServerConfig;
  private cacheDir: string;

  private readonly dataStandardVersions: DataStandardVersion[] = [
    {
      version: "4.0",
      url: "https://api.ed-fi.org/v6.2/api/metadata/data/v3/resources/swagger.json",
    },
    {
      version: "5.0",
      url: "https://api.ed-fi.org/v7.1/api/metadata/data/v3/resources/swagger.json",
    },
    {
      version: "5.1",
      url: "https://api.ed-fi.org/v7.2/api/metadata/data/v3/resources/swagger.json",
    },
    {
      version: "5.2",
      url: "https://api.ed-fi.org/v7.3/api/metadata/data/v3/resources/swagger.json",
    },
  ];

  constructor() {
    // Load configuration from environment variables
    this.config = {
      customBaseUrl: process.env.ED_FI_CUSTOM_BASE_URL,
      cacheDirectory: process.env.ED_FI_CACHE_DIR || path.join(os.tmpdir(), 'ed-fi-mcp-cache'),
    };

    this.cacheDir = this.config.cacheDirectory!;
    this.ensureCacheDirectory();

    this.server = new Server(
      {
        name: "ed-fi-data-standard-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private ensureCacheDirectory(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCacheFilePath(url: string): string {
    // Create a safe filename from the URL
    const filename = url.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
    return path.join(this.cacheDir, filename);
  }

  private async loadFromCache(url: string): Promise<OpenAPISpec | null> {
    try {
      const cacheFile = this.getCacheFilePath(url);
      if (fs.existsSync(cacheFile)) {
        const stats = fs.statSync(cacheFile);
        const cacheAge = Date.now() - stats.mtime.getTime();
        // Cache for 1 hour
        if (cacheAge < 60 * 60 * 1000) {
          const data = fs.readFileSync(cacheFile, 'utf8');
          return JSON.parse(data);
        }
      }
    } catch (error) {
      // Ignore cache errors, will fetch fresh data
    }
    return null;
  }

  private async saveToCache(url: string, spec: OpenAPISpec): Promise<void> {
    try {
      const cacheFile = this.getCacheFilePath(url);
      fs.writeFileSync(cacheFile, JSON.stringify(spec, null, 2));
    } catch (error) {
      // Ignore cache save errors
    }
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "set_data_standard_version",
            description: "Set the Ed-Fi Data Standard version to use (4.0, 5.0, 5.1, or 5.2)",
            inputSchema: {
              type: "object",
              properties: {
                version: {
                  type: "string",
                  enum: ["4.0", "5.0", "5.1", "5.2"],
                  description: "The Ed-Fi Data Standard version",
                },
              },
              required: ["version"],
            },
          },
          {
            name: "set_custom_data_standard_url",
            description: "Set a custom OpenAPI specification URL for the Ed-Fi Data Standard",
            inputSchema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "The URL to the custom OpenAPI specification",
                },
                name: {
                  type: "string",
                  description: "A descriptive name for this custom data standard",
                },
              },
              required: ["url", "name"],
            },
          },
          {
            name: "list_available_versions",
            description: "List all available Ed-Fi Data Standard versions",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "search_endpoints",
            description: "Search for API endpoints in the current OpenAPI specification",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search term to find matching endpoints (e.g., 'student', 'school', 'assessment')",
                },
              },
              required: ["query"],
            },
          },
          {
            name: "get_endpoint_details",
            description: "Get detailed information about a specific API endpoint",
            inputSchema: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "The API endpoint path (e.g., '/ed-fi/students')",
                },
                method: {
                  type: "string",
                  enum: ["GET", "POST", "PUT", "DELETE"],
                  description: "HTTP method for the endpoint",
                  default: "GET",
                },
              },
              required: ["path"],
            },
          },
          {
            name: "search_schemas",
            description: "Search for data models/schemas in the current OpenAPI specification",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search term to find matching schemas (e.g., 'Student', 'School', 'Assessment')",
                },
              },
              required: ["query"],
            },
          },
          {
            name: "get_schema_details",
            description: "Get detailed information about a specific data model/schema",
            inputSchema: {
              type: "object",
              properties: {
                schemaName: {
                  type: "string",
                  description: "The name of the schema to get details for",
                },
              },
              required: ["schemaName"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case "list_available_versions":
          return await this.listAvailableVersions();

        case "set_data_standard_version":
          return await this.setDataStandardVersion(request.params.arguments?.version as string);

        case "set_custom_data_standard_url":
          return await this.setCustomDataStandardUrl(
            request.params.arguments?.url as string,
            request.params.arguments?.name as string
          );

        case "search_endpoints":
          return await this.searchEndpoints(request.params.arguments?.query as string);

        case "get_endpoint_details":
          return await this.getEndpointDetails(
            request.params.arguments?.path as string,
            request.params.arguments?.method as string || "GET"
          );

        case "search_schemas":
          return await this.searchSchemas(request.params.arguments?.query as string);

        case "get_schema_details":
          return await this.getSchemaDetails(request.params.arguments?.schemaName as string);

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      }
    });
  }

  private async listAvailableVersions() {
    let versionsText = `Available Ed-Fi Data Standard versions:

${this.dataStandardVersions
  .map(
    (v) => `• Version ${v.version}: ${v.url}`
  )
  .join("\n")}`;

    if (this.config.customBaseUrl) {
      versionsText += `\n\n📝 Custom base URL configured: ${this.config.customBaseUrl}
You can use set_custom_data_standard_url to load specifications from your custom instance.`;
    }

    versionsText += `\n\nUse set_data_standard_version to select a version and load its OpenAPI specification.
Use set_custom_data_standard_url to load a custom OpenAPI specification.`;

    return {
      content: [
        {
          type: "text",
          text: versionsText,
        },
      ],
    };
  }

  private async setDataStandardVersion(version: string) {
    const versionInfo = this.dataStandardVersions.find((v) => v.version === version);
    
    if (!versionInfo) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid version: ${version}. Available versions: ${this.dataStandardVersions
          .map((v) => v.version)
          .join(", ")}`
      );
    }

    const url = this.config.customBaseUrl 
      ? versionInfo.url.replace(/https:\/\/api\.ed-fi\.org\/[^\/]+/, this.config.customBaseUrl)
      : versionInfo.url;

    return await this.loadOpenAPISpec(url, `Ed-Fi Data Standard ${version}`);
  }

  private async setCustomDataStandardUrl(url: string, name: string) {
    if (!url || !name) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Both URL and name are required for custom data standard"
      );
    }

    return await this.loadOpenAPISpec(url, name);
  }

  private async loadOpenAPISpec(url: string, displayName: string) {
    try {
      // Try to load from cache first
      let spec = await this.loadFromCache(url);
      let fromCache = true;

      if (!spec) {
        const response = await axios.get(url);
        spec = response.data;
        fromCache = false;
        
        // Save to cache for future use
        if (spec) {
          await this.saveToCache(url, spec);
        }
      }

      this.currentSpec = spec;
      this.currentVersion = displayName;

      const endpointCount = Object.keys(this.currentSpec?.paths || {}).length;
      const schemaCount = Object.keys(this.currentSpec?.components?.schemas || {}).length;

      return {
        content: [
          {
            type: "text",
            text: `✅ Successfully loaded ${displayName}${fromCache ? ' (from cache)' : ''}

📋 API Overview:
• Title: ${this.currentSpec?.info?.title || "Ed-Fi API"}
• Version: ${this.currentSpec?.info?.version || "Unknown"}
• Endpoints: ${endpointCount}
• Data Models: ${schemaCount}
• Source: ${url}

You can now:
• Search for endpoints using search_endpoints
• Get endpoint details using get_endpoint_details  
• Search for data models using search_schemas
• Get schema details using get_schema_details`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to load OpenAPI specification from ${url}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private async searchEndpoints(query: string) {
    if (!this.currentSpec) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "No Data Standard version loaded. Use set_data_standard_version first."
      );
    }

    const searchTerm = query.toLowerCase();
    const matchingEndpoints: Array<{ path: string; methods: string[]; summary?: string }> = [];

    for (const [path, pathObj] of Object.entries(this.currentSpec.paths)) {
      const methods = Object.keys(pathObj).filter(method => 
        ["get", "post", "put", "delete", "patch"].includes(method.toLowerCase())
      );

      // Check if path contains the search term
      if (path.toLowerCase().includes(searchTerm)) {
        matchingEndpoints.push({
          path,
          methods: methods.map(m => m.toUpperCase()),
          summary: pathObj.get?.summary || pathObj.post?.summary || "No summary available"
        });
        continue;
      }

      // Check if any operation summary/description contains the search term
      for (const method of methods) {
        const operation = pathObj[method];
        if (operation && (
          operation.summary?.toLowerCase().includes(searchTerm) ||
          operation.description?.toLowerCase().includes(searchTerm) ||
          operation.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm))
        )) {
          matchingEndpoints.push({
            path,
            methods: methods.map(m => m.toUpperCase()),
            summary: operation.summary || "No summary available"
          });
          break;
        }
      }
    }

    if (matchingEndpoints.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No endpoints found matching "${query}". Try a different search term or use list_available_versions to see what's available.`,
          },
        ],
      };
    }

    const resultText = `Found ${matchingEndpoints.length} endpoint(s) matching "${query}":

${matchingEndpoints
  .slice(0, 20) // Limit to first 20 results
  .map(
    (endpoint) =>
      `• ${endpoint.path} [${endpoint.methods.join(", ")}]\n  ${endpoint.summary}`
  )
  .join("\n\n")}

${matchingEndpoints.length > 20 ? "\n... and more. Try a more specific search term." : ""}

Use get_endpoint_details with a specific path to get more information.`;

    return {
      content: [
        {
          type: "text",
          text: resultText,
        },
      ],
    };
  }

  private async getEndpointDetails(path: string, method: string) {
    if (!this.currentSpec) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "No Data Standard version loaded. Use set_data_standard_version first."
      );
    }

    const pathObj = this.currentSpec.paths[path];
    if (!pathObj) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Endpoint not found: ${path}. Use search_endpoints to find available endpoints.`
      );
    }

    const operation = pathObj[method.toLowerCase()];
    if (!operation) {
      const availableMethods = Object.keys(pathObj).filter(m => 
        ["get", "post", "put", "delete", "patch"].includes(m.toLowerCase())
      );
      throw new McpError(
        ErrorCode.InvalidParams,
        `Method ${method} not available for ${path}. Available methods: ${availableMethods.join(", ")}`
      );
    }

    let detailsText = `# ${method} ${path}

**Summary:** ${operation.summary || "No summary available"}

**Description:** ${operation.description || "No description available"}`;

    if (operation.tags && operation.tags.length > 0) {
      detailsText += `\n\n**Tags:** ${operation.tags.join(", ")}`;
    }

    if (operation.parameters && operation.parameters.length > 0) {
      detailsText += `\n\n## Parameters:\n${operation.parameters
        .map((param: any) => 
          `• **${param.name}** (${param.in}) - ${param.description || "No description"} ${param.required ? "[Required]" : "[Optional]"}`
        )
        .join("\n")}`;
    }

    if (operation.requestBody) {
      detailsText += `\n\n## Request Body:`;
      const content = operation.requestBody.content;
      if (content) {
        for (const [mediaType, mediaTypeObj] of Object.entries(content)) {
          detailsText += `\n**${mediaType}:**`;
          if ((mediaTypeObj as any).schema) {
            const schema = (mediaTypeObj as any).schema;
            if (schema.$ref) {
              const schemaName = schema.$ref.split('/').pop();
              detailsText += ` Schema reference: ${schemaName}`;
            } else if (schema.type) {
              detailsText += ` Type: ${schema.type}`;
            }
          }
        }
      }
    }

    if (operation.responses) {
      detailsText += `\n\n## Responses:`;
      for (const [statusCode, response] of Object.entries(operation.responses)) {
        detailsText += `\n**${statusCode}:** ${(response as any).description || "No description"}`;
      }
    }

    return {
      content: [
        {
          type: "text",
          text: detailsText,
        },
      ],
    };
  }

  private async searchSchemas(query: string) {
    if (!this.currentSpec || !this.currentSpec.components?.schemas) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "No Data Standard version loaded or no schemas available. Use set_data_standard_version first."
      );
    }

    const searchTerm = query.toLowerCase();
    const matchingSchemas: Array<{ name: string; description?: string }> = [];

    for (const [schemaName, schema] of Object.entries(this.currentSpec.components.schemas)) {
      if (schemaName.toLowerCase().includes(searchTerm) ||
          (schema as any).description?.toLowerCase().includes(searchTerm) ||
          (schema as any).title?.toLowerCase().includes(searchTerm)) {
        matchingSchemas.push({
          name: schemaName,
          description: (schema as any).description || (schema as any).title || "No description available"
        });
      }
    }

    if (matchingSchemas.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No schemas found matching "${query}". Try a different search term.`,
          },
        ],
      };
    }

    const resultText = `Found ${matchingSchemas.length} schema(s) matching "${query}":

${matchingSchemas
  .slice(0, 20) // Limit to first 20 results
  .map(
    (schema) => `• **${schema.name}**\n  ${schema.description}`
  )
  .join("\n\n")}

${matchingSchemas.length > 20 ? "\n... and more. Try a more specific search term." : ""}

Use get_schema_details with a specific schema name to get more information.`;

    return {
      content: [
        {
          type: "text",
          text: resultText,
        },
      ],
    };
  }

  private async getSchemaDetails(schemaName: string) {
    if (!this.currentSpec || !this.currentSpec.components?.schemas) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "No Data Standard version loaded or no schemas available. Use set_data_standard_version first."
      );
    }

    const schema = this.currentSpec.components.schemas[schemaName];
    if (!schema) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Schema not found: ${schemaName}. Use search_schemas to find available schemas.`
      );
    }

    let detailsText = `# ${schemaName} Schema`;

    if ((schema as any).title) {
      detailsText += `\n\n**Title:** ${(schema as any).title}`;
    }

    if ((schema as any).description) {
      detailsText += `\n\n**Description:** ${(schema as any).description}`;
    }

    detailsText += `\n\n**Type:** ${(schema as any).type || "object"}`;

    if ((schema as any).properties) {
      detailsText += `\n\n## Properties:`;
      for (const [propName, propSchema] of Object.entries((schema as any).properties)) {
        const prop = propSchema as any;
        detailsText += `\n• **${propName}** (${prop.type || "unknown"})`;
        if (prop.description) {
          detailsText += ` - ${prop.description}`;
        }
        if ((schema as any).required && (schema as any).required.includes(propName)) {
          detailsText += ` [Required]`;
        }
        if (prop.format) {
          detailsText += ` (format: ${prop.format})`;
        }
        if (prop.enum) {
          detailsText += ` (enum: ${prop.enum.join(", ")})`;
        }
      }
    }

    if ((schema as any).required) {
      detailsText += `\n\n## Required Properties:\n${(schema as any).required.map((req: string) => `• ${req}`).join("\n")}`;
    }

    return {
      content: [
        {
          type: "text",
          text: detailsText,
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Ed-Fi Data Standard MCP server running on stdio");
  }
}

// Start the server
const server = new EdFiMCPServer();
server.run().catch(console.error);