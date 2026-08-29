import { execSync } from "child_process";
export class JiraAdapter {
    name = "Jira";
    async createIssue(title, body, options) {
        const project = options?.project || "PROJ";
        try {
            const output = execSync(`jira issue create -p "${project}" -t "Story" -s "${title.replace(/"/g, '\\"')}" -b "${body.replace(/"/g, '\\"')}" --no-input`, { encoding: "utf-8" }).trim();
            const keyMatch = output.match(/[A-Z0-9]+-\d+/);
            const issueKey = keyMatch ? keyMatch[0] : "JIRA-1";
            return {
                issueId: issueKey,
                title,
                status: "Open",
                url: output
            };
        }
        catch {
            return {
                issueId: title,
                title,
                status: "Open"
            };
        }
    }
    async updateStatus(issueId, status, notes) {
        try {
            if (status === "done" || status === "closed") {
                await this.closeIssue(issueId, notes);
            }
            else if (notes && issueId.includes("-")) {
                execSync(`jira issue comment add ${issueId} "${notes.replace(/"/g, '\\"')}"`, { stdio: "ignore" });
            }
        }
        catch {
            // Non-fatal
        }
    }
    async closeIssue(issueId, comment) {
        try {
            if (issueId.includes("-")) {
                if (comment) {
                    execSync(`jira issue comment add ${issueId} "${comment.replace(/"/g, '\\"')}"`, { stdio: "ignore" });
                }
                execSync(`jira issue move ${issueId} "Done"`, { stdio: "ignore" });
            }
        }
        catch {
            // Non-fatal
        }
    }
    async getIssue(issueId) {
        try {
            if (!issueId.includes("-"))
                return null;
            const jsonStr = execSync(`jira issue view ${issueId} --json`, { encoding: "utf-8" });
            const data = JSON.parse(jsonStr);
            return {
                issueId: data.key || issueId,
                title: data.fields?.summary || issueId,
                status: data.fields?.status?.name || "Open",
                body: data.fields?.description || ""
            };
        }
        catch {
            return null;
        }
    }
    async listUncompletedIssues() {
        try {
            const jsonStr = execSync(`jira issue list -s~Done --json`, { encoding: "utf-8" });
            const list = JSON.parse(jsonStr);
            return list.map((item) => ({
                issueId: item.key,
                title: item.fields?.summary || item.key,
                status: item.fields?.status?.name || "Open"
            }));
        }
        catch {
            return [];
        }
    }
}
