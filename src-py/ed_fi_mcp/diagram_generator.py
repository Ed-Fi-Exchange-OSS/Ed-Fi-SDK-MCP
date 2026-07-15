"""Diagram generator for Ed-Fi Data Standard entity relationships."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Literal, TypedDict

from ed_fi_mcp.domains import get_domain_data

RelationshipType = Literal["one-to-one", "one-to-many", "many-to-one", "many-to-many"]
DiagramFormat = Literal["mermaid", "plantuml", "graphviz"]


@dataclass
class EntityProperty:
    name: str
    type: str
    required: bool
    description: str | None = None
    format: str | None = None
    reference: str | None = None  # For $ref properties


@dataclass
class EntityRelationship:
    from_entity: str
    to_entity: str
    type: RelationshipType
    property: str
    description: str | None = None


@dataclass
class Entity:
    name: str
    properties: list[EntityProperty] = field(default_factory=list)
    description: str | None = None
    relationships: list[EntityRelationship] = field(default_factory=list)


class DiagramOptions(TypedDict, total=False):
    format: DiagramFormat
    includeProperties: bool
    includeDescriptions: bool
    filterDomains: list[str]
    maxEntities: int


class DiagramGenerator:
    def __init__(self) -> None:
        self.entities: dict[str, Entity] = {}
        self.relationships: list[EntityRelationship] = []

    def analyze_openapi_spec(self, spec: dict[str, Any]) -> None:
        """Analyze OpenAPI spec and extract entities and relationships."""
        self.entities.clear()
        self.relationships = []

        schemas = (spec.get("components") or {}).get("schemas")
        if not schemas:
            return

        # First pass: Extract entities
        for schema_name, schema in schemas.items():
            self._extract_entity(schema_name, schema)

        # Second pass: Extract relationships
        for schema_name, schema in schemas.items():
            self._extract_relationships(schema_name, schema)

    def _extract_entity(self, name: str, schema: dict[str, Any]) -> None:
        entity = Entity(
            name=name,
            description=schema.get("description") or schema.get("title"),
        )

        properties = schema.get("properties")
        if properties:
            required = schema.get("required") or []
            for prop_name, prop in properties.items():
                entity_prop = EntityProperty(
                    name=prop_name,
                    type=prop.get("type") or "object",
                    required=prop_name in required,
                    description=prop.get("description"),
                    format=prop.get("format"),
                )

                # Check for references to other entities
                if prop.get("$ref"):
                    entity_prop.reference = self._extract_schema_name_from_ref(prop["$ref"])
                    entity_prop.type = "reference"
                elif (prop.get("items") or {}).get("$ref"):
                    entity_prop.reference = self._extract_schema_name_from_ref(prop["items"]["$ref"])
                    entity_prop.type = "array"
                elif prop.get("allOf") and prop["allOf"][0].get("$ref"):
                    entity_prop.reference = self._extract_schema_name_from_ref(prop["allOf"][0]["$ref"])
                    entity_prop.type = "reference"

                entity.properties.append(entity_prop)

        self.entities[name] = entity

    def _extract_relationships(self, from_entity_name: str, schema: dict[str, Any]) -> None:
        properties = schema.get("properties")
        if not properties:
            return

        for prop_name, prop in properties.items():
            to_entity_name: str | None = None
            relation_type: RelationshipType = "one-to-one"

            if prop.get("$ref"):
                to_entity_name = self._extract_schema_name_from_ref(prop["$ref"])
                relation_type = "one-to-one"
            elif (prop.get("items") or {}).get("$ref"):
                to_entity_name = self._extract_schema_name_from_ref(prop["items"]["$ref"])
                relation_type = "one-to-many"
            elif prop.get("allOf") and prop["allOf"][0].get("$ref"):
                to_entity_name = self._extract_schema_name_from_ref(prop["allOf"][0]["$ref"])
                relation_type = "one-to-one"

            if to_entity_name and to_entity_name in self.entities:
                self.relationships.append(
                    EntityRelationship(
                        from_entity=from_entity_name,
                        to_entity=to_entity_name,
                        type=relation_type,
                        property=prop_name,
                        description=prop.get("description"),
                    )
                )

    @staticmethod
    def _extract_schema_name_from_ref(ref: str) -> str:
        return ref.rsplit("/", 1)[-1] if ref else ""

    def generate_diagram(self, options: DiagramOptions) -> str:
        """Generate diagram in specified format."""
        fmt = options["format"]
        if fmt == "mermaid":
            return self._generate_mermaid_diagram(options)
        if fmt == "plantuml":
            return self._generate_plantuml_diagram(options)
        if fmt == "graphviz":
            return self._generate_graphviz_diagram(options)
        raise ValueError(f"Unsupported diagram format: {fmt}")

    def _generate_mermaid_diagram(self, options: DiagramOptions) -> str:
        diagram = "erDiagram\n"

        entities_to_include = self._get_filtered_entities(options)
        for entity in entities_to_include:
            diagram += f"    {self._sanitize_entity_name(entity.name)} {{\n"

            if options.get("includeProperties", True) is not False:
                for prop in entity.properties[:10]:
                    required_marker = "*" if prop.required else ""
                    diagram += f"        {prop.type} {prop.name}{required_marker}\n"

            diagram += "    }\n"

        entity_names = {e.name for e in entities_to_include}
        for rel in self.relationships:
            if rel.from_entity in entity_names and rel.to_entity in entity_names:
                symbol = self._get_mermaid_relationship_symbol(rel.type)
                diagram += (
                    f"    {self._sanitize_entity_name(rel.from_entity)} {symbol} "
                    f'{self._sanitize_entity_name(rel.to_entity)} : "{rel.property}"\n'
                )

        return diagram

    def _generate_plantuml_diagram(self, options: DiagramOptions) -> str:
        diagram = "@startuml\n!theme plain\n\n"

        entities_to_include = self._get_filtered_entities(options)
        for entity in entities_to_include:
            diagram += f'entity "{entity.name}" {{\n'

            if options.get("includeProperties", True) is not False:
                for prop in entity.properties[:10]:
                    required_marker = "*" if prop.required else ""
                    type_display = f"→{prop.reference}" if prop.reference else prop.type
                    diagram += f"  {required_marker}{prop.name} : {type_display}\n"

            diagram += "}\n\n"

        entity_names = {e.name for e in entities_to_include}
        for rel in self.relationships:
            if rel.from_entity in entity_names and rel.to_entity in entity_names:
                symbol = self._get_plantuml_relationship_symbol(rel.type)
                diagram += f'"{rel.from_entity}" {symbol} "{rel.to_entity}" : {rel.property}\n'

        diagram += "\n@enduml"
        return diagram

    def _generate_graphviz_diagram(self, options: DiagramOptions) -> str:
        diagram = "digraph EdFiEntities {\n"
        diagram += "  rankdir=TB;\n"
        diagram += "  node [shape=record, style=filled, fillcolor=lightblue];\n\n"

        entities_to_include = self._get_filtered_entities(options)
        for entity in entities_to_include:
            node_label = f"{{{entity.name}"

            if options.get("includeProperties", True) is not False and entity.properties:
                node_label += "|"
                props = []
                for prop in entity.properties[:8]:
                    required_marker = "*" if prop.required else ""
                    props.append(f"{required_marker}{prop.name}: {prop.type}")
                node_label += "\\l".join(props) + "\\l"

            node_label += "}"

            diagram += f'  "{entity.name}" [label="{node_label}"];\n'

        diagram += "\n"

        entity_names = {e.name for e in entities_to_include}
        for rel in self.relationships:
            if rel.from_entity in entity_names and rel.to_entity in entity_names:
                style = self._get_graphviz_relationship_style(rel.type)
                diagram += f'  "{rel.from_entity}" -> "{rel.to_entity}" [label="{rel.property}", {style}];\n'

        diagram += "}"
        return diagram

    def _get_filtered_entities(self, options: DiagramOptions) -> list[Entity]:
        entities = list(self.entities.values())

        filter_domains = options.get("filterDomains")
        if filter_domains:
            entities = [
                entity
                for entity in entities
                if any(domain.lower() in entity.name.lower() for domain in filter_domains)
            ]

        max_entities = options.get("maxEntities")
        if max_entities:
            entities = entities[:max_entities]

        return entities

    @staticmethod
    def _sanitize_entity_name(name: str) -> str:
        return re.sub(r"[^a-zA-Z0-9_]", "_", name)

    @staticmethod
    def _get_mermaid_relationship_symbol(rel_type: RelationshipType) -> str:
        return {
            "one-to-one": "||--||",
            "one-to-many": "||--o{",
            "many-to-one": "}o--||",
            "many-to-many": "}o--o{",
        }.get(rel_type, "||--||")

    @staticmethod
    def _get_plantuml_relationship_symbol(rel_type: RelationshipType) -> str:
        return {
            "one-to-one": "||--||",
            "one-to-many": "||--o{",
            "many-to-one": "}o--||",
            "many-to-many": "}o--o{",
        }.get(rel_type, "||--||")

    @staticmethod
    def _get_graphviz_relationship_style(rel_type: RelationshipType) -> str:
        return {
            "one-to-one": "arrowhead=none, arrowtail=none",
            "one-to-many": "arrowhead=crow, arrowtail=none",
            "many-to-one": "arrowhead=none, arrowtail=crow",
            "many-to-many": "arrowhead=crow, arrowtail=crow, dir=both",
        }.get(rel_type, "arrowhead=none, arrowtail=none")

    def get_entity_details(self, entity_name: str) -> Entity | None:
        """Get entity details by name."""
        return self.entities.get(entity_name)

    def get_entity_relationships(self, entity_name: str) -> list[EntityRelationship]:
        """Get all relationships for an entity."""
        return [
            rel
            for rel in self.relationships
            if rel.from_entity == entity_name or rel.to_entity == entity_name
        ]

    def get_entities_by_domain(self, version: str) -> dict[str, list[str]]:
        """Get entities grouped by domain/category."""
        domain_data = get_domain_data(version)

        domains: dict[str, list[str]] = {}

        for domain_obj in domain_data:
            for domain_name, domain_info in domain_obj.items():
                lower = domain_name.lower()
                domains.setdefault(lower, [])

                for entity in domain_info.get("entities") or []:
                    if entity in self.entities and entity not in domains[lower]:
                        domains[lower].append(entity)

                for association in domain_info.get("associations") or []:
                    if association in self.entities and association not in domains[lower]:
                        domains[lower].append(association)

        categorized_entities: set[str] = set()
        for entities in domains.values():
            categorized_entities.update(entities)

        uncategorized_entities = [
            entity for entity in self.entities if entity not in categorized_entities
        ]

        if uncategorized_entities:
            domains["other"] = uncategorized_entities

        return {domain: entities for domain, entities in domains.items() if entities}

    def get_stats(self, version: str) -> dict[str, Any]:
        """Get summary statistics."""
        domains = self.get_entities_by_domain(version)
        domain_counts = {domain: len(entities) for domain, entities in domains.items()}

        return {
            "entityCount": len(self.entities),
            "relationshipCount": len(self.relationships),
            "domains": domain_counts,
        }
