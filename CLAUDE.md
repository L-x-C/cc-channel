# cc-channel 开发指南

## 项目概述

cc-channel 是一个 npm 全局安装包，允许通过飞书/Lark 消息触发本地 Claude Code 执行。

## 技术架构

### 核心组件

```
src/
├── cli.ts              # CLI 入口 (cc-channel 命令)
├── daemon.ts           # 守护进程入口
├── commands/           # CLI 子命令
│   ├── init.ts         # 交互式配置
│   ├── start.ts        # 启动守护进程
│   └── stop.ts         # 停止守护进程
├── daemon/
│   └── service.ts      # launchd/systemd 服务管理
├── feishu/
│   ├── client.ts       # 飞书 SDK 封装、消息解析
│   └── handler.ts      # 消息处理、Claude 执行
├── claude/
│   └── executor.ts     # Claude Code CLI 执行器
├── session/
│   └── store.ts        # 会话持久化（多轮对话）
└── config.ts           # 配置管理 (conf 库)
```

### 通信流程

```
飞书消息 → 飞书服务器 → WebSocket 长连接 → cc-channel daemon
    → 消息解析 → 会话管理 → Claude Code 执行 → 回复飞书
```

## 踩过的坑

### 1. ES Modules 中 `__dirname` 未定义

**问题**: Node.js ES Modules 模式下，`__dirname` 和 `__filename` 不存在。

**错误信息**:
```
ReferenceError: __dirname is not defined
```

**解决方案**:
```typescript
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getDaemonScriptPath(): string {
  return join(__dirname, "..", "daemon.js");
}
```

### 2. 飞书 SDK 事件结构

**问题**: SDK 传递的事件结构与文档示例不同。

**错误现象**: `Failed to parse message event`

**原因**: SDK 的 `im.message.receive_v1` 回调直接传递 `{ sender, message }`，而不是嵌套在 `event` 字段中。

**解决方案** (client.ts):
```typescript
export function parseMessageContent(event: unknown): MessageEvent | null {
  // SDK 直接传递 { sender, message }，不是 { event: { sender, message } }
  const data = event as {
    sender?: {
      sender_id?: { open_id?: string; };
    };
    message?: {
      message_id?: string;
      chat_id?: string;
      msg_type?: string;
      content?: string;
    };
  };

  const message = data?.message;
  const sender = data?.sender;

  if (!message) return null;
  // ...
}
```

### 3. launchctl bootstrap 错误 (5: Input/output error)

**问题**: 重启服务时 launchctl 报错。

**错误信息**:
```
Bootstrap failed: 5: Input/output error
```

**原因**: 服务已加载但未正确卸载。

**解决方案**:
```bash
# 先卸载再启动
launchctl bootout gui/501/com.cc-channel 2>/dev/null
sleep 1
cc-channel start
```

### 4. Claude Code 嵌套会话检测

**问题**: 在 Claude Code 会话中执行 `claude` 命令被拒绝。

**错误信息**:
```
Error: Claude Code cannot be launched inside another Claude Code session.
Nested sessions share runtime resources and will crash all active sessions.
To bypass this check, unset the CLAUDECODE environment variable.
```

**解决方案** (executor.ts):
```typescript
// 创建干净的环境，移除 CLAUDECODE 以允许嵌套执行
const cleanEnv = { ...process.env };
delete cleanEnv.CLAUDECODE;

const child = spawn("claude", ["--print", prompt], {
  cwd: options.workDir,
  env: {
    ...cleanEnv,
    CI: "true",
    TERM: "dumb",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
```

### 5. 配置的 defaultWorkDir 未生效

**问题**: 配置了 `defaultWorkDir`，但执行时仍使用 `homedir()`。

**原因**: `getOrCreateSession` 调用时未传入配置的默认目录。

**解决方案** (handler.ts):
```typescript
async function handleClaudeRequest(prompt: string, event: MessageEvent, context: HandlerContext): Promise<void> {
  const config = getClaudeConfig();
  // 传入 defaultWorkDir
  const session = getOrCreateSession(event.chatId, config.defaultWorkDir);
  // ...
}
```

### 6. 消息重复处理

**问题**: 同一条消息被处理多次，导致多次回复。

**原因**: 飞书在未收到 ACK 或超时时会重发事件。

**解决方案** (handler.ts):
```typescript
// 消息去重缓存
const processedMessages = new Map<string, number>();
const MESSAGE_DEDUP_TTL = 60000; // 1 分钟

function isDuplicate(messageId: string): boolean {
  const now = Date.now();
  const lastProcessed = processedMessages.get(messageId);

  if (lastProcessed && now - lastProcessed < MESSAGE_DEDUP_TTL) {
    return true;
  }

  processedMessages.set(messageId, now);

  // 清理过期条目
  for (const [id, time] of processedMessages) {
    if (now - time > MESSAGE_DEDUP_TTL) {
      processedMessages.delete(id);
    }
  }

  return false;
}
```

## 飞书开发者配置

### 必需配置

1. **事件订阅**:
   - 订阅方式: 使用长连接接收事件
   - 事件: `im.message.receive_v1`

2. **权限配置**:
   - `im:message` - 获取消息
   - `im:message:send_as_bot` - 以应用身份发消息

### 获取凭证

1. 飞书开发者后台 → 应用凭证
2. 复制 App ID 和 App Secret
3. 运行 `cc-channel init` 配置

## 常用命令

```bash
# 初始化配置
cc-channel init

# 启动守护进程
cc-channel start

# 停止守护进程
cc-channel stop

# 查看状态
cc-channel status

# 查看日志
tail -f /tmp/cc-channel.log
tail -f /tmp/cc-channel.error.log

# 强制重启 (解决 launchctl 错误)
launchctl bootout gui/501/com.cc-channel 2>/dev/null; cc-channel start
```

## 开发调试

```bash
# 本地开发
cd /Users/lxc/git/cc-channel
npm run build
npm install -g .

# 查看会话数据
cat ~/.cc-channel/sessions/*.json

# 清除会话
rm -f ~/.cc-channel/sessions/*.json
```

## 依赖说明

- `@larksuiteoapi/node-sdk` - 飞书官方 Node.js SDK
- `conf` - 配置持久化
- `uuid` - 会话 ID 生成
- `commander` - CLI 框架
