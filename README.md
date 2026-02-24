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

### Step 1: Create a Feishu Application

1. Go to [Feishu Open Platform](https://open.feishu.cn/app) (or [Lark Developer](https://open.larksuite.com/app) for international)
2. Click "Create Self-built Application" (创建企业自建应用)

![Create Application](pics/create_application.png)

### Step 2: Add Bot Capability

In the app settings, go to "App Capabilities" (应用能力) and add "Bot" (机器人):

![Add Bot](pics/add_bot.png)

### Step 3: Configure Permissions

1. Go to "Permission Management" (权限管理) → "Batch Import/Export Permissions" (批量导入/导出权限)
2. Paste the following permission configuration:

```json
{
  "scopes": {
    "tenant": [
      "base:app:copy",
      "base:app:create",
      "base:app:read",
      "base:app:update",
      "base:collaborator:create",
      "base:collaborator:delete",
      "base:collaborator:read",
      "base:dashboard:copy",
      "base:dashboard:read",
      "base:field:create",
      "base:field:delete",
      "base:field:read",
      "base:field:update",
      "base:form:read",
      "base:form:update",
      "base:record:create",
      "base:record:delete",
      "base:record:read",
      "base:record:retrieve",
      "base:record:update",
      "base:role:create",
      "base:role:delete",
      "base:role:read",
      "base:role:update",
      "base:table:create",
      "base:table:delete",
      "base:table:read",
      "base:table:update",
      "base:view:read",
      "base:view:write_only",
      "bitable:app",
      "bitable:app:readonly",
      "board:whiteboard:node:create",
      "board:whiteboard:node:delete",
      "board:whiteboard:node:read",
      "board:whiteboard:node:update",
      "contact:contact.base:readonly",
      "contact:user.base:readonly",
      "contact:user.employee_id:readonly",
      "contact:user.employee_number:read",
      "contact:user.id:readonly",
      "docs:doc",
      "docs:doc:readonly",
      "docs:document.comment:create",
      "docs:document.comment:read",
      "docs:document.comment:update",
      "docs:document.comment:write_only",
      "docs:document.content:read",
      "docs:document.media:download",
      "docs:document.media:upload",
      "docs:document.subscription",
      "docs:document.subscription:read",
      "docs:document:copy",
      "docs:document:export",
      "docs:document:import",
      "docs:event.document_deleted:read",
      "docs:event.document_edited:read",
      "docs:event.document_opened:read",
      "docs:event:subscribe",
      "docs:permission.member",
      "docs:permission.member:auth",
      "docs:permission.member:create",
      "docs:permission.member:delete",
      "docs:permission.member:readonly",
      "docs:permission.member:retrieve",
      "docs:permission.member:transfer",
      "docs:permission.member:update",
      "docs:permission.setting",
      "docs:permission.setting:read",
      "docs:permission.setting:readonly",
      "docs:permission.setting:write_only",
      "docx:document",
      "docx:document.block:convert",
      "docx:document:create",
      "docx:document:readonly",
      "drive:drive",
      "drive:drive.metadata:readonly",
      "drive:drive.search:readonly",
      "drive:drive:readonly",
      "drive:drive:version",
      "drive:drive:version:readonly",
      "drive:export:readonly",
      "drive:file",
      "drive:file.like:readonly",
      "drive:file.meta.sec_label.read_only",
      "drive:file:download",
      "drive:file:readonly",
      "drive:file:upload",
      "drive:file:view_record:readonly",
      "event:ip_list",
      "im:app_feed_card:write",
      "im:biz_entity_tag_relation:read",
      "im:biz_entity_tag_relation:write",
      "im:chat",
      "im:chat.access_event.bot_p2p_chat:read",
      "im:chat.announcement:read",
      "im:chat.announcement:write_only",
      "im:chat.chat_pins:read",
      "im:chat.chat_pins:write_only",
      "im:chat.collab_plugins:read",
      "im:chat.collab_plugins:write_only",
      "im:chat.managers:write_only",
      "im:chat.members:bot_access",
      "im:chat.members:read",
      "im:chat.members:write_only",
      "im:chat.menu_tree:read",
      "im:chat.menu_tree:write_only",
      "im:chat.moderation:read",
      "im:chat.tabs:read",
      "im:chat.tabs:write_only",
      "im:chat.top_notice:write_only",
      "im:chat.widgets:read",
      "im:chat.widgets:write_only",
      "im:chat:create",
      "im:chat:delete",
      "im:chat:moderation:write_only",
      "im:chat:operate_as_owner",
      "im:chat:read",
      "im:chat:readonly",
      "im:chat:update",
      "im:datasync.feed_card.time_sensitive:write",
      "im:message",
      "im:message.group_at_msg:readonly",
      "im:message.group_msg",
      "im:message.p2p_msg:readonly",
      "im:message.pins:read",
      "im:message.pins:write_only",
      "im:message.reactions:read",
      "im:message.reactions:write_only",
      "im:message.urgent",
      "im:message.urgent.status:write",
      "im:message.urgent:phone",
      "im:message.urgent:sms",
      "im:message:readonly",
      "im:message:recall",
      "im:message:send_as_bot",
      "im:message:send_multi_depts",
      "im:message:send_multi_users",
      "im:message:send_sys_msg",
      "im:message:update",
      "im:resource",
      "im:tag:read",
      "im:tag:write",
      "im:url_preview.update",
      "im:user_agent:read",
      "sheets:spreadsheet",
      "sheets:spreadsheet.meta:read",
      "sheets:spreadsheet.meta:write_only",
      "sheets:spreadsheet:create",
      "sheets:spreadsheet:read",
      "sheets:spreadsheet:readonly",
      "sheets:spreadsheet:write_only",
      "space:document.event:read",
      "space:document:delete",
      "space:document:move",
      "space:document:retrieve",
      "space:document:shortcut",
      "space:folder:create",
      "wiki:member:create",
      "wiki:member:retrieve",
      "wiki:member:update",
      "wiki:node:copy",
      "wiki:node:create",
      "wiki:node:move",
      "wiki:node:read",
      "wiki:node:retrieve",
      "wiki:node:update",
      "wiki:setting:read",
      "wiki:setting:write_only",
      "wiki:space:read",
      "wiki:space:retrieve",
      "wiki:space:write_only",
      "wiki:wiki",
      "wiki:wiki:readonly"
    ],
    "user": []
  }
}
```

3. Click "Apply for Activation" (申请开通) → "Confirm" (确认)

### Step 4: Create First Version

Create a version to activate the app:

![Create Version](pics/create_version.png)

Note down your **App ID** and **App Secret** from the app credentials page.

### Step 5: Initialize cc-channel

Back in your terminal:

```bash
cc-channel init
```

This will guide you through:
- Entering your Feishu App ID and Secret
- Setting the default working directory
- Testing the connection
- Starting the background service

### Step 6: Configure Event Subscription (WebSocket)

1. Go back to Feishu Developer Console
2. Navigate to "Events & Callbacks" (事件与回调) → "Event Configuration" (事件配置)
3. Set "Subscription Method" (订阅方式) to "Use Long Connection" (使用长连接接收事件)
4. Click "Add Event" (添加事件) and select all events under "Messages & Groups" (消息与群组)

![Callback Configuration](pics/callback.png)

### Step 7: Create Second Version

Create another version to activate the event subscription.

### Step 8: Start Using

1. Add your bot to a group chat, or start a direct message with the bot
2. Send any message to trigger Claude Code!

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

## Uninstallation

```bash
# 1. Stop the background service
cc-channel stop

# 2. Uninstall the npm package
npm uninstall -g cc-channel

# 3. (Optional) Remove configuration and session data
rm -rf ~/.cc-channel

# 4. (macOS) Remove launchd service file
rm -f ~/Library/LaunchAgents/com.cc-channel.plist
```

If `cc-channel stop` doesn't work properly:

```bash
# macOS: Manually unload launchd service
launchctl bootout gui/$(id -u)/com.cc-channel 2>/dev/null

# Then uninstall
npm uninstall -g cc-channel
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
