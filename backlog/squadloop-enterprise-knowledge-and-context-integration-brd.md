# BRD: SquadLoop — Enterprise Knowledge & Context Integration Architecture

**Status**: Draft / Pending Approval  
**Date**: 2026-03-09  

## Executive Summary
This specification defines product and technical requirements for integrating enterprise knowledge sources (Confluence, Vector DBs/RAG, Database Schemas, SharePoint/Notion wikis) into SquadLoop.

SquadLoop will empower all 5 agent personas (Business Analyst, Developer, Quality Analyst, Code Reviewer, Master Orchestrator) to query and ingest rich external context on demand without overloading LLM context windows.

---

## 1. Enterprise Knowledge Integration Pillars

### 1.1 Pillar 1: Custom Enterprise Context Tools (`.pi/extensions/enterprise-context.ts`)
SquadLoop extensions will register custom tools callable by LLM agents:
- **`search_confluence`**: Queries Confluence spaces via CQL (`cql=siteSearch ~ "<query>"`) to fetch official product/architecture specs.
- **`query_vector_db`**: Performs semantic RAG queries against Qdrant, Pinecone, Weaviate, Chroma, or PGVector to retrieve relevant code snippets or design decisions (`topK: 5`).
- **`inspect_db_schema`**: Queries database DDL / schema catalogs (PostgreSQL, MySQL, Oracle) to inspect table structures, foreign keys, and column types.
- **`search_enterprise_docs`**: Fetches internal wiki, Notion, or SharePoint documentation.

### 1.2 Pillar 2: Dynamic RAG Context Hook (`before_agent_start`)
SquadLoop extensions will subscribe to Pi Agent's `before_agent_start` lifecycle event:
- When a task/story is assigned (e.g. `Issue #42: Payment Webhook Retry`), the extension automatically queries the Vector DB / Confluence for relevant architectural guidelines before the agent begins.
- Injects top-matching context passages directly into the agent's turn context as structured guidelines.

### 1.3 Pillar 3: Enterprise Pointers in `project-context.md` & `.pi/team-config.json`
`project-context.md` and `.pi/team-config.json` will support configuration pointers:

```markdown
## Enterprise Knowledge Sources
- **Confluence Space**: `https://company.atlassian.net/wiki/spaces/PAYMENTS`
- **Vector DB Endpoint**: `qdrant.internal.company.com:6333/payment-specs`
- **Database Connection**: `jdbc:postgresql://db.internal:5432/payments_db`
- **Context Tools Enabled**: `search_confluence`, `query_vector_db`, `inspect_db_schema`
```

### 1.5 Pillar 5: Model Context Protocol (MCP) Server Registry (`.pi/mcp.json`)
SquadLoop will provide a native MCP Client Extension (`.pi/extensions/mcp-registry.ts`):
- Reads MCP server definitions from `.pi/mcp.json` or `.pi/team-config.json` `"mcpServers"`.
- Connects to stdio and HTTP SSE MCP servers (Confluence MCP, Postgres MCP, Qdrant MCP, Snowflake MCP, GitHub MCP, Slack MCP, Jira MCP).
- Dynamically discovers tools exported by MCP servers (`mcp.listTools()`) and registers them as native tools (`pi.registerTool()`) accessible to all 5 agent personas.

```json
// .pi/mcp.json
{
  "mcpServers": {
    "confluence": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-confluence"],
      "env": {
        "CONFLUENCE_URL": "https://company.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "$CONFLUENCE_USER",
        "CONFLUENCE_API_TOKEN": "$CONFLUENCE_TOKEN"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://db.internal:5432/payments"],
      "env": {}
    },
    "qdrant": {
      "command": "uvx",
      "args": ["mcp-server-qdrant", "--url", "http://qdrant.internal:6333"],
      "env": {}
    }
  }
}
```

---

## 2. User Stories & Implementation Breakdown

| Story ID | Title | Description |
|---|---|---|
| **SL-CTX-01** | Enterprise Knowledge Tools | Implement `.pi/extensions/enterprise-context.ts` registering `search_confluence`, `query_vector_db`, `inspect_db_schema`. |
| **SL-CTX-02** | Dynamic RAG Prompt Hook | Subscribe to `before_agent_start` event to auto-query Vector DB and enrich agent turn context. |
| **SL-CTX-03** | Context Configuration Pointers | Update `project-context.md` template and `.pi/team-config.json` schema to declare enterprise knowledge endpoints. |
| **SL-CTX-04** | Knowledge Ingestion CLI | Implement `squadloop ingest` CLI subcommand for caching enterprise knowledge artifacts locally. |
| **SL-CTX-05** | MCP Server Registry Extension | Implement `.pi/extensions/mcp-registry.ts` to spawn stdio/SSE MCP servers from `.pi/mcp.json` and register tools dynamically. |
