import type { ITerminalDriver } from "./terminal-driver-interface.js";
export declare class DriverFactory {
    private static tmuxDriver;
    private static herdrDriver;
    private static iterm2Driver;
    private static regularDriver;
    static getDriver(overrideDriver?: string): ITerminalDriver;
}
