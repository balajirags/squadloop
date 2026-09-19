export interface MailboxMessage {
    id: string;
    senderRole: string;
    targetRole: string;
    message: string;
    timestamp: string;
    read: boolean;
    replyToId?: string;
    issueId?: string;
}
export declare class MailboxManager {
    private static getMailboxDir;
    private static getMailboxFile;
    static getMailbox(sessionId: string, role: string): MailboxMessage[];
    static postMessage(sessionId: string, senderRole: string, targetRole: string, message: string, options?: {
        replyToId?: string;
        issueId?: string;
    }): MailboxMessage;
    static getUnreadMessages(sessionId: string, role: string): MailboxMessage[];
    static markAsRead(sessionId: string, role: string, messageIds: string[]): void;
}
