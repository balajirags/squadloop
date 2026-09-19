import * as http from "http";
import * as fs from "fs";
import * as path from "path";
export class SquadLoopIPCServer {
    static instance = null;
    server = null;
    port = 41900;
    messages = new Map();
    agents = new Map();
    isRunning = false;
    constructor() { }
    static getInstance() {
        if (!SquadLoopIPCServer.instance) {
            SquadLoopIPCServer.instance = new SquadLoopIPCServer();
        }
        return SquadLoopIPCServer.instance;
    }
    async start(port = 41900) {
        if (this.isRunning && this.server) {
            return this.port;
        }
        this.port = port;
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                this.handleRequest(req, res);
            });
            this.server.on("error", (err) => {
                if (err.code === "EADDRINUSE") {
                    this.port += 1;
                    this.server?.listen(this.port, "127.0.0.1");
                }
                else {
                    reject(err);
                }
            });
            this.server.listen(this.port, "127.0.0.1", () => {
                this.isRunning = true;
                this.saveServerInfo();
                resolve(this.port);
            });
        });
    }
    saveServerInfo() {
        const infoPath = path.join(process.cwd(), ".squadloop", "ipc-server.json");
        const dir = path.dirname(infoPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(infoPath, JSON.stringify({ port: this.port, timestamp: new Date().toISOString() }, null, 2), "utf8");
    }
    handleRequest(req, res) {
        const url = req.url || "/";
        const method = req.method || "GET";
        res.setHeader("Content-Type", "application/json");
        if (method === "POST" && url === "/api/register") {
            this.parseBody(req, (body) => {
                const { role, paneId } = body;
                if (role) {
                    this.agents.set(role, { role, paneId, lastSeen: new Date().toISOString() });
                }
                res.writeHead(200);
                res.end(JSON.stringify({ status: "ok", role, port: this.port }));
            });
        }
        else if (method === "POST" && url === "/api/message") {
            this.parseBody(req, (body) => {
                const { senderRole, targetRole, message, issueId } = body;
                if (!senderRole || !targetRole || !message) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: "Missing required fields: senderRole, targetRole, message" }));
                    return;
                }
                const msg = {
                    id: `ipc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    senderRole,
                    targetRole,
                    message,
                    timestamp: new Date().toISOString(),
                    read: false,
                    issueId
                };
                if (!this.messages.has(targetRole)) {
                    this.messages.set(targetRole, []);
                }
                this.messages.get(targetRole).push(msg);
                res.writeHead(200);
                res.end(JSON.stringify({ status: "delivered", messageId: msg.id }));
            });
        }
        else if (method === "GET" && url.startsWith("/api/messages/")) {
            const role = url.replace("/api/messages/", "").split("?")[0];
            const msgs = this.messages.get(role) || [];
            const unread = msgs.filter((m) => !m.read);
            res.writeHead(200);
            res.end(JSON.stringify({ role, unread }));
        }
        else if (method === "POST" && url.startsWith("/api/ack/")) {
            const role = url.replace("/api/ack/", "").split("?")[0];
            this.parseBody(req, (body) => {
                const { ids } = body;
                if (Array.isArray(ids) && this.messages.has(role)) {
                    const list = this.messages.get(role);
                    for (const m of list) {
                        if (ids.includes(m.id)) {
                            m.read = true;
                        }
                    }
                }
                res.writeHead(200);
                res.end(JSON.stringify({ status: "ok" }));
            });
        }
        else if (method === "GET" && url === "/api/health") {
            res.writeHead(200);
            res.end(JSON.stringify({ status: "healthy", port: this.port, activeAgents: Array.from(this.agents.keys()) }));
        }
        else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: "Endpoint not found" }));
        }
    }
    parseBody(req, callback) {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
        req.on("end", () => {
            try {
                const data = body ? JSON.parse(body) : {};
                callback(data);
            }
            catch {
                callback({});
            }
        });
    }
    stop() {
        if (this.server) {
            this.server.close();
            this.isRunning = false;
        }
    }
}
