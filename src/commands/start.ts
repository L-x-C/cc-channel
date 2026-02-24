import chalk from "chalk";
import ora from "ora";
import { isConfigured, getFeishuConfig, getClaudeConfig } from "../config.js";
import { startFeishuListener } from "../feishu/handler.js";
import { checkClaudeAvailable } from "../claude/executor.js";

export async function startCommand(foreground: boolean = false): Promise<void> {
  if (!isConfigured()) {
    console.log(chalk.red("Error: Not configured. Run 'cc-channel init' first."));
    process.exit(1);
  }

  // Check Claude CLI
  if (!(await checkClaudeAvailable())) {
    console.log(chalk.yellow("Warning: Claude CLI not found. Some features may not work."));
  }

  if (foreground) {
    await runForeground();
  } else {
    // Start as daemon
    const { startDaemon, isDaemonInstalled } = await import("../daemon/service.js");

    if (!isDaemonInstalled()) {
      console.log("Installing daemon service...");
    }

    const result = await startDaemon();
    if (result.success) {
      console.log(chalk.green(result.message));
    } else {
      console.log(chalk.red(result.message));
      process.exit(1);
    }
  }
}

async function runForeground(): Promise<void> {
  console.log(chalk.cyan("🚀 Starting cc-channel in foreground...\n"));

  const feishuConfig = getFeishuConfig()!;
  const claudeConfig = getClaudeConfig();

  console.log(`Feishu App ID: ${feishuConfig.appId}`);
  console.log(`Domain: ${feishuConfig.domain}`);
  console.log(`Working Dir: ${claudeConfig.defaultWorkDir}`);
  console.log();

  const spinner = ora("Connecting to Feishu...").start();

  try {
    const { botOpenId } = await startFeishuListener(async (event, context) => {
      const { handleFeishuMessage } = await import("../feishu/handler.js");
      await handleFeishuMessage(event, context);
    });

    spinner.succeed(`Connected! Bot ID: ${botOpenId}`);
    console.log();
    console.log(chalk.green("✓ cc-channel is running"));
    console.log(chalk.dim("Press Ctrl+C to stop"));
    console.log();

    // Keep process alive
    process.on("SIGINT", () => {
      console.log(chalk.yellow("\nStopping..."));
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log(chalk.yellow("\nStopping..."));
      process.exit(0);
    });

    // Prevent process from exiting
    await new Promise(() => {});
  } catch (err) {
    spinner.fail(`Failed to start: ${err}`);
    process.exit(1);
  }
}
