# Design Spec: SquadLoop — Enterprise Knowledge & Context Integration Architecture

**Date**: 2026-03-09  
**Status**: Draft / Pending Approval  
**Target Platform**: SquadLoop (`squadloop` CLI, `@earendil-works/pi-coding-agent`)

---

## 1. Executive Summary

This design specification details the enterprise knowledge and context integration framework for SquadLoop.

SquadLoop will connect to external enterprise knowledge sources (Confluence, Vector DBs, Database DDL Schemas, Document Hubs) through:
1. On-Demand Custom Tools (`search_confluence`, `query_vector_db`, `inspect_db_schema`, `search_enterprise_docs`).
2. Dynamic RAG Prompt Enrichment Hook (`before_agent_start`).
3. Enterprise Pointers in `project-context.md` and `.pi/team-config.json`.
4. Local Ingestion CLI Command (`squadloop ingest`).

---

## 2. Architecture & File Structure

```
.pi/extensions/
└── enterprise-context.ts      # Confluence, Vector DB, DB schema custom tools & RAG hook
bin/
└── squadloop.js                # squadloop ingest CLI subcommand handler
```

---

## 3. Detailed Extension Specifications (`enterprise-context.ts`)

### 3.1 Custom Tools
- **`search_confluence`**:
  ```typescript
  pi.registerTool({
    name: "search_confluence",
    label: "Search Confluence",
    description: "Search Confluence space for product requirements, architecture specs, or business policies",
    parameters: Type.Object({
      query: Type.String({ description: "Search query string or CQL filter" }),
      spaceKey: Type.Optional(Type.String({ description: "Optional Confluence space key" }))
    }),
    async execute(toolCallId, params) { ... }
  });
  ```
- **`query_vector_db`**:
  ```typescript
  pi.registerTool({
    name: "query_vector_db",
    label: "Query Vector DB",
    description: "Perform semantic RAG vector query against Qdrant, Pinecone, Weaviate, or PGVector",
    parameters: Type.Object({
      query: Type.String({ description: "Semantic search query string" }),
      topK: Type.Optional(Type.Number({ description: "Number of top matches to return (default: 5)" }))
    }),
    async execute(toolCallId, params) { ... }
  });
  ```
- **`inspect_db_schema`**:
  ```typescript
  pi.registerTool({
    name: "inspect_db_schema",
    label: "Inspect DB Schema",
    description: "Inspect database tables, foreign keys, and DDL column definitions",
    parameters: Type.Object({
      tableName: Type.Optional(Type.String({ description: "Optional target table name" }))
    }),
    async execute(toolCallId, params) { ... }
  });
  ```

### 3.2 Dynamic RAG Hook (`before_agent_start`)
```typescript
pi.on("before_agent_start", async (event, ctx) => {
  // Extract keywords from event.prompt or active issue title
  // Query Vector DB / Confluence for top-matching architectural passages
  // Inject passages into system prompt options
});
```

---

## 4. `squadloop ingest` CLI Command (`bin/squadloop.js`)

```bash
squadloop ingest confluence --space=PAYMENTS
squadloop ingest vectordb --collection=payment-specs
squadloop ingest schema --db=jdbc:postgresql://localhost:5432/payments
```

---

## 5. Verification & Testing

1. **Unit & Tool Tests**:
   - `search_confluence` tool execution and mock response parsing.
   - `query_vector_db` tool execution against vector endpoints.
   - `inspect_db_schema` tool execution against PostgreSQL / SQLite schemas.
2. **Integration Verification**:
   - Verify `before_agent_start` hook enriches turn context with vector DB matches.
   - Verify `squadloop ingest` subcommand caches artifacts into `.pi/context/`.
