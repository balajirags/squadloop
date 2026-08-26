import * as fs from "fs";
import * as path from "path";
function stripJsonComments(jsonString) {
    return jsonString.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => (g ? "" : m));
}
export class ModelResolver {
    static getModel(role) {
        const configPath = path.join(process.cwd(), ".pi", "team-config.json");
        if (!fs.existsSync(configPath))
            return null;
        try {
            const raw = fs.readFileSync(configPath, "utf-8");
            const cleaned = stripJsonComments(raw);
            const config = JSON.parse(cleaned);
            const modelVal = config.models?.[role];
            if (typeof modelVal === "string" && modelVal.trim() !== "") {
                return modelVal.trim();
            }
        }
        catch {
            // Graceful fallback to null on parse error or missing section
        }
        return null;
    }
}
