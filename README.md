# cc-channel

> Feishu/Lark channel for Claude Code - trigger Claude Code from Feishu messages

A lightweight service that lets you use Claude Code from Feishu/Lark. Send messages to your Feishu bot and get responses from Claude Code running on your local machine.

## Features

- 🚀 **Easy setup** - One command initialization
- 💬 **Multi-turn conversations** - Maintains context across messages
- 🔄 **Background service** - Runs as a daemon, no terminal needed
- 📁 **Per-chat working directory** - Each chat can have its own working directory
- 🌐 **WebSocket connection** - No public IP or port forwarding required

## Prerequisites

- Node.js 18+
- [Claude Code CLI](https://claude.ai/code) installed and configured
- A Feishu/Lark self-built application (see setup guide below)

## Installation

```bash
npm install -g cc-channel
```

## Quick Start

### 1. Create a Feishu Application

1. Go to [Feishu Open Platform](https://open.feishu.cn/app) (or [Lark Developer](https://open.larksuite.com/app) for international)
2. Create a new "Self-built Application" (自建应用)
3. Note down your **App ID** and **App Secret**
4. In the app settings:
   - Enable "Bot" capability (机器人能力)
   - Add message event subscription: `im.message.receive_v1`
   - Configure event subscription method as **WebSocket** (事件订阅方式: 使用长连接接收事件)

### 2. Initialize cc-channel

```bash
cc-channel init
```

This will guide you through:
- Entering your Feishu App ID and Secret
- Setting the default working directory
- Testing the connection
- Starting the background service

### 3. Use in Feishu

1. Add your bot to a group chat, or
2. Start a direct message with the bot

Send any message to trigger Claude Code!

## Usage

### Commands

```bash
# Initialize configuration
cc-channel init

# Start background service
cc-channel start

# Start in foreground (for debugging)
cc-channel start --foreground

# Stop background service
cc-channel stop

# Show status
cc-channel status

# View logs
cc-channel logs
cc-channel logs --follow

# Configuration
cc-channel config list
cc-channel config set claude.defaultWorkDir ~/projects
```

### In-Chat Commands

When messaging the bot in Feishu:

| Command | Description |
|---------|-------------|
| (any message) | Execute with Claude Code |
| `/cc help` | Show available commands |
| `/cc cd <path>` | Change working directory |
| `/cc pwd` | Show current directory |
| `/cc clear` | Clear conversation history |
| `/cc status` | Show session status |

## Configuration

Configuration is stored in `~/.cc-channel/config.json`.

### Example Configuration

```json
{
  "feishu": {
    "appId": "cli_xxxx",
    "appSecret": "xxxx",
    "verificationToken": "",
    "encryptKey": "",
    "domain": "feishu"
  },
  "claude": {
    "defaultWorkDir": "~",
    "timeout": 300000
  }
}
```

### Environment Variables

You can also configure via environment variables:

- `CC_CHANNEL_FEISHU_APP_ID`
- `CC_CHANNEL_FEISHU_APP_SECRET`
- `CC_CHANNEL_FEISHU_DOMAIN`
- `CC_CHANNEL_WORK_DIR`

## How It Works

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   Feishu Bot    │ ◄───────────────► │   cc-channel    │
│   (Cloud)       │                    │   (Local)       │
└─────────────────┘                    └────────┬────────┘
                                                │
                                                │ spawn
                                                ▼
                                       ┌─────────────────┐
                                       │  Claude Code    │
                                       │  CLI            │
                                       └─────────────────┘
```

1. You send a message to your Feishu bot
2. Feishu pushes the event via WebSocket to cc-channel
3. cc-channel spawns Claude Code CLI with your message
4. The response is sent back to Feishu

## Multi-turn Conversations

cc-channel maintains conversation history per chat:

- Each chat (direct message or group) has its own session
- Context is passed to Claude Code for follow-up questions
- Use `/cc clear` to start a fresh conversation

## Security Considerations

- Only users who can message your Feishu bot can trigger Claude Code
- All execution happens locally on your machine
- Session data is stored in `~/.cc-channel/sessions/`

## Troubleshooting

### Claude CLI not found

```bash
# Check if claude is in PATH
which claude

# If installed but not found, add to PATH
export PATH="$PATH:$(dirname $(which claude))"
```

### Connection issues

1. Verify your App ID and Secret are correct
2. Make sure WebSocket mode is enabled in Feishu app settings
3. Check logs: `cc-channel logs`

### Service not starting

```bash
# Check service status
cc-channel status

# Try running in foreground to see errors
cc-channel start --foreground
```

## Development

```bash
# Clone the repo
git clone https://github.com/L-x-C/cc-channel.git
cd cc-channel

# Install dependencies
npm install

# Build
npm run build

# Run locally
node dist/cli.js init
```

## License

MIT
