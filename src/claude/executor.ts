import { spawn, ChildProcess } from "child_process";
import { Session } from "../session/store.js";

export interface ExecuteResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

export interface ExecuteOptions {
  workDir: string;
  timeout: number;
}

/**
 * Execute Claude Code CLI with the given prompt
 */
export async function executeClaude(
  prompt: string,
  options: ExecuteOptions
): Promise<ExecuteResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    let output = "";
    let errorOutput = "";

    // Create a clean environment, removing CLAUDECODE to allow nested execution
    const cleanEnv = { ...process.env };
    delete cleanEnv.CLAUDECODE;

    const child: ChildProcess = spawn("claude", ["--print", prompt], {
      cwd: options.workDir,
      env: {
        ...cleanEnv,
        // Ensure non-interactive mode
        CI: "true",
        TERM: "dumb",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Set timeout
    const timeoutId = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({
        success: false,
        output: "",
        error: `Execution timed out after ${options.timeout}ms`,
        duration: Date.now() - startTime,
      });
    }, options.timeout);

    child.stdout?.on("data", (data: Buffer) => {
      output += data.toString();
    });

    child.stderr?.on("data", (data: Buffer) => {
      errorOutput += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (code === 0) {
        resolve({
          success: true,
          output: output.trim(),
          duration,
        });
      } else {
        resolve({
          success: false,
          output: output.trim(),
          error: errorOutput.trim() || `Process exited with code ${code}`,
          duration,
        });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        output: "",
        error: err.message,
        duration: Date.now() - startTime,
      });
    });
  });
}

/**
 * Build a prompt with conversation history for multi-turn context
 */
export function buildPromptWithHistory(session: Session, currentPrompt: string): string {
  if (session.messages.length === 0) {
    return currentPrompt;
  }

  // Build context from recent messages (limit to prevent context overflow)
  const recentMessages = session.messages.slice(-20); // Last 20 messages

  const historyContext = recentMessages
    .map((msg) => {
      const role = msg.role === "user" ? "User" : "Assistant";
      return `${role}: ${msg.content}`;
    })
    .join("\n\n");

  return `Previous conversation context:
${historyContext}

Current request: ${currentPrompt}`;
}

/**
 * Check if Claude CLI is available
 */
export async function checkClaudeAvailable(): Promise<boolean> {
  // Create a clean environment, removing CLAUDECODE
  const cleanEnv = { ...process.env };
  delete cleanEnv.CLAUDECODE;

  return new Promise((resolve) => {
    const child = spawn("claude", ["--version"], {
      env: cleanEnv,
      stdio: "ignore",
    });

    child.on("close", (code) => {
      resolve(code === 0);
    });

    child.on("error", () => {
      resolve(false);
    });
  });
}
