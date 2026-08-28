# SquadLoop Enterprise Knowledge & Context Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable SquadLoop agents to query and ingest external enterprise context from Confluence, Vector DBs (Qdrant/Pinecone/PGVector), DB schemas, and document hubs via custom tools, dynamic RAG prompt hooks, and `squadloop ingest` CLI commands.

**Architecture:** Create `.pi/extensions/enterprise-context.ts` registering `search_confluence`, `query_vector_db`, `inspect_db_schema`, `search_enterprise_docs` tools and a `before_agent_start` RAG enrichment hook. Update `bin/squadloop.js` to add the `squadloop ingest` subcommand.

**Tech Stack:** TypeScript (Node.js ES2022 / NodeNext modules), `@earendil-works/pi-coding-agent`, REST APIs, Vector DB HTTP clients.

**Spec:** `docs/superpowers/specs/2026-03-09-enterprise-knowledge-and-context-integration-design.md`

## Global Constraints
- Extension file: `.pi/extensions/enterprise-context.ts`
- Tools registered: `search_confluence`, `query_vector_db`, `inspect_db_schema`, `search_enterprise_docs`
- CLI subcommand: `squadloop ingest <source> [options]`

---

### Task 1: Enterprise Context Extension & Tool Registrations (`enterprise-context.ts`)

**Files:**
- Create: `.pi/extensions/enterprise-context.ts`

**Interfaces:**
- Consumes: `ExtensionAPI`, `typebox`
- Produces: `search_confluence`, `query_vector_db`, `inspect_db_schema`, `search_enterprise_docs` tools

- [ ] **Step 1: Write `.pi/extensions/enterprise-context.ts`**
- [ ] **Step 2: Verify Build (`npm run build`)**
- [ ] **Step 3: Commit**

---

### Task 2: Dynamic RAG Prompt Enrichment Hook (`before_agent_start`)

**Files:**
- Modify: `.pi/extensions/enterprise-context.ts`

**Interfaces:**
- Consumes: `pi.on("before_agent_start")`
- Produces: Auto-injected RAG context passages into turn system prompt

- [ ] **Step 1: Update `before_agent_start` hook in `enterprise-context.ts`**
- [ ] **Step 2: Verify Build (`npm run build`)**
- [ ] **Step 3: Commit**

---

### Task 3: Context Pointers in `project-context.md` & `team-config.json`

**Files:**
- Modify: `.pi/templates/project-context.template.md`
- Modify: `bin/squadloop.js`

**Interfaces:**
- Consumes: Enterprise configuration properties
- Produces: Template & configuration pointer defaults

- [ ] **Step 1: Update `project-context.template.md`**
- [ ] **Step 2: Update `bin/squadloop.js` defaultConfig**
- [ ] **Step 3: Commit**

---

### Task 4: `squadloop ingest` CLI Command (`bin/squadloop.js`)

**Files:**
- Modify: `bin/squadloop.js`

**Interfaces:**
- Consumes: `squadloop ingest` subcommand
- Produces: Ingestion pipeline caching artifacts to `.pi/context/`

- [ ] **Step 1: Update `bin/squadloop.js`**
- [ ] **Step 2: Verify Build & Test CLI Command**
- [ ] **Step 3: Commit**

---

### Task 5: End-to-End Build & Verification

- [ ] **Step 1: Run `npm run build`**
- [ ] **Step 2: Verify Tool Registrations & Ingestion**
- [ ] **Step 3: Commit Final Updates**
