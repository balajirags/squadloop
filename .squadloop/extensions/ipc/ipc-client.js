import * as http from "http";
import * as fs from "fs";
import * as path from "path";
function getIPCPort() {
    const infoPath = path.join(process.cwd(), ".squadloop", "ipc-server.json");
    if (fs.existsSync(infoPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(infoPath, "utf8"));
            return data.port || 41900;
        }
        catch {
            return 41900;
        }
    }
    return 41900;
}
export class SquadLoopIPCClient {
    static async postMessage(senderRole, targetRole, message, issueId) {
        const port = getIPCPort();
        const payload = JSON.stringify({ senderRole, targetRole, message, issueId });
        return new Promise((resolve) => {
            const req = http.request({
                hostname: "127.0.0.1",
                port,
                path: "/api/message",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(payload)
                },
                timeout: 2000
            }, (res) => {
                let body = "";
                res.on("data", (chunk) => (body += chunk.toString()));
                res.on("end", () => {
                    try {
                        const data = JSON.parse(body);
                        if (res.statusCode === 200) {
                            resolve({ success: true, messageId: data.messageId });
                        }
                        else {
                            resolve({ success: false, error: data.error || "IPC Error" });
                        }
                    }
                    catch (e) {
                        resolve({ success: false, error: e.message });
                    }
                });
            });
            req.on("error", (err) => {
                resolve({ success: false, error: err.message });
            });
            req.write(payload);
            req.end();
        });
    }
    static async getUnreadMessages(role) {
        const port = getIPCPort();
        return new Promise((resolve) => {
            const req = http.request({
                hostname: "127.0.0.1",
                port,
                path: `/api/messages/${encodeURIComponent(role)}`,
                method: "GET",
                timeout: 2000
            }, (res) => {
                let body = "";
                res.on("data", (chunk) => (body += chunk.toString()));
                res.on("end", () => {
                    try {
                        const data = JSON.parse(body);
                        resolve(data.unread || []);
                    }
                    catch {
                        resolve([]);
                    }
                });
            });
            req.on("error", () => {
                resolve([]);
            });
            req.end();
        });
    }
    static async ackMessages(role, ids) {
        if (!ids || ids.length === 0)
            return true;
        const port = getIPCPort();
        const payload = JSON.stringify({ ids });
        return new Promise((resolve) => {
            const req = http.request({
                hostname: "127.0.0.1",
                port,
                path: `/api/ack/${encodeURIComponent(role)}`,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(payload)
                },
                timeout: 2000
            }, (res) => {
                resolve(res.statusCode === 200);
            });
            req.on("error", () => resolve(false));
            req.write(payload);
            req.end();
        });
    }
}
