# DevSquad AI — Local Testing & Peer Distribution Guide (`LOCAL-RELEASE-MGMT.md`)

This guide explains how to test **DevSquad AI** locally across any directory on your system and share portable builds directly with friends, colleagues, or test machines without needing a published NPM registry.

---

## 💻 1. Local System Testing Workflow (Any Directory)

Since `devsquad` is globally linked on your computer via `npm link`, you can run and test DevSquad AI inside **any project directory or repository on your machine**:

```bash
# 1. Open terminal and navigate to ANY project directory
cd /path/to/any-project-folder

# 2. Bootstrap DevSquad AI agent personas, extensions, and templates
devsquad init

# 3. Launch DevSquad AI squad
devsquad start

# 4. Attach to the tmux workspace
devsquad attach
```

---

## 📦 2. Creating a Portable Package Build (`npm pack`)

You can bundle DevSquad AI into a single, lightweight tarball file to share directly with others via Slack, Email, AirDrop, Google Drive, or USB drive:

### Step 1: Generate Package Tarball
Run `npm pack` inside the `pi-team` repository root:

```bash
cd /Users/gbalaji/projects/personal/pi-team
npm run build
npm pack
```

*Output*: Generates a single ~98 KB compressed tarball: **`devsquad-1.0.0.tgz`**.

### What Is Included in `devsquad-1.0.0.tgz`?
- `bin/devsquad.js` — Executable CLI binary with ASCII art logo.
- `.pi/agents/` — All 5 agent personas (`orchestrator`, `ba`, `developer`, `qa`, `reviewer`).
- `.pi/extensions/` — `WorkflowEngine`, `SecurityGuard`, `TrackerFactory`, `WorkspaceFactory`, `team-tools`.
- `.pi/skills/` & `.pi/templates/` — All domain skills and document templates.
- `Agent.md` — Operational mandate and workspace rules.
- `package.json` — Package configuration and CLI binary declaration.

---

## 👥 3. Distributing to Friends, Colleagues, or Test Machines

### Method A: Portable Tarball Share (Recommended - Zero Registry Needed)
Send **`devsquad-1.0.0.tgz`** to your friend or colleague.

#### On Your Friend's Machine:
```bash
# 1. Install globally directly from the tarball file:
npm install -g /path/to/devsquad-1.0.0.tgz

# 2. Navigate to their own project repository:
cd ~/projects/their-app

# 3. Bootstrap DevSquad AI files:
devsquad init

# 4. Launch DevSquad AI:
devsquad start
```

---

### Method B: Git Clone & Local Link
If your colleague has access to your Git repository:

```bash
# On your colleague's machine:
git clone https://github.com/balajirags/pi-team.git devsquad-repo
cd devsquad-repo
npm install
npm run build
npm link

# Now devsquad is available globally on their system!
cd ~/projects/their-app
devsquad init
devsquad start
```

---

### Method C: Self-Contained Repository Copy
If they want DevSquad AI fully self-contained inside a single project folder without installing globally:

Copy 3 items into their project root:
1. `.pi/` directory
2. `Agent.md` file
3. `bin/` directory

Then inside their project folder, run:
```bash
./bin/devsquad.js init
./bin/devsquad.js start
```

---

## 🔄 4. Updating Local Package Builds

When you make new changes in `pi-team` and want to issue an updated build to test machines or colleagues:

```bash
# 1. Build & re-pack in pi-team
npm run build
npm pack

# 2. Re-install globally on test machine
npm install -g devsquad-1.0.0.tgz --force
```
