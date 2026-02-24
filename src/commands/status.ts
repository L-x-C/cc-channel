import chalk from "chalk";
import { isConfigured, getFeishuConfig, getClaudeConfig, getConfigPath } from "../config.js";
import { getDaemonStatus } from "../daemon/service.js";
import { checkClaudeAvailable } from "../claude/executor.js";
import { listSessions } from "../session/store.js";

export async function statusCommand(): Promise<void> {
  console.log(chalk.cyan("\n📊 cc-channel status\n"));

  // Configuration status
  console.log(chalk.bold("Configuration:"));
  console.log(`  Config file: ${getConfigPath()}`);

  if (isConfigured()) {
    const feishuConfig = getFeishuConfig()!;
    console.log(`  Feishu App ID: ${feishuConfig.appId}`);
    console.log(`  Domain: ${feishuConfig.domain}`);
    console.log(chalk.green("  ✓ Configured"));
  } else {
    console.log(chalk.yellow("  ✗ Not configured"));
    console.log("    Run 'cc-channel init' to configure");
  }
  console.log();

  // Claude CLI status
  console.log(chalk.bold("Claude CLI:"));
  const claudeAvailable = await checkClaudeAvailable();
  if (claudeAvailable) {
    console.log(chalk.green("  ✓ Available"));
  } else {
    console.log(chalk.red("  ✗ Not found"));
    console.log("    Install from: https://claude.ai/code");
  }
  console.log();

  // Working directory
  const claudeConfig = getClaudeConfig();
  console.log(chalk.bold("Settings:"));
  console.log(`  Default work dir: ${claudeConfig.defaultWorkDir}`);
  console.log();

  // Daemon status
  console.log(chalk.bold("Background Service:"));
  const daemonStatus = await getDaemonStatus();
  console.log(`  Platform: ${daemonStatus.platform}`);

  if (daemonStatus.installed) {
    console.log(chalk.green("  ✓ Installed"));
  } else {
    console.log(chalk.yellow("  ✗ Not installed"));
  }

  if (daemonStatus.running) {
    console.log(chalk.green("  ✓ Running"));
    console.log("  Logs: /tmp/cc-channel.log");
  } else {
    console.log(chalk.dim("  ○ Not running"));
  }
  console.log();

  // Sessions
  const sessions = listSessions();
  console.log(chalk.bold("Sessions:"));
  console.log(`  Total: ${sessions.length}`);

  if (sessions.length > 0) {
    console.log("  Recent:");
    sessions.slice(0, 5).forEach((s) => {
      const time = new Date(s.updatedAt).toLocaleString();
      console.log(`    - ${s.chatId.slice(0, 20)}... (${s.messages.length} msgs, ${time})`);
    });
  }
  console.log();
}
