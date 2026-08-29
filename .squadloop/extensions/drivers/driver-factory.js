import * as fs from "fs";
import * as path from "path";
import { TmuxDriver } from "./tmux-driver.js";
import { HerdrDriver } from "./herdr-driver.js";
import { ITerm2Driver } from "./iterm2-driver.js";
import { RegularDriver } from "./regular-driver.js";
export class DriverFactory {
    static tmuxDriver = new TmuxDriver();
    static herdrDriver = new HerdrDriver();
    static iterm2Driver = new ITerm2Driver();
    static regularDriver = new RegularDriver();
    static getDriver(overrideDriver) {
        let target = overrideDriver;
        if (!target) {
            const configPath = path.join(process.cwd(), ".squadloop", "config.json");
            if (fs.existsSync(configPath)) {
                try {
                    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
                    target = config.driver || config.workspaceMode;
                }
                catch {
                    // Default
                }
            }
        }
        const driverId = (target || "tmux").toLowerCase();
        if (driverId === "herdr") {
            if (this.herdrDriver.isAvailable())
                return this.herdrDriver;
        }
        if (driverId === "iterm2" || driverId === "iterm") {
            if (this.iterm2Driver.isAvailable())
                return this.iterm2Driver;
        }
        if (driverId === "tmux") {
            if (this.tmuxDriver.isAvailable())
                return this.tmuxDriver;
        }
        if (driverId === "regular" || driverId === "headless") {
            return this.regularDriver;
        }
        // Fallback to tmux if available, otherwise regular
        if (this.tmuxDriver.isAvailable())
            return this.tmuxDriver;
        return this.regularDriver;
    }
}
