import * as Lark from "@larksuiteoapi/node-sdk";
import { FeishuConfig } from "../config.js";

export type { FeishuConfig } from "../config.js";

export interface MessageEvent {
  messageId: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  msgType: string;
  createTime: number;
}

export function resolveDomain(domain: "feishu" | "lark"): Lark.Domain {
  return domain === "lark" ? Lark.Domain.Lark : Lark.Domain.Feishu;
}

export function createFeishuClient(config: FeishuConfig): Lark.Client {
  return new Lark.Client({
    appId: config.appId,
    appSecret: config.appSecret,
    appType: Lark.AppType.SelfBuild,
    domain: resolveDomain(config.domain),
  });
}

export function createFeishuWSClient(config: FeishuConfig): Lark.WSClient {
  return new Lark.WSClient({
    appId: config.appId,
    appSecret: config.appSecret,
    domain: resolveDomain(config.domain),
    loggerLevel: Lark.LoggerLevel.info,
  });
}

export function createEventDispatcher(config: FeishuConfig): Lark.EventDispatcher {
  return new Lark.EventDispatcher({
    encryptKey: config.encryptKey,
    verificationToken: config.verificationToken,
  });
}

/**
 * Parse message content from Feishu event
 * The SDK passes the event directly as { sender, message }
 */
export function parseMessageContent(event: unknown): MessageEvent | null {
  try {
    // Debug: log the raw event structure
    console.log("[Debug] Parsing event:", JSON.stringify(event, null, 2));

    // The event from SDK is directly { sender, message }, not nested
    const data = event as {
      sender?: {
        sender_id?: {
          open_id?: string;
          user_id?: string;
          union_id?: string;
        };
        sender_type?: string;
        tenant_key?: string;
      };
      message?: {
        message_id?: string;
        chat_id?: string;
        msg_type?: string;
        content?: string;
        create_time?: string;
        mentions?: Array<{
          key: string;
          id: { open_id?: string };
          name: string;
        }>;
      };
    };

    const message = data?.message;
    const sender = data?.sender;

    if (!message) {
      console.log("[Debug] No message field in event");
      return null;
    }

    // Parse content based on message type
    let content = message.content ?? "";
    const msgType = message.msg_type ?? "text";

    if (msgType === "text" && content) {
      try {
        const parsed = JSON.parse(content);
        content = parsed.text ?? content;
      } catch {
        // Keep raw content
      }
    } else if (msgType === "post" && content) {
      try {
        // Extract text from rich text post
        const parsed = JSON.parse(content);
        const textContent = extractPostText(parsed);
        if (textContent) content = textContent;
      } catch {
        // Keep raw content
      }
    }

    return {
      messageId: message.message_id ?? "",
      chatId: message.chat_id ?? "",
      senderId: sender?.sender_id?.open_id ?? "",
      senderName: "", // Will be fetched separately if needed
      content,
      msgType,
      createTime: message.create_time ? parseInt(message.create_time, 10) : Date.now(),
    };
  } catch (err) {
    console.error("[Debug] Parse error:", err);
    return null;
  }
}

/**
 * Extract text content from Feishu post (rich text) message
 */
function extractPostText(post: {
  zh_cn?: { content?: Array<Array<{ tag?: string; text?: string }>> };
  en_us?: { content?: Array<Array<{ tag?: string; text?: string }>> };
}): string {
  const content = post.zh_cn?.content ?? post.en_us?.content ?? [];
  const lines: string[] = [];

  for (const paragraph of content) {
    const text = paragraph
      .filter((el) => el.tag === "text" || el.tag === "md")
      .map((el) => el.text ?? "")
      .join("");
    if (text) lines.push(text);
  }

  return lines.join("\n");
}

/**
 * Send a text message to a chat
 */
export async function sendTextMessage(
  client: Lark.Client,
  chatId: string,
  text: string
): Promise<void> {
  await client.im.message.create({
    params: { receive_id_type: "chat_id" },
    data: {
      receive_id: chatId,
      content: JSON.stringify({ text }),
      msg_type: "text",
    },
  });
}

/**
 * Reply to a message
 */
export async function replyToMessage(
  client: Lark.Client,
  messageId: string,
  text: string
): Promise<void> {
  await client.im.message.reply({
    path: { message_id: messageId },
    data: {
      content: JSON.stringify({ text }),
      msg_type: "text",
    },
  });
}

/**
 * Send a markdown card message
 */
export async function sendCardMessage(
  client: Lark.Client,
  chatId: string,
  markdown: string,
  title?: string
): Promise<void> {
  const card = {
    schema: "2.0",
    config: {
      wide_screen_mode: true,
    },
    header: title
      ? {
          title: { tag: "plain_text", content: title },
          template: "blue",
        }
      : undefined,
    body: {
      elements: [
        {
          tag: "markdown",
          content: markdown,
        },
      ],
    },
  };

  await client.im.message.create({
    params: { receive_id_type: "chat_id" },
    data: {
      receive_id: chatId,
      content: JSON.stringify(card),
      msg_type: "interactive",
    },
  });
}

/**
 * Reply with a markdown card
 */
export async function replyWithCard(
  client: Lark.Client,
  messageId: string,
  markdown: string,
  title?: string
): Promise<void> {
  const card = {
    schema: "2.0",
    config: {
      wide_screen_mode: true,
    },
    header: title
      ? {
          title: { tag: "plain_text", content: title },
          template: "blue",
        }
      : undefined,
    body: {
      elements: [
        {
          tag: "markdown",
          content: markdown,
        },
      ],
    },
  };

  await client.im.message.reply({
    path: { message_id: messageId },
    data: {
      content: JSON.stringify(card),
      msg_type: "interactive",
    },
  });
}
