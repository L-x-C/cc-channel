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
 */
export function parseMessageContent(event: unknown): MessageEvent | null {
  try {
    const data = event as {
      event?: {
        message?: {
          message_id?: string;
          chat_id?: string;
          msg_type?: string;
          content?: string;
          create_time?: string;
          sender?: {
            sender_id?: {
              open_id?: string;
              user_id?: string;
            };
            sender_type?: string;
          };
        };
        sender?: {
          sender_id?: {
            open_id?: string;
            user_id?: string;
          };
        };
      };
      event_context?: {
        open_message_id?: string;
        open_chat_id?: string;
      };
    };

    const message = data?.event?.message;
    if (!message) return null;

    // Parse content based on message type
    let content = message.content ?? "";
    if (message.msg_type === "text" && content) {
      try {
        const parsed = JSON.parse(content);
        content = parsed.text ?? content;
      } catch {
        // Keep raw content
      }
    }

    return {
      messageId: message.message_id ?? "",
      chatId: message.chat_id ?? "",
      senderId:
        message.sender?.sender_id?.open_id ??
        data?.event?.sender?.sender_id?.open_id ??
        "",
      senderName: "", // Will be fetched separately if needed
      content,
      msgType: message.msg_type ?? "text",
      createTime: message.create_time ? parseInt(message.create_time, 10) : Date.now(),
    };
  } catch {
    return null;
  }
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
