import * as fs from "fs";
import * as path from "path";
import type {
  WorkflowDefinition,
  PipelineStateDefinition,
  PersonaWorkflowDefinition,
  WorkflowStepDefinition
} from "./workflow-engine-interface.js";

/**
 * Strip comments from line only when outside quoted strings.
 */
function stripComment(rawLine: string): string {
  let inDouble = false;
  let inSingle = false;

  for (let i = 0; i < rawLine.length; i++) {
    const char = rawLine[i];
    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (char === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (char === "#" && !inDouble && !inSingle) {
      if (i === 0 || /\s/.test(rawLine[i - 1])) {
        return rawLine.substring(0, i).trimEnd();
      }
    }
  }

  return rawLine;
}

/**
 * Lightweight, robust line-and-indent based YAML parser for WorkflowDefinition objects.
 */
function parseYamlObject(content: string): Record<string, any> {
  const lines = content.split("\n");
  const root: Record<string, any> = {};
  const stack: Array<{ indent: number; obj: Record<string, any> }> = [
    { indent: -1, obj: root }
  ];

  for (const rawLine of lines) {
    // Determine indentation before stripping line
    const indentMatch = rawLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;

    // Strip comments (when not inside quotes)
    const lineWithoutComment = stripComment(rawLine);
    let line = lineWithoutComment.trim();
    if (!line) {
      continue;
    }

    // Match key: value or key:
    const keyValMatch = line.match(/^([^:\n]+):(?:\s*(.*))?$/);
    if (!keyValMatch) {
      continue;
    }

    let key = keyValMatch[1].trim();
    let rawVal = keyValMatch[2] !== undefined ? keyValMatch[2].trim() : "";

    // Strip quotes from key if present
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.substring(1, key.length - 1);
    }

    // Pop stack until we find the parent with strictly smaller indent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parentObj = stack[stack.length - 1].obj;

    if (rawVal === "") {
      // It's a nested object (e.g. "pipeline:", "states:", "ba_grooming:")
      const newObj: Record<string, any> = {};
      parentObj[key] = newObj;
      stack.push({ indent, obj: newObj });
    } else {
      // Inline object support if value starts with '{' and ends with '}'
      if (rawVal.startsWith("{") && rawVal.endsWith("}")) {
        try {
          parentObj[key] = JSON.parse(rawVal);
          continue;
        } catch {
          // Fallback to scalar string parsing if JSON parsing fails
        }
      }

      // It's a key-value scalar
      let val: any = rawVal;
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      } else if (val === "true") {
        val = true;
      } else if (val === "false") {
        val = false;
      } else if (!isNaN(Number(val)) && val !== "") {
        val = Number(val);
      }

      parentObj[key] = val;
    }
  }

  return root;
}

export class YamlWorkflowParser {
  public static parseFile(filePath: string): WorkflowDefinition {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Workflow definition file not found: ${filePath}`);
    }

    const content = fs.readFileSync(absolutePath, "utf-8");
    return YamlWorkflowParser.parseContent(content);
  }

  public static parseContent(content: string): WorkflowDefinition {
    if (!content || !content.trim()) {
      throw new Error("Cannot parse empty workflow definition content");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = parseYamlObject(content);
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid workflow definition format");
    }

    // Validate and structure WorkflowDefinition
    const version = String(parsed.version || "1.0");
    const name = String(parsed.name || "Unnamed Workflow");
    const description = parsed.description ? String(parsed.description) : undefined;

    const rawPipeline = parsed.pipeline || {};
    const pipelineInitial = String(rawPipeline.initial || "");
    const rawStates = rawPipeline.states || {};

    const states: Record<string, PipelineStateDefinition> = {};
    for (const [stateKey, rawState] of Object.entries(rawStates)) {
      if (typeof rawState === "object" && rawState !== null) {
        const stateObj = rawState as Record<string, any>;
        const agent = stateObj.agent ? String(stateObj.agent) : undefined;
        const type = stateObj.type ? String(stateObj.type) : undefined;

        const rawOn = stateObj.on || {};
        const onMap: Record<string, string | { target: string; guard?: string }> = {};

        for (const [eventKey, eventVal] of Object.entries(rawOn)) {
          if (typeof eventVal === "string") {
            onMap[eventKey] = eventVal;
          } else if (typeof eventVal === "object" && eventVal !== null) {
            const evObj = eventVal as Record<string, any>;
            onMap[eventKey] = {
              target: String(evObj.target || ""),
              ...(evObj.guard ? { guard: String(evObj.guard) } : {})
            };
          }
        }

        states[stateKey] = {
          ...(agent ? { agent } : {}),
          ...(type ? { type } : {}),
          ...(Object.keys(onMap).length > 0 ? { on: onMap } : {})
        };
      }
    }

    const rawPersonas = parsed.personas || {};
    const personas: Record<string, PersonaWorkflowDefinition> = {};

    for (const [personaKey, rawPersona] of Object.entries(rawPersonas)) {
      if (typeof rawPersona === "object" && rawPersona !== null) {
        const personaObj = rawPersona as Record<string, any>;
        const pInitial = String(personaObj.initial || "");
        const rawSteps = personaObj.steps || {};

        const steps: Record<string, WorkflowStepDefinition> = {};
        for (const [stepKey, rawStep] of Object.entries(rawSteps)) {
          if (typeof rawStep === "object" && rawStep !== null) {
            const stepObj = rawStep as Record<string, any>;
            steps[stepKey] = {
              action: String(stepObj.action || ""),
              ...(stepObj.next ? { next: String(stepObj.next) } : {}),
              ...(stepObj.on_complete ? { on_complete: String(stepObj.on_complete) } : {}),
              ...(stepObj.on_pass ? { on_pass: String(stepObj.on_pass) } : {}),
              ...(stepObj.on_fail ? { on_fail: String(stepObj.on_fail) } : {})
            };
          }
        }

        personas[personaKey] = {
          initial: pInitial,
          steps
        };
      }
    }

    return {
      version,
      name,
      ...(description ? { description } : {}),
      pipeline: {
        initial: pipelineInitial,
        states
      },
      personas
    };
  }
}
