import type { IPCMessage } from "./ipc-server.js";
export declare class SquadLoopIPCClient {
    static postMessage(senderRole: string, targetRole: string, message: string, issueId?: string): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
    static getUnreadMessages(role: string): Promise<IPCMessage[]>;
    static ackMessages(role: string, ids: string[]): Promise<boolean>;
}
