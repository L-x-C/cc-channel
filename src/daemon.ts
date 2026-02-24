#!/usr/bin/env node

/**
 * Daemon entry point for cc-channel background service.
 * This is the script that gets run by launchd/systemd.
 */

import chalk from "chalk";
import { isConfigured, getFeishuConfig, getClaudeConfig } from "./config.js";
import { startFeishuListener } from "./feishu/handler.js";
import { handleFeishuMessage } from "./feishu/handler.js";

async function main(): Promise<void> {
  console.log(chalk.cyan("cc-channel daemon starting..."));
  console.log(`PID: ${process.pid}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log();

  if (!isConfigured()) {
    console.error("Error: Not configured. Run 'cc-channel init' first.");
    process.exit(1);
  }

  const feishuConfig = getFeishuConfig()!;
  const claudeConfig = getClaudeConfig();

  console.log(`Feishu App ID: ${feishuConfig.appId}`);
  console.log(`Domain: ${feishuConfig.domain}`);
  console.log(`Working Dir: ${claudeConfig.defaultWorkDir}`);
  console.log();

  // Handle shutdown signals
  process.on("SIGINT", () => {
    console.log("Received SIGINT, shutting down...");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("Received SIGTERM, shutting down...");
    process.exit(0);
  });

  // Handle uncaught errors
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
  });

  try {
    const { botOpenId } = await startFeishuListener(async (event, context) => {
      await handleFeishuMessage(event, context);
    });

    console.log(`Connected! Bot ID: ${botOpenId}`);
    console.log("cc-channel daemon is running.\n");

    // Keep process alive
    await new Promise(() => {});
  } catch (err) {
    console.error("Failed to start:", err);
    process.exit(1);
  }
}

main();
