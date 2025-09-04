#!/usr/bin/env node

import { createInterface, Interface } from 'readline';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DiagramGenerator } from './diagram-generator.js';

interface DataStandardVersion {
  version: string;
  url: string;
}

interface OpenAPISpec {
  paths?: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
  };
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
}

interface DiagramOptions {
  format: 'mermaid' | 'plantuml' | 'graphviz';
  includeProperties?: boolean;
  includeDescriptions?: boolean;
  filterDomains?: string[];
  maxEntities?: number;
}

interface EndpointMatch {
  path: string;
  method: string;
  summary: string;
  description: string;
}

interface SchemaMatch {
  name: string;
  type: string;
  description: string;
  properties: number;
}

interface Relationship {
  from: string;
  to: string;
  property: string;
  type: string;
}

class EdFiCLI {
  private currentSpec: OpenAPISpec | null = null;
  private currentVersion: string | null = null;
  private currentVersionNumber: string | null = null;
  private cacheDir: string;
  private diagramGenerator: DiagramGenerator;
  private rl: Interface;

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
    this.cacheDir = path.join(os.tmpdir(), 'ed-fi-mcp-cache');
    this.diagramGenerator = new DiagramGenerator();
    
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.ensureCacheDirectory();
  }

  private ensureCacheDirectory(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCacheFilePath(url: string): string {
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

  private async showVersionInfo(): Promise<void> {
    const cliVersion = this.getCliVersion();
    console.log('🔧 Ed-Fi SDK MCP CLI - Version Information');
    console.log('=========================================');
    console.log(`CLI Tool Version: ${cliVersion}`);
    console.log(`Current Data Standard: ${this.currentVersionNumber || 'None set'}`);
    if (this.currentSpec) {
      console.log(`API Title: ${this.currentSpec.info?.title || 'Unknown'}`);
      console.log(`API Version: ${this.currentSpec.info?.version || 'Unknown'}`);
      const endpointCount = Object.keys(this.currentSpec.paths || {}).length;
      const schemaCount = Object.keys(this.currentSpec.components?.schemas || {}).length;
      console.log(`Endpoints: ${endpointCount}`);
      console.log(`Schemas: ${schemaCount}`);
    }
    console.log(`Cache Directory: ${this.cacheDir}`);
    console.log('');
    console.log('📚 Getting Help:');
    console.log('• Type "help" for available commands');
    console.log('• Read CLI-USAGE.md for detailed usage guide');
    console.log('• Visit https://docs.ed-fi.org/ for comprehensive documentation');
    console.log('• Report issues: https://github.com/Ed-Fi-Exchange-OSS/Ed-Fi-SDK-MCP/issues');
  }

  private getCliVersion(): string {
    try {
      // Read package.json to get version info
      const packagePath = path.join(path.dirname(__dirname), 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return `${packageJson.version}`;
      }
    } catch (error) {
      // Fallback if package.json can't be read
    }
    return '0.1.0';
  }

  async start(): Promise<void> {
    console.log('🎓 Ed-Fi Data Standard SDK CLI');
    console.log('=============================');
    console.log(`Version: ${this.getCliVersion()}`);
    console.log('Type "help" for available commands or "exit" to quit.\n');

    await this.showWelcomeMessage();
    await this.commandLoop();
  }

  private async showWelcomeMessage(): Promise<void> {
    console.log('Available Commands:');
    console.log('  version <4.0|5.0|5.1|5.2>     - Set Ed-Fi Data Standard version');
    console.log('  versions                      - List all available versions');
    console.log('  custom <url> <name>           - Set custom OpenAPI specification URL');
    console.log('  search endpoints <query>      - Search for API endpoints');
    console.log('  search schemas <query>        - Search for data schemas');
    console.log('  endpoint <path> [method]      - Get endpoint details');
    console.log('  schema <name>                 - Get schema details');
    console.log('  diagram [format] [domains...] - Generate entity diagram (mermaid|plantuml|graphviz)');
    console.log('  relationships [entity]        - List entity relationships');
    console.log('  domains [domain]              - Get entities by domain');
    console.log('  export <format> [filename]    - Export diagram as text');
    console.log('  info                          - Show version and build information');
    console.log('  help                          - Show this help message');
    console.log('  exit                          - Exit the CLI');
    console.log('');
    console.log('📚 Documentation:');
    console.log('  • CLI Usage Guide: CLI-USAGE.md in the project root');
    console.log('  • Ed-Fi Documentation: https://docs.ed-fi.org/');
    console.log('  • Ed-Fi API Client Guide: https://docs.ed-fi.org/reference/ods-api/');
    console.log('  • GitHub Repository: https://github.com/Ed-Fi-Exchange-OSS/Ed-Fi-SDK-MCP');
    console.log('');
  }

  private async commandLoop(): Promise<void> {
    while (true) {
      const input = await this.prompt('ed-fi> ');
      const trimmed = input.trim();
      
      if (!trimmed) continue;
      
      const [command, ...args] = trimmed.split(' ');
      
      try {
        switch (command.toLowerCase()) {
          case 'exit':
          case 'quit':
          case 'q':
            console.log('Goodbye! 👋');
            this.rl.close();
            return;
            
          case 'help':
          case 'h':
            await this.showWelcomeMessage();
            break;
            
          case 'info':
            await this.showVersionInfo();
            break;
            
          case 'version':
          case 'v':
            if (args.length === 0) {
              console.log(`Current version: ${this.currentVersion || 'None set'}`);
            } else {
              await this.setVersion(args[0]);
            }
            break;
            
          case 'versions':
            await this.listVersions();
            break;
            
          case 'custom':
            if (args.length < 2) {
              console.log('Usage: custom <url> <name>');
            } else {
              await this.setCustomUrl(args[0], args.slice(1).join(' '));
            }
            break;
            
          case 'search':
            if (args.length < 2) {
              console.log('Usage: search <endpoints|schemas> <query>');
            } else if (args[0] === 'endpoints') {
              await this.searchEndpoints(args.slice(1).join(' '));
            } else if (args[0] === 'schemas') {
              await this.searchSchemas(args.slice(1).join(' '));
            } else {
              console.log('Search type must be "endpoints" or "schemas"');
            }
            break;
            
          case 'endpoint':
            if (args.length === 0) {
              console.log('Usage: endpoint <path> [method]');
            } else {
              await this.getEndpointDetails(args[0], args[1] || 'GET');
            }
            break;
            
          case 'schema':
            if (args.length === 0) {
              console.log('Usage: schema <name>');
            } else {
              await this.getSchemaDetails(args[0]);
            }
            break;
            
          case 'diagram':
            await this.generateDiagram(args);
            break;
            
          case 'relationships':
            await this.listRelationships(args[0]);
            break;
            
          case 'domains':
            await this.getDomains(args[0]);
            break;
            
          case 'export':
            if (args.length === 0) {
              console.log('Usage: export <format> [filename]');
            } else {
              await this.exportDiagram(args[0], args[1]);
            }
            break;
            
          default:
            console.log(`❌ Unknown command: "${command}"`);
            console.log('💡 Type "help" to see all available commands');
            console.log('💡 Type "info" for version and build information');
            console.log('💡 Read CLI-USAGE.md for detailed examples and troubleshooting');
            
            // Suggest similar commands
            const availableCommands = ['help', 'info', 'version', 'versions', 'custom', 'search', 'endpoint', 'schema', 'diagram', 'relationships', 'domains', 'export', 'exit'];
            const suggestions = availableCommands.filter(cmd => 
              cmd.includes(command.toLowerCase()) || command.toLowerCase().includes(cmd)
            );
            if (suggestions.length > 0) {
              console.log(`💡 Did you mean: ${suggestions.join(', ')}?`);
            }
        }
      } catch (error) {
        console.error('❌ Error:', (error as Error).message);
      }
      
      console.log(); // Add spacing between commands
    }
  }

  private async prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => resolve(answer));
    });
  }

  async setVersion(version: string): Promise<void> {
    try {
      console.log(`🔄 Setting Ed-Fi Data Standard version to ${version}...`);
      
      const versionData = this.dataStandardVersions.find(v => v.version === version);
      if (!versionData) {
        throw new Error(`Invalid version: ${version}. Available versions: ${this.dataStandardVersions.map(v => v.version).join(', ')}`);
      }

      // Try to load from cache first
      let spec = await this.loadFromCache(versionData.url);
      let fromCache = false;

      if (!spec) {
        console.log('📥 Downloading OpenAPI specification...');
        const response = await axios.get<OpenAPISpec>(versionData.url, {
          timeout: 30000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Ed-Fi-MCP-CLI/1.0'
          }
        });
        spec = response.data;
        await this.saveToCache(versionData.url, spec);
      } else {
        fromCache = true;
      }

      this.currentSpec = spec;
      this.currentVersion = versionData.url;
      this.currentVersionNumber = version;

      // Generate analytics
      const endpointCount = Object.keys(spec.paths || {}).length;
      const schemaCount = Object.keys(spec.components?.schemas || {}).length;

      console.log(`✅ Successfully loaded Ed-Fi Data Standard ${version}${fromCache ? ' (from cache)' : ''}`);
      console.log('');
      console.log('📋 API Overview:');
      console.log(`• Title: ${spec.info?.title || 'Ed-Fi API'}`);
      console.log(`• Version: ${spec.info?.version || 'Unknown'}`);
      console.log(`• Endpoints: ${endpointCount}`);
      console.log(`• Data Models: ${schemaCount}`);
      console.log(`• Source: ${versionData.url}`);

    } catch (error) {
      console.error('❌ Failed to set version:', (error as Error).message);
    }
  }

  async listVersions(): Promise<void> {
    console.log('Available Ed-Fi Data Standard versions:');
    console.log('');
    this.dataStandardVersions.forEach(version => {
      console.log(`• Version ${version.version}: ${version.url}`);
    });
    console.log('');
    console.log('Use set_data_standard_version to select a version and load its OpenAPI specification.');
    console.log('Use set_custom_data_standard_url to load a custom OpenAPI specification.');
  }

  async setCustomUrl(url: string, name: string): Promise<void> {
    try {
      console.log(`🔄 Setting custom data standard URL: ${name}...`);
      
      let spec = await this.loadFromCache(url);
      let fromCache = false;

      if (!spec) {
        console.log('📥 Downloading OpenAPI specification...');
        const response = await axios.get<OpenAPISpec>(url, {
          timeout: 30000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Ed-Fi-MCP-CLI/1.0'
          }
        });
        spec = response.data;
        await this.saveToCache(url, spec);
      } else {
        fromCache = true;
      }

      this.currentSpec = spec;
      this.currentVersion = url;
      this.currentVersionNumber = name;

      const endpointCount = Object.keys(spec.paths || {}).length;
      const schemaCount = Object.keys(spec.components?.schemas || {}).length;

      console.log(`✅ Successfully loaded custom data standard: ${name}${fromCache ? ' (from cache)' : ''}`);
      console.log('');
      console.log('📋 API Overview:');
      console.log(`• Title: ${spec.info?.title || 'Custom API'}`);
      console.log(`• Version: ${spec.info?.version || 'Unknown'}`);
      console.log(`• Endpoints: ${endpointCount}`);
      console.log(`• Data Models: ${schemaCount}`);
      console.log(`• Source: ${url}`);

    } catch (error) {
      console.error('❌ Failed to set custom URL:', (error as Error).message);
    }
  }

  async searchEndpoints(query: string): Promise<void> {
    if (!this.currentSpec) {
      console.log('❌ No Data Standard version loaded. Use "version <version>" first.');
      return;
    }

    try {
      console.log(`🔍 Searching endpoints for: "${query}"...`);
      
      const paths = this.currentSpec.paths || {};
      const matches: EndpointMatch[] = [];
      const queryLower = query.toLowerCase();

      for (const [path, methods] of Object.entries(paths)) {
        if (path.toLowerCase().includes(queryLower)) {
          for (const [method, details] of Object.entries(methods)) {
            if (method.toLowerCase() !== 'parameters') {
              const methodDetails = details as any;
              matches.push({
                path,
                method: method.toUpperCase(),
                summary: methodDetails.summary || 'No summary available',
                description: methodDetails.description || ''
              });
            }
          }
        }
      }

      if (matches.length === 0) {
        console.log('No matching endpoints found.');
        return;
      }

      console.log(`Found ${matches.length} matching endpoint(s):`);
      console.log('');

      matches.slice(0, 10).forEach(match => {
        console.log(`${match.method} ${match.path}`);
        console.log(`  Summary: ${match.summary}`);
        if (match.description) {
          console.log(`  Description: ${match.description.substring(0, 100)}${match.description.length > 100 ? '...' : ''}`);
        }
        console.log('');
      });

      if (matches.length > 10) {
        console.log(`... and ${matches.length - 10} more results. Refine your search for more specific results.`);
      }

    } catch (error) {
      console.error('❌ Failed to search endpoints:', (error as Error).message);
    }
  }

  async searchSchemas(query: string): Promise<void> {
    if (!this.currentSpec) {
      console.log('❌ No Data Standard version loaded. Use "version <version>" first.');
      return;
    }

    try {
      console.log(`🔍 Searching schemas for: "${query}"...`);
      
      const schemas = this.currentSpec.components?.schemas || {};
      const matches: SchemaMatch[] = [];
      const queryLower = query.toLowerCase();

      for (const [name, schema] of Object.entries(schemas)) {
        if (name.toLowerCase().includes(queryLower)) {
          matches.push({
            name,
            type: schema.type || 'object',
            description: schema.description || 'No description available',
            properties: Object.keys(schema.properties || {}).length
          });
        }
      }

      if (matches.length === 0) {
        console.log('No matching schemas found.');
        return;
      }

      console.log(`Found ${matches.length} matching schema(s):`);
      console.log('');

      matches.slice(0, 10).forEach(match => {
        console.log(`📄 ${match.name}`);
        console.log(`  Type: ${match.type}`);
        console.log(`  Properties: ${match.properties}`);
        console.log(`  Description: ${match.description.substring(0, 100)}${match.description.length > 100 ? '...' : ''}`);
        console.log('');
      });

      if (matches.length > 10) {
        console.log(`... and ${matches.length - 10} more results. Refine your search for more specific results.`);
      }

    } catch (error) {
      console.error('❌ Failed to search schemas:', (error as Error).message);
    }
  }

  async getEndpointDetails(path: string, method: string = 'GET'): Promise<void> {
    if (!this.currentSpec) {
      console.log('❌ No Data Standard version loaded. Use "version <version>" first.');
      return;
    }

    try {
      console.log(`📋 Getting details for endpoint: ${method} ${path}...`);
      
      const pathInfo = this.currentSpec.paths?.[path];
      if (!pathInfo) {
        console.log(`❌ Endpoint not found: ${path}`);
        console.log('Use "search endpoints <query>" to find available endpoints.');
        return;
      }

      const methodInfo = pathInfo[method.toLowerCase()];
      if (!methodInfo) {
        const availableMethods = Object.keys(pathInfo).filter(k => k !== 'parameters');
        console.log(`❌ Method ${method} not found for ${path}`);
        console.log(`Available methods: ${availableMethods.join(', ').toUpperCase()}`);
        return;
      }

      console.log(`\n🔗 ${method.toUpperCase()} ${path}`);
      console.log('═'.repeat(60));
      
      if (methodInfo.summary) {
        console.log(`Summary: ${methodInfo.summary}`);
      }
      
      if (methodInfo.description) {
        console.log(`Description: ${methodInfo.description}`);
      }

      if (methodInfo.parameters && methodInfo.parameters.length > 0) {
        console.log('\nParameters:');
        methodInfo.parameters.forEach((param: any) => {
          const required = param.required ? '(required)' : '(optional)';
          console.log(`  • ${param.name} ${required}: ${param.description || 'No description'}`);
        });
      }

      if (methodInfo.requestBody) {
        console.log('\nRequest Body:');
        const content = methodInfo.requestBody.content;
        if (content) {
          Object.keys(content).forEach(mediaType => {
            console.log(`  • Media Type: ${mediaType}`);
            const schema = content[mediaType].schema;
            if (schema?.$ref) {
              const schemaName = schema.$ref.split('/').pop();
              console.log(`  • Schema: ${schemaName}`);
            }
          });
        }
      }

      if (methodInfo.responses) {
        console.log('\nResponses:');
        Object.entries(methodInfo.responses).forEach(([code, response]: [string, any]) => {
          console.log(`  • ${code}: ${response.description || 'No description'}`);
        });
      }

    } catch (error) {
      console.error('❌ Failed to get endpoint details:', (error as Error).message);
    }
  }

  async getSchemaDetails(schemaName: string): Promise<void> {
    if (!this.currentSpec) {
      console.log('❌ No Data Standard version loaded. Use "version <version>" first.');
      return;
    }

    try {
      console.log(`📋 Getting details for schema: ${schemaName}...`);
      
      const schema = this.currentSpec.components?.schemas?.[schemaName];
      if (!schema) {
        console.log(`❌ Schema not found: ${schemaName}`);
        console.log('Use "search schemas <query>" to find available schemas.');
        return;
      }

      console.log(`\n📄 ${schemaName}`);
      console.log('═'.repeat(60));
      
      if (schema.description) {
        console.log(`Description: ${schema.description}`);
      }
      
      console.log(`Type: ${schema.type || 'object'}`);

      if (schema.properties) {
        console.log('\nProperties:');
        const required = schema.required || [];
        
        Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
          const isRequired = required.includes(propName) ? '(required)' : '(optional)';
          const type = propSchema.type || (propSchema.$ref ? 'reference' : 'unknown');
          console.log(`  • ${propName} ${isRequired}: ${type}`);
          if (propSchema.description) {
            console.log(`    ${propSchema.description}`);
          }
        });
      }

      if (schema.allOf || schema.oneOf || schema.anyOf) {
        console.log('\nComposition:');
        if (schema.allOf) console.log('  • Uses allOf composition');
        if (schema.oneOf) console.log('  • Uses oneOf composition');
        if (schema.anyOf) console.log('  • Uses anyOf composition');
      }

    } catch (error) {
      console.error('❌ Failed to get schema details:', (error as Error).message);
    }
  }

  async generateDiagram(args: string[]): Promise<void> {
    if (!this.currentSpec) {
      console.log('❌ No Data Standard version loaded. Use "version <version>" first.');
      return;
    }

    try {
      console.log('🎨 Generating entity diagram...');
      
      const format = args[0] || 'mermaid';
      const filterDomains = args.slice(1);
      
      // Validate format
      if (!['mermaid', 'plantuml', 'graphviz'].includes(format)) {
        console.log('❌ Invalid format. Use: mermaid, plantuml, or graphviz');
        return;
      }
      
      const options: DiagramOptions = {
        format: format as 'mermaid' | 'plantuml' | 'graphviz',
        includeProperties: true,
        includeDescriptions: false,
        maxEntities: 20
      };

      if (filterDomains.length > 0) {
        options.filterDomains = filterDomains;
      }

      // Use the diagram generator
      this.diagramGenerator.analyzeOpenAPISpec(this.currentSpec);
      const result = this.diagramGenerator.generateDiagram(options);
      
      console.log(`\n# Entity Relationship Diagram (${format.toUpperCase()})`);
      console.log(`\nGenerated from **Ed-Fi Data Standard ${this.currentVersionNumber}**`);
      console.log(`\n## Statistics:`);
      console.log(`• Total entities: ${Object.keys(this.currentSpec.components?.schemas || {}).length}`);
      console.log(`• Format: ${format}`);
      if (filterDomains.length > 0) {
        console.log(`• Filtered domains: ${filterDomains.join(', ')}`);
      }
      console.log(`\n## Diagram:\n`);
      console.log('```' + format);
      console.log(result);
      console.log('```');
      console.log('\n## Usage Notes:');
      console.log('- Copy the diagram code above and paste it into a compatible viewer');
      console.log('- For Mermaid: Use GitHub, GitLab, or Mermaid Live Editor');
      console.log('- For PlantUML: Use PlantUML online editor or IDE plugins');
      console.log('- For Graphviz: Use Graphviz online or local installation');

    } catch (error) {
      console.error('❌ Failed to generate diagram:', (error as Error).message);
    }
  }

  async listRelationships(entityName?: string): Promise<void> {
    if (!this.currentSpec) {
      console.log('❌ No Data Standard version loaded. Use "version <version>" first.');
      return;
    }

    try {
      console.log('🔗 Listing entity relationships...');
      
      const schemas = this.currentSpec.components?.schemas || {};
      const relationships: Relationship[] = [];

      for (const [schemaName, schema] of Object.entries(schemas)) {
        if (entityName && !schemaName.toLowerCase().includes(entityName.toLowerCase())) {
          continue;
        }

        if (schema.properties) {
          for (const [propName, propSchema] of Object.entries(schema.properties)) {
            if ((propSchema as any).$ref) {
              const referencedSchema = (propSchema as any).$ref.split('/').pop();
              relationships.push({
                from: schemaName,
                to: referencedSchema,
                property: propName,
                type: 'reference'
              });
            } else if ((propSchema as any).type === 'array' && (propSchema as any).items?.$ref) {
              const referencedSchema = (propSchema as any).items.$ref.split('/').pop();
              relationships.push({
                from: schemaName,
                to: referencedSchema,
                property: propName,
                type: 'array'
              });
            }
          }
        }
      }

      if (relationships.length === 0) {
        console.log('No relationships found.');
        return;
      }

      console.log(`\nFound ${relationships.length} relationship(s):`);
      console.log('');

      relationships.slice(0, 20).forEach(rel => {
        console.log(`${rel.from} --${rel.type}--> ${rel.to} (via ${rel.property})`);
      });

      if (relationships.length > 20) {
        console.log(`\n... and ${relationships.length - 20} more relationships.`);
      }

    } catch (error) {
      console.error('❌ Failed to list relationships:', (error as Error).message);
    }
  }

  async getDomains(domain?: string): Promise<void> {
    if (!this.currentSpec) {
      console.log('❌ No Data Standard version loaded. Use "version <version>" first.');
      return;
    }

    try {
      console.log('🏛️ Getting entities by domain...');
      
      const schemas = this.currentSpec.components?.schemas || {};
      const entities = Object.keys(schemas);

      // Simple domain grouping based on naming patterns
      const domains: Record<string, string[]> = {};
      entities.forEach(entity => {
        const entityLower = entity.toLowerCase();
        let domainName = 'Other';

        if (entityLower.includes('student')) domainName = 'Student';
        else if (entityLower.includes('staff')) domainName = 'Staff';
        else if (entityLower.includes('school')) domainName = 'School';
        else if (entityLower.includes('assessment')) domainName = 'Assessment';
        else if (entityLower.includes('grade') || entityLower.includes('gradebook')) domainName = 'Grading';
        else if (entityLower.includes('program')) domainName = 'Program';
        else if (entityLower.includes('course')) domainName = 'Course';
        else if (entityLower.includes('discipline')) domainName = 'Discipline';
        else if (entityLower.includes('attendance')) domainName = 'Attendance';

        if (!domains[domainName]) {
          domains[domainName] = [];
        }
        domains[domainName].push(entity);
      });

      if (domain) {
        const domainEntities = domains[domain];
        if (!domainEntities) {
          console.log(`❌ Domain "${domain}" not found.`);
          console.log(`Available domains: ${Object.keys(domains).join(', ')}`);
          return;
        }

        console.log(`\n## ${domain} Domain (${domainEntities.length} entities)`);
        domainEntities.forEach(entity => {
          console.log(`• ${entity}`);
        });
      } else {
        console.log('\n# Entities by Domain\n');
        Object.entries(domains).forEach(([domainName, entities]) => {
          console.log(`## ${domainName} (${entities.length} entities)`);
          entities.slice(0, 10).forEach(entity => {
            console.log(`• ${entity}`);
          });
          if (entities.length > 10) {
            console.log(`... and ${entities.length - 10} more`);
          }
          console.log('');
        });
        
        console.log('Use "domains <domain>" to see all entities in a specific domain.');
      }

    } catch (error) {
      console.error('❌ Failed to get domains:', (error as Error).message);
    }
  }

  async exportDiagram(format: string, filename?: string): Promise<void> {
    if (!this.currentSpec) {
      console.log('❌ No Data Standard version loaded. Use "version <version>" first.');
      return;
    }

    try {
      console.log(`💾 Exporting diagram as ${format}...`);
      
      // Validate format
      if (!['mermaid', 'plantuml', 'graphviz'].includes(format)) {
        console.log('❌ Invalid format. Use: mermaid, plantuml, or graphviz');
        return;
      }
      
      const options: DiagramOptions = {
        format: format as 'mermaid' | 'plantuml' | 'graphviz',
        includeProperties: true,
        includeDescriptions: false,
        maxEntities: 15
      };

      // Use the diagram generator
      this.diagramGenerator.analyzeOpenAPISpec(this.currentSpec);
      const diagramText = this.diagramGenerator.generateDiagram(options);
      
      const outputFilename = filename || `ed-fi-diagram-${this.currentVersionNumber || 'custom'}.${format === 'mermaid' ? 'md' : format}`;
      const outputPath = path.join(process.cwd(), outputFilename);

      const content = `# Diagram Export (${format.toUpperCase()})

**Generated from:** Ed-Fi Data Standard ${this.currentVersionNumber || 'Custom'}
**Entities included:** ${Math.min(15, Object.keys(this.currentSpec.components?.schemas || {}).length)}
**Format:** ${format}
**Generated:** ${new Date().toISOString()}

## Diagram Text:

\`\`\`${format}
${diagramText}
\`\`\`

## Instructions:
1. Copy the diagram text above
2. Paste into your preferred viewer:
   - **Mermaid**: GitHub/GitLab markdown, Mermaid Live Editor, VS Code with Mermaid extension
   - **PlantUML**: PlantUML online server, IDE plugins
   - **Graphviz**: Graphviz online, local dot command

The diagram has been saved to ${outputPath} for your convenience.`;

      fs.writeFileSync(outputPath, content);

      console.log(`✅ Diagram exported successfully!`);
      console.log(`📁 Saved to: ${outputPath}`);
      console.log(`📊 Format: ${format}`);
      console.log(`📈 Entities: ${Math.min(15, Object.keys(this.currentSpec.components?.schemas || {}).length)}`);

    } catch (error) {
      console.error('❌ Failed to export diagram:', (error as Error).message);
    }
  }
}

// Main execution
if (process.argv[1]?.endsWith('cli.js') || process.argv[1]?.endsWith('cli.ts')) {
  const cli = new EdFiCLI();
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n👋 Goodbye!');
    process.exit(0);
  });
  
  cli.start().catch(console.error);
}

export { EdFiCLI };
