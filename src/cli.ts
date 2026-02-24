#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8")
);

const program = new Command();

program
  .name("cc-channel")
  .description("Feishu/Lark channel for Claude Code - trigger Claude Code from Feishu messages")
  .version(packageJson.version);

program
  .command("init")
  .description("Initialize and configure cc-channel")
  .action(async () => {
    const { initCommand } = await import("./commands/init.js");
    await initCommand();
  });

program
  .command("start")
  .description("Start the cc-channel service")
  .option("-f, --foreground", "Run in foreground instead of background daemon")
  .action(async (options: { foreground: boolean }) => {
    const { startCommand } = await import("./commands/start.js");
    await startCommand(options.foreground);
  });

program
  .command("stop")
  .description("Stop the background daemon")
  .action(async () => {
    const { stopCommand } = await import("./commands/stop.js");
    await stopCommand();
  });

program
  .command("status")
  .description("Show status and configuration")
  .action(async () => {
    const { statusCommand } = await import("./commands/status.js");
    await statusCommand();
  });

program
  .command("config")
  .description("View or modify configuration")
  .argument("<action>", "list, set, or path")
  .argument("[key]", "Config key (for set)")
  .argument("[value]", "Config value (for set)")
  .action(async (action: string, key?: string, value?: string) => {
    const { configCommand } = await import("./commands/config-cmd.js");
    await configCommand(action, key, value);
  });

program
  .command("logs")
  .description("Show recent logs")
  .option("-f, --follow", "Follow log output")
  .action(async (options: { follow: boolean }) => {
    const { logsCommand } = await import("./commands/logs.js");
    await logsCommand(options);
  });

program.parse();
