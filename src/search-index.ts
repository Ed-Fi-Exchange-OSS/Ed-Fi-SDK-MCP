import Database from "better-sqlite3";
import * as path from "path";
import * as crypto from "crypto";
import * as fs from "fs";

export interface OpenAPISpec {
  paths?: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, unknown>;
  };
}

export interface EndpointSearchResult {
  path: string;
  method: string;
  summary: string;
  description: string;
  tags: string;
}

export interface SchemaSearchResult {
  name: string;
  description: string;
  title: string;
  properties: string;
}

/**
 * SQLite FTS5-based search index for Ed-Fi OpenAPI specifications.
 *
 * Provides significantly better search quality over the previous
 * substring-matching approach by using:
 *   - Full-text indexing with Porter stemming (so "students" matches "student")
 *   - BM25 relevance ranking (most-relevant results first)
 *   - Prefix queries (partial word matching)
 *   - Indexed property names for both endpoints and schemas
 */
export class SearchIndex {
  private db: Database.Database;
  private ready = false;

  constructor(cacheDir: string, specUrl: string) {
    const hash = crypto
      .createHash("sha256")
      .update(specUrl)
      .digest("hex")
      .substring(0, 12);
    const dbPath = path.join(cacheDir, `search-index-${hash}.db`);
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.initializeSchema();
    // Mark as ready only when there is already indexed data
    const row = this.db
      .prepare(
        "SELECT (SELECT COUNT(*) FROM endpoints_fts) AS endpointsCnt, (SELECT COUNT(*) FROM schemas_fts) AS schemasCnt"
      )
      .get() as { endpointsCnt: number; schemasCnt: number };
    this.ready = row.endpointsCnt > 0 || row.schemasCnt > 0;
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS endpoints_fts USING fts5(
        path,
        method,
        summary,
        description,
        tags,
        tokenize='porter unicode61'
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS schemas_fts USING fts5(
        name,
        description,
        title,
        properties,
        tokenize='porter unicode61'
      );
    `);
  }

  /** Returns true when the index has been populated for the current spec. */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Populate (or repopulate) the FTS5 tables from an OpenAPI spec.
   * Called every time a spec is loaded so the index stays in sync.
   */
  buildFromSpec(spec: OpenAPISpec): void {
    // Rebuild inside a single transaction for speed and atomicity
    const build = this.db.transaction(() => {
      this.db.exec("DELETE FROM endpoints_fts; DELETE FROM schemas_fts;");

      const insertEndpoint = this.db.prepare(
        "INSERT INTO endpoints_fts (path, method, summary, description, tags) VALUES (?, ?, ?, ?, ?)"
      );

      const insertSchema = this.db.prepare(
        "INSERT INTO schemas_fts (name, description, title, properties) VALUES (?, ?, ?, ?)"
      );

      // Index every HTTP operation in spec.paths
      if (spec.paths) {
        for (const [pathStr, pathObj] of Object.entries(spec.paths)) {
          for (const [method, operation] of Object.entries(pathObj)) {
            if (
              [
                "get",
                "post",
                "put",
                "delete",
                "patch",
                "head",
                "options",
              ].includes(method.toLowerCase())
            ) {
              const op = operation as Record<string, unknown>;
              const tags = Array.isArray(op["tags"])
                ? (op["tags"] as string[]).join(" ")
                : "";
              insertEndpoint.run(
                pathStr,
                method.toLowerCase(),
                (op["summary"] as string) ?? "",
                (op["description"] as string) ?? "",
                tags
              );
            }
          }
        }
      }

      // Index every schema in spec.components.schemas
      if (spec.components?.schemas) {
        for (const [name, schema] of Object.entries(spec.components.schemas)) {
          const s = schema as Record<string, unknown>;
          const propertyNames = s["properties"]
            ? Object.keys(s["properties"] as object).join(" ")
            : "";
          insertSchema.run(
            name,
            (s["description"] as string) ?? "",
            (s["title"] as string) ?? "",
            propertyNames
          );
        }
      }
    });

    build();
    this.ready = true;
  }

  /**
   * Search endpoints using FTS5 full-text matching with BM25 ranking.
   * Falls back to a LIKE query when the FTS query syntax is invalid.
   */
  searchEndpoints(query: string, limit = 20): EndpointSearchResult[] {
    if (!this.ready) return [];
    const ftsQuery = this.buildFTSQuery(query);
    if (!ftsQuery) return [];

    try {
      return this.db
        .prepare(
          `SELECT path, method, summary, description, tags
           FROM endpoints_fts
           WHERE endpoints_fts MATCH ?
           ORDER BY bm25(endpoints_fts)
           LIMIT ?`
        )
        .all(ftsQuery, limit) as EndpointSearchResult[];
    } catch {
      return this.fallbackSearchEndpoints(query, limit);
    }
  }

  /**
   * Search schemas using FTS5 full-text matching with BM25 ranking.
   * Falls back to a LIKE query when the FTS query syntax is invalid.
   */
  searchSchemas(query: string, limit = 20): SchemaSearchResult[] {
    if (!this.ready) return [];
    const ftsQuery = this.buildFTSQuery(query);
    if (!ftsQuery) return [];

    try {
      return this.db
        .prepare(
          `SELECT name, description, title, properties
           FROM schemas_fts
           WHERE schemas_fts MATCH ?
           ORDER BY bm25(schemas_fts)
           LIMIT ?`
        )
        .all(ftsQuery, limit) as SchemaSearchResult[];
    } catch {
      return this.fallbackSearchSchemas(query, limit);
    }
  }

  /**
   * Convert a free-text query into an FTS5 MATCH expression.
   *
   * Each word is turned into a prefix query so "student" also matches
   * "students", "studentAssessment", etc. Words shorter than 2 characters
   * are dropped to avoid noisy results.
   */
  private buildFTSQuery(query: string): string {
    const terms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2);

    if (terms.length === 0) return "";
    return terms.map((t) => `"${t.replace(/"/g, '""')}"*`).join(" ");
  }

  // ── fallback helpers (used when FTS query syntax fails) ─────────────────

  private fallbackSearchEndpoints(
    query: string,
    limit: number
  ): EndpointSearchResult[] {
    const term = `%${query.toLowerCase()}%`;
    return this.db
      .prepare(
        `SELECT path, method, summary, description, tags
         FROM endpoints_fts
         WHERE lower(path) LIKE ? OR lower(summary) LIKE ? OR lower(tags) LIKE ?
         LIMIT ?`
      )
      .all(term, term, term, limit) as EndpointSearchResult[];
  }

  private fallbackSearchSchemas(
    query: string,
    limit: number
  ): SchemaSearchResult[] {
    const term = `%${query.toLowerCase()}%`;
    return this.db
      .prepare(
        `SELECT name, description, title, properties
         FROM schemas_fts
         WHERE lower(name) LIKE ? OR lower(description) LIKE ? OR lower(title) LIKE ?
         LIMIT ?`
      )
      .all(term, term, term, limit) as SchemaSearchResult[];
  }

  close(): void {
    try {
      this.db.close();
    } catch {
      // ignore
    }
  }

  /**
   * Remove the on-disk database file (used to invalidate the index when the
   * cached spec has been refreshed).
   */
  static removeIndex(cacheDir: string, specUrl: string): void {
    const hash = crypto
      .createHash("sha256")
      .update(specUrl)
      .digest("hex")
      .substring(0, 12);
    const dbPath = path.join(cacheDir, `search-index-${hash}.db`);
    try {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    } catch {
      // ignore
    }
  }
}
