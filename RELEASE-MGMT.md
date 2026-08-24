# SquadLoop — Distribution & Release Management Guide (`RELEASE-MGMT.md`)

This guide provides the complete release engineering, versioning, distribution, and adoption workflow for **SquadLoop — Your autonomous software team.**

---

## 📦 1. Package Configuration & Versioning Scripts

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

---

## 🚀 2. NPM Distribution Workflow

### A. Publishing to Public NPM Registry
```bash
# Login to NPM
npm login

# Publish package
npm publish --access public
```

### B. Publishing to Private Company Registries (GitHub Packages, Artifactory, Verdaccio, AWS CodeArtifact)
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

## 👥 3. Team Adoption & Installation Guide

Once published, any developer or development team can adopt SquadLoop in their repository using one of 3 methods:

### Method 1: Global Installation (Recommended)
```bash
# 1. Install globally from registry
npm install -g squadloop

# 2. Navigate to ANY target project repository
cd ~/projects/my-company-app

# 3. Bootstrap SquadLoop context, agent personas, and templates
squadloop init

# 4. Configure project-context.md and launch
squadloop start

# 5. Attach to tmux workspace
squadloop attach
```

### Method 2: Zero-Install via `npx`
```bash
cd ~/projects/my-company-app

# 1. Bootstrap context and templates
npx squadloop init

# 2. Launch SquadLoop
npx squadloop start

# 3. Attach to workspace
npx squadloop attach
```

### Method 3: Direct Git Copy (Local Team Share)
Copy 3 items into the target project root:
1. `.pi/` directory (agent personas, extensions, skills, templates)
2. `Agent.md` file (operational mandate)
3. `bin/` directory (`bin/squadloop.js`)

Then execute `./bin/squadloop.js init` or `./bin/squadloop.js start`.

---

## 🏷️ 4. GitHub Release Management (`gh` CLI)

To create a formal GitHub release with release notes:

```bash
# 1. Create Git tag
git tag -a v1.0.0 -m "SquadLoop v1.0.0 Release"
git push origin main --tags

# 2. Create GitHub Release with gh CLI
gh release create v1.0.0 --title "SquadLoop v1.0.0" --notes "Initial release of SquadLoop — Your autonomous software team."
```

---

## 📊 5. Distribution Matrix Summary

| Distribution Model | Best For | Installation Command |
| :--- | :--- | :--- |
| **NPM Registry (Public / Private)** | External teams, company-wide adoption | `npm install -g squadloop` → `squadloop init` |
| **`npx` On-Demand** | Zero-install trial runs, CI/CD pipelines | `npx squadloop init` → `npx squadloop start` |
| **Monorepo / Local Share** | Shared internal repository copy | `cp -r /path/to/squadloop/.pi .` → `squadloop start` |

---

## 🔍 6. Pre-Release Quality Checklist

Before running `npm run release:*`:
- [ ] Run `npm run build` to verify 0 TypeScript compilation errors.
- [ ] Verify `bin/squadloop.js` has executable permissions (`chmod +x bin/squadloop.js`).
- [ ] Confirm `package.json` package name is `"name": "squadloop"`.
- [ ] Test `squadloop start`, `squadloop resume`, `squadloop status`, and `squadloop init` in testing sandbox (`testing-pi-team`).
