import * as fs from "fs";
import * as path from "path";
export class MailboxManager {
    static getMailboxDir(sessionId) {
        const dir = path.join(process.cwd(), ".squadloop", "sessions", sessionId, "mailboxes");
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }
    static getMailboxFile(sessionId, role) {
        const dir = this.getMailboxDir(sessionId);
        return path.join(dir, `${role.toLowerCase()}.json`);
    }
    static getMailbox(sessionId, role) {
        const file = this.getMailboxFile(sessionId, role);
        if (!fs.existsSync(file)) {
            return [];
        }
        try {
            const data = fs.readFileSync(file, "utf8");
            return JSON.parse(data);
        }
        catch {
            return [];
        }
    }
    static postMessage(sessionId, senderRole, targetRole, message, options) {
        const targetFile = this.getMailboxFile(sessionId, targetRole);
        const messages = this.getMailbox(sessionId, targetRole);
        const newMsg = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            senderRole,
            targetRole,
            message,
            timestamp: new Date().toISOString(),
            read: false,
            replyToId: options?.replyToId,
            issueId: options?.issueId
        };
        messages.push(newMsg);
        fs.writeFileSync(targetFile, JSON.stringify(messages, null, 2), "utf8");
        return newMsg;
    }
    static getUnreadMessages(sessionId, role) {
        const messages = this.getMailbox(sessionId, role);
        return messages.filter((m) => !m.read);
    }
    static markAsRead(sessionId, role, messageIds) {
        const file = this.getMailboxFile(sessionId, role);
        const messages = this.getMailbox(sessionId, role);
        let updated = false;
        for (const msg of messages) {
            if (messageIds.includes(msg.id) && !msg.read) {
                msg.read = true;
                updated = true;
            }
        }
        if (updated) {
            fs.writeFileSync(file, JSON.stringify(messages, null, 2), "utf8");
        }
    }
}
