# Tracker Strategy Pattern Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Delivery Tracker integration using the Strategy Pattern with an extensible `ITrackerAdapter` interface, concrete implementations (`GitHubIssuesAdapter`, `JiraAdapter`, `MarkdownStoryAdapter`), and a `TrackerFactory` that auto-detects the active tracker from `project-context.md`.

**Architecture:** Create `.pi/extensions/trackers/` containing `ITrackerAdapter`, `GitHubIssuesAdapter`, `JiraAdapter`, `MarkdownStoryAdapter`, and `TrackerFactory`. Refactor `backlog-tool.ts` to use `TrackerFactory`.

**Tech Stack:** TypeScript, Node.js File System, Child Process CLI wrappers (gh, jira, fs).

**Spec:** Tracker Strategy Pattern Architecture.

## Global Constraints
- **Interface**: `ITrackerAdapter` defines `createIssue`, `updateStatus`, `closeIssue`, `getIssue`, `listUncompletedIssues`.
- **Extensibility**: Adding new trackers (Linear, Azure DevOps, Trello) requires only creating a new class implementing `ITrackerAdapter`.
- **SOT Rule**: Delivery Tracker is the Authoritative SOT.

---

### Task 1: Create `ITrackerAdapter` Interface & Concrete Adapters

**Files:**
- Create: `.pi/extensions/trackers/tracker-interface.ts`
- Create: `.pi/extensions/trackers/github-adapter.ts`
- Create: `.pi/extensions/trackers/jira-adapter.ts`
- Create: `.pi/extensions/trackers/markdown-adapter.ts`
- Create: `.pi/extensions/trackers/tracker-factory.ts`

**Interfaces:**
- Consumes: `project-context.md` Delivery Tracker setting.
- Produces: Extensible tracker strategy layer.

- [ ] **Step 1: Create `tracker-interface.ts`**

```typescript
export interface TrackerIssue {
  issueId: string;
  title: string;
  status: string;
  body?: string;
  url?: string;
}

export interface ITrackerAdapter {
  readonly name: string;
  createIssue(title: string, body: string, options?: any): Promise<TrackerIssue>;
  updateStatus(issueId: string, status: string, notes?: string): Promise<void>;
  closeIssue(issueId: string, comment?: string): Promise<void>;
  getIssue(issueId: string): Promise<TrackerIssue | null>;
  listUncompletedIssues(): Promise<TrackerIssue[]>;
}
```

- [ ] **Step 2: Create `github-adapter.ts` (`GitHubIssuesAdapter`)**

Implement `ITrackerAdapter` using GitHub CLI (`gh issue create`, `gh issue close`, `gh issue list`, `gh issue view`).

- [ ] **Step 3: Create `jira-adapter.ts` (`JiraAdapter`)**

Implement `ITrackerAdapter` using Jira CLI / REST API (`jira issue create`, `jira issue move`, `jira issue view`).

- [ ] **Step 4: Create `markdown-adapter.ts` (`MarkdownStoryAdapter`)**

Implement `ITrackerAdapter` by reading and modifying markdown story files in `docs/stories/<epic-slug>/`.

- [ ] **Step 5: Create `tracker-factory.ts` (`TrackerFactory`)**

Reads `project-context.md` (or `.pi/team-config.json`) to auto-detect the active tracker ("GitHub Issues" -> GitHub, "Jira" -> Jira, "Markdown" -> Markdown) and returns the corresponding `ITrackerAdapter` instance.

- [ ] **Step 6: Compile TypeScript extensions**

Run: `npm run build`
Expected: 0 compilation errors.

- [ ] **Step 7: Commit**

```bash
git add .pi/extensions/trackers/
git commit -m "feat: implement ITrackerAdapter strategy pattern with GitHub, Jira, and Markdown adapters"
```

---

### Task 2: Refactor `backlog-tool.ts` to Use `TrackerFactory`

**Files:**
- Modify: `.pi/extensions/backlog-tool.ts`

**Interfaces:**
- Consumes: `TrackerFactory`.
- Produces: Clean, strategy-driven backlog status updates and issue closure.

- [ ] **Step 1: Update `team_update_status` in `backlog-tool.ts`**

Use `TrackerFactory.getAdapter()` to delegate status updates and closing (`adapter.closeIssue(issueId)` and `adapter.updateStatus(issueId, status)`).

- [ ] **Step 2: Compile TypeScript extensions**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add .pi/extensions/backlog-tool.ts
git commit -m "refactor: integrate TrackerFactory in backlog-tool.ts for extensible strategy-driven tracker operations"
```

---

### Task 3: Update `Agent.md` and Master BRD Documentation

**Files:**
- Modify: `Agent.md`
- Modify: `backlog/devsquad-master-brd.md`
- Modify: `README.md`
- Modify: `RELEASE.md`

- [ ] **Step 1: Document Tracker Strategy Pattern in `Agent.md` and `README.md`**

Explain `ITrackerAdapter`, how `TrackerFactory` selects adapters from `project-context.md`, and how developers can add new tracker adapters in the future.

- [ ] **Step 2: Commit**

```bash
git add Agent.md backlog/devsquad-master-brd.md README.md RELEASE.md
git commit -m "docs: document ITrackerAdapter Strategy Pattern and tracker extensibility guide"
```

---

### Task 4: Sync to `../testing-pi-team` and Build Verification

**Files:**
- Sync `.pi/`, `Agent.md`, `package.json`, `README.md`, `RELEASE.md`, `backlog/` to `../testing-pi-team/`

- [ ] **Step 1: Copy updated files to `../testing-pi-team`**

Run: `cp -r .pi/ Agent.md package.json README.md RELEASE.md backlog/ ../testing-pi-team/`

- [ ] **Step 2: Build `pi-team` and `testing-pi-team`**

Run: `npm run build && cd ../testing-pi-team && npm run build`
Expected: Both builds succeed with 0 compilation errors.

- [ ] **Step 3: Commit in both repositories**
