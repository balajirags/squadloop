export interface IPCMessage {
    id: string;
    senderRole: string;
    targetRole: string;
    message: string;
    timestamp: string;
    read: boolean;
    issueId?: string;
}
export interface AgentRegistration {
    role: string;
    paneId?: string;
    lastSeen: string;
}
export declare class SquadLoopIPCServer {
    private static instance;
    private server;
    private port;
    private messages;
    private agents;
    private isRunning;
    private constructor();
    static getInstance(): SquadLoopIPCServer;
    start(port?: number): Promise<number>;
    private saveServerInfo;
    private handleRequest;
    private parseBody;
    stop(): void;
}
