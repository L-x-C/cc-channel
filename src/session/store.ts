import { join } from "path";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from "fs";
import { homedir } from "os";
import { v4 as uuidv4 } from "uuid";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  chatId: string;
  workDir: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const SESSIONS_DIR = join(homedir(), ".cc-channel", "sessions");

function ensureSessionsDir(): void {
  if (!existsSync(SESSIONS_DIR)) {
    mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function getSessionPath(sessionId: string): string {
  return join(SESSIONS_DIR, `${sessionId}.json`);
}

function getChatIndexSessionPath(chatId: string): string {
  // Normalize chatId to be filesystem-safe
  const safeId = chatId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(SESSIONS_DIR, `${safeId}.json`);
}

export function createSession(chatId: string, workDir: string): Session {
  ensureSessionsDir();

  const session: Session = {
    id: uuidv4(),
    chatId,
    workDir,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  saveSession(session);
  return session;
}

export function getOrCreateSession(chatId: string, workDir?: string): Session {
  const existing = getSessionByChatId(chatId);
  if (existing) {
    return existing;
  }
  return createSession(chatId, workDir || homedir());
}

export function getSession(sessionId: string): Session | null {
  ensureSessionsDir();

  const path = getSessionPath(sessionId);
  if (!existsSync(path)) {
    return null;
  }

  try {
    const data = readFileSync(path, "utf-8");
    return JSON.parse(data) as Session;
  } catch {
    return null;
  }
}

export function getSessionByChatId(chatId: string): Session | null {
  ensureSessionsDir();

  const path = getChatIndexSessionPath(chatId);
  if (!existsSync(path)) {
    return null;
  }

  try {
    const data = readFileSync(path, "utf-8");
    return JSON.parse(data) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  ensureSessionsDir();

  session.updatedAt = Date.now();

  // Save by session ID
  const sessionPath = getSessionPath(session.id);
  writeFileSync(sessionPath, JSON.stringify(session, null, 2));

  // Also save by chat ID for quick lookup
  const chatPath = getChatIndexSessionPath(session.chatId);
  writeFileSync(chatPath, JSON.stringify(session, null, 2));
}

export function addMessage(
  session: Session,
  role: "user" | "assistant",
  content: string
): void {
  session.messages.push({
    role,
    content,
    timestamp: Date.now(),
  });
  saveSession(session);
}

export function clearSession(sessionId: string): void {
  ensureSessionsDir();

  const session = getSession(sessionId);
  if (session) {
    const sessionPath = getSessionPath(sessionId);
    const chatPath = getChatIndexSessionPath(session.chatId);

    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }
    if (existsSync(chatPath)) {
      unlinkSync(chatPath);
    }
  }
}

export function clearAllSessions(): void {
  ensureSessionsDir();

  const files = readdirSync(SESSIONS_DIR);
  for (const file of files) {
    if (file.endsWith(".json")) {
      unlinkSync(join(SESSIONS_DIR, file));
    }
  }
}

export function listSessions(): Session[] {
  ensureSessionsDir();

  const files = readdirSync(SESSIONS_DIR);
  const sessions: Session[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    try {
      const data = readFileSync(join(SESSIONS_DIR, file), "utf-8");
      const session = JSON.parse(data) as Session;

      // Deduplicate (we save both by session ID and chat ID)
      if (!seen.has(session.id)) {
        seen.add(session.id);
        sessions.push(session);
      }
    } catch {
      // Skip invalid files
    }
  }

  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function setWorkDir(session: Session, workDir: string): void {
  session.workDir = workDir;
  saveSession(session);
}
