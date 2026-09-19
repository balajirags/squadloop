import type { WorkflowDefinition } from "./workflow-engine-interface.js";
export declare class YamlWorkflowParser {
    static parseFile(filePath: string): WorkflowDefinition;
    static parseContent(content: string): WorkflowDefinition;
}
