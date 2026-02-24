import * as Lark from "@larksuiteoapi/node-sdk";
import { getFeishuConfig, getClaudeConfig } from "../config.js";
import {
  createFeishuClient,
  createFeishuWSClient,
  createEventDispatcher,
  parseMessageContent,
  replyToMessage,
  replyWithCard,
  MessageEvent,
} from "./client.js";
import {
  getOrCreateSession,
  addMessage,
  setWorkDir,
  Session,
} from "../session/store.js";
import {
  executeClaude,
  buildPromptWithHistory,
  checkClaudeAvailable,
} from "../claude/executor.js";

const COMMAND_PREFIX = "/cc";

interface HandlerContext {
  client: Lark.Client;
  botOpenId: string;
}

/**
 * Handle incoming Feishu message
 */
export async function handleFeishuMessage(
  event: unknown,
  context: HandlerContext
): Promise<void> {
  const messageEvent = parseMessageContent(event);
  if (!messageEvent) {
    console.error("Failed to parse message event");
    return;
  }

  const { messageId, chatId, senderId, content, msgType } = messageEvent;

  // Only handle text messages
  if (msgType !== "text") {
    return;
  }

  // Skip messages from the bot itself
  if (senderId === context.botOpenId) {
    return;
  }

  console.log(`[Message] ${senderId}: ${content}`);

  const trimmedContent = content.trim();

  // Handle commands
  if (trimmedContent.startsWith(COMMAND_PREFIX)) {
    await handleCommand(trimmedContent, messageEvent, context);
    return;
  }

  // Regular message - execute Claude Code
  await handleClaudeRequest(trimmedContent, messageEvent, context);
}

/**
 * Handle slash commands
 */
async function handleCommand(
  content: string,
  event: MessageEvent,
  context: HandlerContext
): Promise<void> {
  const args = content.slice(COMMAND_PREFIX.length).trim().split(/\s+/);
  const command = args[0]?.toLowerCase();

  switch (command) {
    case "help":
      await replyWithCard(
        context.client,
        event.messageId,
        `**cc-channel Commands**

\`/cc help\` - Show this help
\`/cc cd <path>\` - Change working directory
\`/cc pwd\` - Show current directory
\`/cc clear\` - Clear conversation history
\`/cc status\` - Show session status

Just send any message without prefix to execute with Claude Code!`,
        "Help"
      );
      break;

    case "cd": {
      const newPath = args.slice(1).join(" ");
      if (!newPath) {
        await replyToMessage(context.client, event.messageId, "Please specify a path: /cc cd <path>");
        return;
      }
      const session = getOrCreateSession(event.chatId);
      setWorkDir(session, newPath);
      await replyToMessage(context.client, event.messageId, `Working directory changed to: ${newPath}`);
      break;
    }

    case "pwd": {
      const session = getOrCreateSession(event.chatId);
      await replyToMessage(context.client, event.messageId, `Current directory: ${session.workDir}`);
      break;
    }

    case "clear": {
      const session = getOrCreateSession(event.chatId);
      session.messages = [];
      const { saveSession } = await import("../session/store.js");
      saveSession(session);
      await replyToMessage(context.client, event.messageId, "Conversation history cleared. Starting fresh!");
      break;
    }

    case "status": {
      const session = getOrCreateSession(event.chatId);
      const claudeAvailable = await checkClaudeAvailable();
      await replyWithCard(
        context.client,
        event.messageId,
        `**Working Directory:** \`${session.workDir}\`
**Messages:** ${session.messages.length}
**Claude CLI:** ${claudeAvailable ? "✅ Available" : "❌ Not found"}
**Session ID:** \`${session.id}\``,
        "Session Status"
      );
      break;
    }

    default:
      await replyToMessage(
        context.client,
        event.messageId,
        `Unknown command: ${command}\nType /cc help for available commands.`
      );
  }
}

/**
 * Handle Claude Code execution request
 */
async function handleClaudeRequest(
  prompt: string,
  event: MessageEvent,
  context: HandlerContext
): Promise<void> {
  const config = getClaudeConfig();
  const session = getOrCreateSession(event.chatId);

  // Add user message to history
  addMessage(session, "user", prompt);

  // Build prompt with conversation history
  const fullPrompt = buildPromptWithHistory(session, prompt);

  console.log(`[Execute] Running Claude Code in ${session.workDir}...`);

  // Execute Claude Code
  const result = await executeClaude(fullPrompt, {
    workDir: session.workDir,
    timeout: 300000, // 5 minutes default timeout
  });

  if (result.success) {
    // Add assistant response to history
    addMessage(session, "assistant", result.output);

    // Send response (truncate if too long for Feishu)
    const responseText = truncateForFeishu(result.output);

    await replyWithCard(
      context.client,
      event.messageId,
      responseText,
      `✅ Completed (${formatDuration(result.duration)})`
    );

    console.log(`[Execute] Completed in ${result.duration}ms`);
  } else {
    const errorText = result.error || result.output || "Unknown error";

    await replyWithCard(
      context.client,
      event.messageId,
      `❌ **Error**\n\n\`\`\`\n${truncateForFeishu(errorText, 3000)}\n\`\`\``,
      "Execution Failed"
    );

    console.error(`[Execute] Failed: ${errorText}`);
  }
}

/**
 * Truncate text for Feishu (max ~30KB per message)
 */
function truncateForFeishu(text: string, maxLength: number = 28000): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "\n\n... (truncated)";
}

/**
 * Format duration in human readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

/**
 * Fetch bot open_id for self-message filtering
 */
export async function fetchBotOpenId(config: ReturnType<typeof getFeishuConfig>): Promise<string | undefined> {
  if (!config) return undefined;

  try {
    const client = createFeishuClient(config);
    // Use generic request method for bot info API
    const response = await (client as unknown as {
      request: (opts: { method: string; url: string; data: Record<string, never> }) => {
        code?: number;
        msg?: string;
        bot?: { open_id?: string; bot_name?: string };
        data?: { bot?: { open_id?: string } };
      };
    }).request({
      method: "GET",
      url: "/open-apis/bot/v3/info",
      data: {},
    });

    if (response.code === 0) {
      const bot = response.bot ?? response.data?.bot;
      return bot?.open_id;
    }
  } catch (err) {
    console.error("Failed to fetch bot info:", err);
  }

  return undefined;
}

/**
 * Create and start the Feishu WebSocket client
 */
export async function startFeishuListener(
  onMessage: (event: unknown, context: HandlerContext) => Promise<void>
): Promise<{ wsClient: Lark.WSClient; botOpenId: string }> {
  const config = getFeishuConfig();
  if (!config) {
    throw new Error("Feishu not configured. Run 'cc-channel init' first.");
  }

  // Fetch bot info
  const botOpenId = await fetchBotOpenId(config);
  console.log(`Bot open_id: ${botOpenId ?? "unknown"}`);

  // Create client and dispatcher
  const client = createFeishuClient(config);
  const wsClient = createFeishuWSClient(config);
  const eventDispatcher = createEventDispatcher(config);

  // Register event handlers
  eventDispatcher.register({
    "im.message.receive_v1": async (data) => {
      await onMessage(data, { client, botOpenId: botOpenId ?? "" });
    },
  });

  // Start WebSocket
  wsClient.start({ eventDispatcher });

  return { wsClient, botOpenId: botOpenId ?? "" };
}
