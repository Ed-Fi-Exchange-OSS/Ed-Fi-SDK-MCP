/**
 * Diagram generator for Ed-Fi Data Standard entity relationships
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { getDomainData } from './domains/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EntityProperty {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  format?: string;
  reference?: string; // For $ref properties
}

interface Entity {
  name: string;
  properties: EntityProperty[];
  description?: string;
  relationships: EntityRelationship[];
}

interface EntityRelationship {
  fromEntity: string;
  toEntity: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  property: string;
  description?: string;
}

interface DiagramOptions {
  format: 'mermaid' | 'plantuml' | 'graphviz';
  includeProperties?: boolean;
  includeDescriptions?: boolean;
  filterDomains?: string[];
  maxEntities?: number;
}

export class DiagramGenerator {
  private entities: Map<string, Entity> = new Map();
  private relationships: EntityRelationship[] = [];

  /**
   * Analyze OpenAPI spec and extract entities and relationships
   */
  analyzeOpenAPISpec(spec: any): void {
    this.entities.clear();
    this.relationships = [];

    if (!spec.components?.schemas) {
      return;
    }

    // First pass: Extract entities
    for (const [schemaName, schema] of Object.entries(spec.components.schemas)) {
      this.extractEntity(schemaName, schema as any);
    }

    // Second pass: Extract relationships
    for (const [schemaName, schema] of Object.entries(spec.components.schemas)) {
      this.extractRelationships(schemaName, schema as any);
    }
  }

  private extractEntity(name: string, schema: any): void {
    const entity: Entity = {
      name: name,
      properties: [],
      description: schema.description || schema.title,
      relationships: []
    };

    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const prop = propSchema as any;
        const entityProp: EntityProperty = {
          name: propName,
          type: prop.type || 'object',
          required: schema.required?.includes(propName) || false,
          description: prop.description,
          format: prop.format
        };

        // Check for references to other entities
        if (prop.$ref) {
          entityProp.reference = this.extractSchemaNameFromRef(prop.$ref);
          entityProp.type = 'reference';
        } else if (prop.items?.$ref) {
          entityProp.reference = this.extractSchemaNameFromRef(prop.items.$ref);
          entityProp.type = 'array';
        } else if (prop.allOf?.[0]?.$ref) {
          entityProp.reference = this.extractSchemaNameFromRef(prop.allOf[0].$ref);
          entityProp.type = 'reference';
        }

        entity.properties.push(entityProp);
      }
    }

    this.entities.set(name, entity);
  }

  private extractRelationships(fromEntityName: string, schema: any): void {
    if (!schema.properties) return;

    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const prop = propSchema as any;
      let toEntityName: string | null = null;
      let relationType: EntityRelationship['type'] = 'one-to-one';

      // Direct reference
      if (prop.$ref) {
        toEntityName = this.extractSchemaNameFromRef(prop.$ref);
        relationType = 'one-to-one';
      }
      // Array of references
      else if (prop.items?.$ref) {
        toEntityName = this.extractSchemaNameFromRef(prop.items.$ref);
        relationType = 'one-to-many';
      }
      // AllOf reference
      else if (prop.allOf?.[0]?.$ref) {
        toEntityName = this.extractSchemaNameFromRef(prop.allOf[0].$ref);
        relationType = 'one-to-one';
      }

      if (toEntityName && this.entities.has(toEntityName)) {
        const relationship: EntityRelationship = {
          fromEntity: fromEntityName,
          toEntity: toEntityName,
          type: relationType,
          property: propName,
          description: prop.description
        };

        this.relationships.push(relationship);
      }
    }
  }

  private extractSchemaNameFromRef(ref: string): string {
    return ref.split('/').pop() || '';
  }

  /**
   * Generate diagram in specified format
   */
  generateDiagram(options: DiagramOptions): string {
    switch (options.format) {
      case 'mermaid':
        return this.generateMermaidDiagram(options);
      case 'plantuml':
        return this.generatePlantUMLDiagram(options);
      case 'graphviz':
        return this.generateGraphvizDiagram(options);
      default:
        throw new Error(`Unsupported diagram format: ${options.format}`);
    }
  }

  private generateMermaidDiagram(options: DiagramOptions): string {
    let diagram = 'erDiagram\n';

    // Add entities
    const entitiesToInclude = this.getFilteredEntities(options);
    for (const entity of entitiesToInclude) {
      diagram += `    ${this.sanitizeEntityName(entity.name)} {\n`;
      
      if (options.includeProperties !== false) {
        for (const prop of entity.properties.slice(0, 10)) { // Limit properties for readability
          const typeDisplay = prop.reference ? `${prop.type}(${prop.reference})` : prop.type;
          const requiredMarker = prop.required ? '*' : '';
          diagram += `        ${prop.type} ${prop.name}${requiredMarker}\n`;
        }
      }
      
      diagram += '    }\n';
    }

    // Add relationships
    const entityNames = new Set(entitiesToInclude.map(e => e.name));
    for (const rel of this.relationships) {
      if (entityNames.has(rel.fromEntity) && entityNames.has(rel.toEntity)) {
        const relationshipSymbol = this.getMermaidRelationshipSymbol(rel.type);
        diagram += `    ${this.sanitizeEntityName(rel.fromEntity)} ${relationshipSymbol} ${this.sanitizeEntityName(rel.toEntity)} : "${rel.property}"\n`;
      }
    }

    return diagram;
  }

  private generatePlantUMLDiagram(options: DiagramOptions): string {
    let diagram = '@startuml\n!theme plain\n\n';

    // Add entities
    const entitiesToInclude = this.getFilteredEntities(options);
    for (const entity of entitiesToInclude) {
      diagram += `entity "${entity.name}" {\n`;
      
      if (options.includeProperties !== false) {
        for (const prop of entity.properties.slice(0, 10)) {
          const requiredMarker = prop.required ? '*' : '';
          const typeDisplay = prop.reference ? `→${prop.reference}` : prop.type;
          diagram += `  ${requiredMarker}${prop.name} : ${typeDisplay}\n`;
        }
      }
      
      diagram += '}\n\n';
    }

    // Add relationships
    const entityNames = new Set(entitiesToInclude.map(e => e.name));
    for (const rel of this.relationships) {
      if (entityNames.has(rel.fromEntity) && entityNames.has(rel.toEntity)) {
        const relationshipSymbol = this.getPlantUMLRelationshipSymbol(rel.type);
        diagram += `"${rel.fromEntity}" ${relationshipSymbol} "${rel.toEntity}" : ${rel.property}\n`;
      }
    }

    diagram += '\n@enduml';
    return diagram;
  }

  private generateGraphvizDiagram(options: DiagramOptions): string {
    let diagram = 'digraph EdFiEntities {\n';
    diagram += '  rankdir=TB;\n';
    diagram += '  node [shape=record, style=filled, fillcolor=lightblue];\n\n';

    // Add entities
    const entitiesToInclude = this.getFilteredEntities(options);
    for (const entity of entitiesToInclude) {
      let nodeLabel = `{${entity.name}`;
      
      if (options.includeProperties !== false && entity.properties.length > 0) {
        nodeLabel += '|';
        const props = entity.properties.slice(0, 8).map(prop => {
          const requiredMarker = prop.required ? '*' : '';
          return `${requiredMarker}${prop.name}: ${prop.type}`;
        });
        nodeLabel += props.join('\\l') + '\\l';
      }
      
      nodeLabel += '}';
      
      diagram += `  "${entity.name}" [label="${nodeLabel}"];\n`;
    }

    diagram += '\n';

    // Add relationships
    const entityNames = new Set(entitiesToInclude.map(e => e.name));
    for (const rel of this.relationships) {
      if (entityNames.has(rel.fromEntity) && entityNames.has(rel.toEntity)) {
        const style = this.getGraphvizRelationshipStyle(rel.type);
        diagram += `  "${rel.fromEntity}" -> "${rel.toEntity}" [label="${rel.property}", ${style}];\n`;
      }
    }

    diagram += '}';
    return diagram;
  }

  private getFilteredEntities(options: DiagramOptions): Entity[] {
    let entities = Array.from(this.entities.values());

    // Filter by domain if specified
    if (options.filterDomains && options.filterDomains.length > 0) {
      entities = entities.filter(entity => 
        options.filterDomains!.some(domain => 
          entity.name.toLowerCase().includes(domain.toLowerCase())
        )
      );
    }

    // Limit number of entities
    if (options.maxEntities) {
      entities = entities.slice(0, options.maxEntities);
    }

    return entities;
  }

  private sanitizeEntityName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private getMermaidRelationshipSymbol(type: EntityRelationship['type']): string {
    switch (type) {
      case 'one-to-one': return '||--||';
      case 'one-to-many': return '||--o{';
      case 'many-to-one': return '}o--||';
      case 'many-to-many': return '}o--o{';
      default: return '||--||';
    }
  }

  private getPlantUMLRelationshipSymbol(type: EntityRelationship['type']): string {
    switch (type) {
      case 'one-to-one': return '||--||';
      case 'one-to-many': return '||--o{';
      case 'many-to-one': return '}o--||';
      case 'many-to-many': return '}o--o{';
      default: return '||--||';
    }
  }

  private getGraphvizRelationshipStyle(type: EntityRelationship['type']): string {
    switch (type) {
      case 'one-to-one': return 'arrowhead=none, arrowtail=none';
      case 'one-to-many': return 'arrowhead=crow, arrowtail=none';
      case 'many-to-one': return 'arrowhead=none, arrowtail=crow';
      case 'many-to-many': return 'arrowhead=crow, arrowtail=crow, dir=both';
      default: return 'arrowhead=none, arrowtail=none';
    }
  }

  /**
   * Get entity details by name
   */
  getEntityDetails(entityName: string): Entity | null {
    return this.entities.get(entityName) || null;
  }

  /**
   * Get all relationships for an entity
   */
  getEntityRelationships(entityName: string): EntityRelationship[] {
    return this.relationships.filter(rel => 
      rel.fromEntity === entityName || rel.toEntity === entityName
    );
  }

  /**
   * Get entities grouped by domain/category
   */
  getEntitiesByDomain(version: string): Record<string, string[]> {
    // Get domain data for the specified version
    const domainData = getDomainData(version);

    // Extract all entities from the domain data and group them by domain
    const domains: Record<string, string[]> = {};

    for (const domainObj of domainData) {
      for (const [domainName, domainInfo] of Object.entries(domainObj)) {
        // Initialize domain if not exists
        const lower = domainName.toLocaleLowerCase();
        if (!domains[lower]) {
          domains[lower] = [];
        }

        // Add entities from this domain
        if (domainInfo.entities && Array.isArray(domainInfo.entities)) {
          for (const entity of domainInfo.entities) {
            // Only add entities that actually exist in our analyzed entities
            if (this.entities.has(entity) && !domains[lower].includes(entity)) {
              domains[lower].push(entity);
            }
          }
        }

        // Add associations from this domain (they are also entities)
        if (domainInfo.associations && Array.isArray(domainInfo.associations)) {
          for (const association of domainInfo.associations) {
            // Only add associations that actually exist in our analyzed entities
            if (this.entities.has(association) && !domains[lower].includes(association)) {
              domains[lower].push(association);
            }
          }
        }
      }
    }

    // Add any remaining entities that weren't categorized to "Other"
    const categorizedEntities = new Set<string>();
    for (const entities of Object.values(domains)) {
      entities.forEach(entity => categorizedEntities.add(entity));
    }

    const uncategorizedEntities = Array.from(this.entities.keys()).filter(
      entity => !categorizedEntities.has(entity)
    );

    if (uncategorizedEntities.length > 0) {
      domains['other'] = uncategorizedEntities;
    }

    // Remove empty domains
    Object.keys(domains).forEach(domain => {
      if (domains[domain].length === 0) {
        delete domains[domain];
      }
    });

    return domains;
  }

  /**
   * Get summary statistics
   */
  getStats(version: string): { entityCount: number; relationshipCount: number; domains: Record<string, number> } {
    const domains = this.getEntitiesByDomain(version);
    const domainCounts: Record<string, number> = {};
    
    for (const [domain, entities] of Object.entries(domains)) {
      domainCounts[domain] = entities.length;
    }

    return {
      entityCount: this.entities.size,
      relationshipCount: this.relationships.length,
      domains: domainCounts
    };
  }
}