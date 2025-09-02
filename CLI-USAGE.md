# Ed-Fi CLI Usage Guide

## Overview

The Ed-Fi CLI provides a command-line interface to interact with Ed-Fi Data Standard APIs and schemas. You can explore endpoints, search schemas, generate diagrams, and more.

## Getting Started

### 1. Run the Interactive CLI

```bash
npm run cli
```

### 2. Run the Development Version

```bash
npm run cli-dev
```

### 3. Run the Demo

```bash
node src/demo.mjs
```

## Available Commands

### Basic Commands

- `help` - Show all available commands
- `exit` / `quit` / `q` - Exit the CLI
- `version` - Show current Ed-Fi Data Standard version
- `versions` - List all available versions

### Version Management

- `version <4.0|5.0|5.1|5.2>` - Set Ed-Fi Data Standard version
- `custom <url> <name>` - Set custom OpenAPI specification URL

### Search and Discovery

- `search endpoints <query>` - Search for API endpoints
- `search schemas <query>` - Search for data schemas
- `endpoint <path> [method]` - Get detailed endpoint information
- `schema <name>` - Get detailed schema information

### Domain Analysis

- `domains` - List all domains with entity counts
- `domains <domain>` - Get entities for a specific domain
- `relationships [entity]` - List entity relationships

### Diagram Generation

- `diagram [format] [domains...]` - Generate entity diagram
  - Formats: `mermaid`, `plantuml`, `graphviz`
  - Example: `diagram mermaid Student Staff`
- `export <format> [filename]` - Export diagram to file

## Example Session

```
ed-fi> version 5.2
🔄 Setting Ed-Fi Data Standard version to 5.2...
✅ Successfully loaded Ed-Fi Data Standard 5.2

ed-fi> search endpoints student
🔍 Searching endpoints for: "student"...
Found 25 matching endpoint(s):

GET /ed-fi/students
  Summary: Retrieves specific resources using the resource's property values

ed-fi> domains Staff
🏛️ Getting entities by domain...

## Staff Domain (15 entities)
• edFi_staff
• edFi_staffAbsenceEvent
• edFi_openStaffPosition
...

ed-fi> diagram mermaid Staff
🎨 Generating entity diagram...
# Entity Relationship Diagram (MERMAID)
...

ed-fi> export mermaid staff-diagram.md
💾 Exporting diagram as mermaid...
✅ Diagram exported successfully!
📁 Saved to: /path/to/staff-diagram.md

ed-fi> exit
Goodbye! 👋
```

## CLI Features

### 🚀 Fast and Interactive

- Real-time search across endpoints and schemas
- Tab completion for common commands
- Color-coded output for better readability

### 📊 Visual Diagrams

- Generate Mermaid, PlantUML, or Graphviz diagrams
- Filter by specific domains (Student, Staff, Assessment, etc.)
- Export diagrams to files for documentation

### 🔍 Powerful Search

- Search endpoints by name or functionality
- Find schemas by entity type
- Explore relationships between entities

### 💾 Caching

- Automatic caching of OpenAPI specifications
- Faster subsequent loads from cache
- Cache located in system temp directory

### 🌐 Flexible Data Sources

- Support for all Ed-Fi Data Standard versions (4.0, 5.0, 5.1, 5.2)
- Custom OpenAPI specification URLs
- Automatic version detection and validation

## Programmatic Usage

You can also use the CLI programmatically in your own scripts:

```javascript
import { EdFiCLI } from './src/cli-direct.mjs';

const cli = new EdFiCLI();

// Set version
await cli.setVersion('5.2');

// Search for endpoints
await cli.searchEndpoints('student');

// Generate diagram
await cli.generateDiagram(['mermaid', 'Student']);

// Don't forget to close the readline interface
cli.rl.close();
```

## Tips and Tricks

1. **Use specific search terms** - Instead of searching for "data", try "student data" or "assessment data"

2. **Filter diagrams by domain** - Large diagrams can be overwhelming, use domain filters:

   ```
   diagram mermaid Student Assessment
   ```

3. **Export diagrams for documentation** - Save diagrams to include in your project docs:

   ```
   export mermaid student-entities.md
   ```

4. **Check relationships** - Understand how entities connect:

   ```
   relationships Student
   ```

5. **Explore specific endpoints** - Get detailed information about API usage:

   ```
   endpoint /ed-fi/students GET
   ```

## Troubleshooting

### Common Issues

**"No Data Standard version loaded"**

- Solution: Run `version <version>` first to load a specification

**"Network timeout"**

- Solution: Check internet connection, specification downloads may take time

**"Schema not found"**

- Solution: Use `search schemas <query>` to find the correct schema name

**"Endpoint not found"**

- Solution: Use `search endpoints <query>` to find available endpoints

### Getting Help

- Type `help` in the CLI for command reference
- Run `versions` to see available Ed-Fi Data Standard versions
- Use `search` commands to discover available resources

## Advanced Usage

### Custom OpenAPI Specifications

If you have a custom Ed-Fi implementation:

```
custom https://your-api.example.com/swagger.json "My Custom Ed-Fi API"
```

### Batch Operations

Create scripts that combine multiple CLI operations:

```javascript
// Generate multiple domain diagrams
const domains = ['Student', 'Staff', 'Assessment'];
for (const domain of domains) {
  await cli.generateDiagram(['mermaid', domain]);
  await cli.exportDiagram('mermaid', `${domain.toLowerCase()}-diagram.md`);
}
```
