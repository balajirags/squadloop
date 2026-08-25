# BRD: SquadLoop — Bundled Core Engine & Legal/Maintenance Strategy

## Overview
This specification defines the architectural decision to bundle `@earendil-works/pi-coding-agent` directly inside `dependencies` in `package.json` rather than as a `peerDependencies` entry. This delivers a **zero-prerequisite, single-command installation** for users (`npm install -g squadloop`), backed by MIT license compliance and zero upstream maintenance overhead.

---

## 1. Functional & Technical Requirements

### 1.1 Bundled NPM Dependency (`dependencies` in `package.json`)
- **Requirement**: Declare `@earendil-works/pi-coding-agent` in `dependencies` inside `package.json`:
  ```json
  "dependencies": {
    "@earendil-works/pi-coding-agent": "^1.0.0",
    "@sinclair/typebox": "^0.34.0"
  }
  ```
- **Execution Effect**: When users execute `npm install -g squadloop` or `npx squadloop init`, NPM automatically installs the core engine under the hood. Users run `squadloop start` with zero prerequisite warnings.

### 1.2 Legal & Licensing Compliance
- **Requirement**: Maintain full compliance with the MIT License of `@earendil-works/pi-coding-agent`.
- **Action**: Include original MIT copyright attribution notice in `THIRD-PARTY-LICENSES.md` or `LICENSE`:
  ```text
  Includes code from Pi Coding Agent (c) earendil-works, licensed under the MIT License.
  ```

### 1.3 Upstream Maintenance & Compatibility Strategy
- **Requirement**: Preserve standard NPM dependency linkage to avoid the maintenance burden of a hard fork.
- **Benefit**: SquadLoop automatically inherits upstream LLM model drivers (Claude 3.7, GPT-5, Gemini 2.0, DeepSeek R1), performance optimizations, and security patches for free upon running `npm update`.
