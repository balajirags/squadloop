import { execSync } from "child_process";
export class GitHubIssuesAdapter {
    name = "GitHub Issues";
    extractNumericId(issueId) {
        const match = issueId.match(/\b\d+\b/);
        return match ? match[0] : issueId;
    }
    async createIssue(title, body) {
        try {
            const output = execSync(`gh issue create --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}"`, { encoding: "utf-8" }).trim();
            const issueNum = output.split("/").pop() || "";
            return {
                issueId: issueNum,
                title,
                status: "open",
                url: output
            };
        }
        catch (err) {
            throw new Error(`GitHubIssuesAdapter createIssue failed: ${err.message}`);
        }
    }
    async updateStatus(issueId, status, notes) {
        const num = this.extractNumericId(issueId);
        if (!num)
            return;
        try {
            if (status === "done" || status === "closed") {
                await this.closeIssue(num, notes);
            }
            else if (notes) {
                execSync(`gh issue comment ${num} --body "Status updated to '${status}': ${notes.replace(/"/g, '\\"')}"`, { stdio: "ignore" });
            }
        }
        catch {
            // Non-fatal
        }
    }
    async closeIssue(issueId, comment) {
        const num = this.extractNumericId(issueId);
        if (!num)
            return;
        try {
            const commentFlag = comment ? `--comment "${comment.replace(/"/g, '\\"')}"` : '--comment "Closed by SquadLoop"';
            execSync(`gh issue close ${num} ${commentFlag}`, { stdio: "ignore" });
        }
        catch {
            // Non-fatal if gh CLI fails
        }
    }
    async getIssue(issueId) {
        const num = this.extractNumericId(issueId);
        if (!num)
            return null;
        try {
            const jsonStr = execSync(`gh issue view ${num} --json number,title,state,url,body`, { encoding: "utf-8" });
            const data = JSON.parse(jsonStr);
            return {
                issueId: String(data.number),
                title: data.title,
                status: data.state.toLowerCase(),
                body: data.body,
                url: data.url
            };
        }
        catch {
            return null;
        }
    }
    async listUncompletedIssues() {
        try {
            const jsonStr = execSync(`gh issue list --state open --json number,title,state,url`, { encoding: "utf-8" });
            const list = JSON.parse(jsonStr);
            return list.map((item) => ({
                issueId: String(item.number),
                title: item.title,
                status: item.state.toLowerCase(),
                url: item.url
            }));
        }
        catch {
            return [];
        }
    }
}
