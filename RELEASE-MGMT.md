# SquadLoop — Release Management & Distribution Guide (`RELEASE-MGMT.md`)

This guide provides the complete release engineering, versioning, local testing, and peer/NPM distribution workflow for **SquadLoop — Your autonomous software team.**

---

## 💻 1. Local System Testing Workflow (Any Directory)

Since `squadloop` is globally linked on your computer via `npm link`, you can run and test SquadLoop inside **any project directory or repository on your machine**:

```bash
# 1. Open terminal and navigate to ANY project directory
cd /path/to/any-project-folder

# 2. Bootstrap SquadLoop agent personas, extensions, and templates
squadloop init

# 3. Launch SquadLoop team
squadloop start

# 4. Attach to the tmux workspace
squadloop attach
```

---

## 📦 2. Creating Portable Package Tarball Builds (`npm pack`)

You can bundle SquadLoop into a single, lightweight tarball file to share directly with others via Slack, Email, AirDrop, Google Drive, or USB drive without requiring a published NPM registry:

### Step 1: Generate Package Tarball
Run `npm pack` inside the `pi-team` repository root:

```bash
cd /Users/gbalaji/projects/personal/pi-team
npm run build
npm pack
```

*Output*: Generates a single ~98 KB compressed tarball: **`squadloop-1.0.0.tgz`**.

### What Is Included in `squadloop-1.0.0.tgz`?
- `bin/squadloop.js` — Executable CLI binary with ASCII art logo.
- `.squadloop/agents/` — All 5 agent personas (`orchestrator`, `ba`, `developer`, `qa`, `reviewer`).
- `.squadloop/extensions/` — `WorkflowEngine`, `SecurityGuard`, `TrackerFactory`, `WorkspaceFactory`, `team-tools`.
- `.squadloop/skills/` & `.squadloop/templates/` — All domain skills and document templates.
- `AGENTS.md` — Project-specific agent guidance copied by `squadloop init`.
- `package.json` — Package configuration and CLI binary declaration.

---

## 👥 3. Peer-to-Peer & Colleague Distribution (Zero Registry Needed)

### Method A: Portable Tarball Share (Recommended - Zero Registry Needed)
Send **`squadloop-1.0.0.tgz`** to your friend or colleague.

#### On Your Friend's Machine:
```bash
# 1. Install globally directly from the tarball file:
npm install -g /path/to/squadloop-1.0.0.tgz

# 2. Navigate to their own project repository:
cd ~/projects/their-app

# 3. Bootstrap SquadLoop files:
squadloop init

# 4. Launch SquadLoop:
squadloop start
```

---

### Method B: Git Clone & Local Link
If your colleague has access to your Git repository:

```bash
# On your colleague's machine:
git clone https://github.com/balajirags/pi-team.git squadloop-repo
cd squadloop-repo
npm install
npm run build
npm link

# Now squadloop is available globally on their system!
cd ~/projects/their-app
squadloop init
squadloop start
```

---

### Method C: Self-Contained Repository Copy
If they want SquadLoop fully self-contained inside a single project folder without installing globally:

Copy 3 items into their project root:
1. `.squadloop/` directory
2. `AGENTS.md` file
3. `bin/` directory

Then inside their project folder, run:
```bash
./bin/squadloop.js init
./bin/squadloop.js start
```

---

## 🚀 4. NPM & Private Registry Distribution Workflow

`package.json` is configured with `"name": "squadloop"` and `"bin": { "squadloop": "./bin/squadloop.js" }`.

### Automated Release Scripts (`package.json`)
Run one of the following commands from the repository root to trigger an automated release build, version bump, tag push, and registry publish:

```bash
# Patch Release (e.g. v1.0.0 -> v1.0.1 - Bug fixes & minor updates)
npm run release:patch

# Minor Release (e.g. v1.0.0 -> v1.1.0 - New features & adapters)
npm run release:minor

# Major Release (e.g. v1.0.0 -> v2.0.0 - Breaking architecture changes)
npm run release:major
```

#### What these scripts execute under the hood:
1. `npm run build` — Compiles TypeScript extensions to `dist/`.
2. `npm version <type>` — Bumps version in `package.json` and creates a Git tag.
3. `git push origin main --tags` — Pushes commits and tags to remote.
4. `npm publish` — Publishes package to NPM or private registry.

### Publishing to Private Company Registries (GitHub Packages, Artifactory, Verdaccio, AWS CodeArtifact)
Configure `.npmrc` in project root:
```ini
@my-company:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```
Then publish:
```bash
npm publish --registry https://npm.pkg.github.com
```

---

## 🏷️ 5. GitHub Release Management (`gh` CLI)

To create a formal GitHub release with release notes:

```bash
# 1. Create Git tag
git tag -a v1.0.0 -m "SquadLoop v1.0.0 Release"
git push origin main --tags

# 2. Create GitHub Release with gh CLI
gh release create v1.0.0 --title "SquadLoop v1.0.0" --notes "Initial release of SquadLoop — Your autonomous software team."
```

---

## 📊 6. Distribution Matrix Summary

| Distribution Model | Best For | Installation Command |
| :--- | :--- | :--- |
| **NPM Registry (Public / Private)** | External teams, company-wide adoption | `npm install -g squadloop` → `squadloop init` |
| **`npx` On-Demand** | Zero-install trial runs, CI/CD pipelines | `npx squadloop init` → `npx squadloop start` |
| **Monorepo / Local Share** | Shared internal repository copy | `cp -r /path/to/squadloop/.squadloop .` → `squadloop start` |
| **Tarball Share (`.tgz`)** | Direct peer sharing without registry | `npm install -g squadloop-1.0.0.tgz` |

---

## 🔍 7. Pre-Release Quality Checklist

Before running `npm run release:*`:
- [ ] Run `npm run build` to verify 0 TypeScript compilation errors.
- [ ] Verify `bin/squadloop.js` has executable permissions (`chmod +x bin/squadloop.js`).
- [ ] Confirm `package.json` package name is `"name": "squadloop"`.
- [ ] Test `squadloop start`, `squadloop resume`, `squadloop status`, and `squadloop init` in testing sandbox (`testing-pi-team`).
