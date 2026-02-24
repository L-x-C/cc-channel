import chalk from "chalk";
import ora from "ora";
import { homedir } from "os";
import * as readline from "readline";
import {
  setFeishuConfig,
  getFeishuConfig,
  setClaudeConfig,
  type FeishuConfig,
} from "../config.js";
import { createFeishuClient } from "../feishu/client.js";
import { installDaemon, startDaemon } from "../daemon/service.js";

function prompt(rl: readline.ReadLine, question: string, defaultValue?: string): Promise<string> {
  return new Promise((resolve) => {
    const promptText = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(promptText, (answer) => {
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

function promptConfirm(rl: readline.ReadLine, question: string, defaultValue: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const defaultStr = defaultValue ? "Y/n" : "y/N";
    rl.question(`${question} [${defaultStr}]: `, (answer) => {
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === "") {
        resolve(defaultValue);
      } else {
        resolve(trimmed === "y" || trimmed === "yes");
      }
    });
  });
}

async function promptSelect(rl: readline.ReadLine, question: string, choices: string[], defaultChoice: string): Promise<string> {
  console.log(chalk.cyan(`${question}`));
  choices.forEach((c, i) => {
    const marker = c === defaultChoice ? ">" : " ";
    console.log(`  ${marker} ${i + 1}. ${c}`);
  });

  const answer = await prompt(rl, "Select", "1");
  const idx = parseInt(answer, 10) - 1;
  if (idx >= 0 && idx < choices.length) {
    return choices[idx];
  }
  return defaultChoice;
}

export async function initCommand(): Promise<void> {
  console.log(chalk.cyan("\n🚀 cc-channel init\n"));
  console.log("This will guide you through setting up cc-channel.\n");

  // Check Claude CLI
  const claudeSpinner = ora("Checking Claude CLI...").start();
  const { checkClaudeAvailable } = await import("../claude/executor.js");
  const claudeAvailable = await checkClaudeAvailable();
  claudeSpinner.stop();

  if (!claudeAvailable) {
    console.log(chalk.yellow("⚠️  Claude CLI not found. Make sure 'claude' is in your PATH."));
    console.log("   Install Claude Code from: https://claude.ai/code\n");
  } else {
    console.log(chalk.green("✓ Claude CLI found\n"));
  }

  // Show existing config if any
  const existingConfig = getFeishuConfig();
  if (existingConfig) {
    console.log(chalk.dim("Current configuration:"));
    console.log(chalk.dim(`  App ID: ${existingConfig.appId}`));
    console.log(chalk.dim(`  Domain: ${existingConfig.domain}`));
    console.log();
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Domain selection
    const domain = await promptSelect(
      rl,
      "Select Feishu/Lark domain:",
      ["feishu", "lark"],
      existingConfig?.domain ?? "feishu"
    );

    // App ID
    const appId = await prompt(rl, "App ID", existingConfig?.appId);
    if (!appId) {
      console.log(chalk.red("App ID is required"));
      return;
    }

    // App Secret
    const appSecret = await prompt(rl, "App Secret", existingConfig?.appSecret);
    if (!appSecret) {
      console.log(chalk.red("App Secret is required"));
      return;
    }

    // Verification Token (optional)
    const verificationToken = await prompt(rl, "Verification Token (optional)", existingConfig?.verificationToken);

    // Encrypt Key (optional)
    const encryptKey = await prompt(rl, "Encrypt Key (optional)", existingConfig?.encryptKey);

    // Default work dir
    const defaultWorkDir = await prompt(rl, "Default working directory for Claude Code", homedir());

    // Start daemon
    const startDaemonBool = await promptConfirm(rl, "Start as background service?", true);

    // Save configuration
    const feishuConfig: FeishuConfig = {
      appId,
      appSecret,
      verificationToken: verificationToken || undefined,
      encryptKey: encryptKey || undefined,
      domain: domain as "feishu" | "lark",
    };

    setFeishuConfig(feishuConfig);
    setClaudeConfig({
      defaultWorkDir,
    });

    console.log(chalk.green("\n✓ Configuration saved\n"));

    // Test connection
    const testSpinner = ora("Testing Feishu connection...").start();

    try {
      const client = createFeishuClient(feishuConfig);

      // Use generic request method for bot info API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (client as any).request({
        method: "GET",
        url: "/open-apis/bot/v3/info",
        data: {},
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (response.code === 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const bot = response.bot ?? response.data?.bot;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        testSpinner.succeed(`Connected to Feishu bot: ${(bot?.bot_name as string) ?? "Unknown"}`);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        testSpinner.fail(`Connection failed: code ${response.code as number}`);
      }
    } catch (err) {
      testSpinner.fail(`Connection failed: ${err}`);
    }

    // Start daemon if requested
    if (startDaemonBool) {
      console.log();
      const daemonSpinner = ora("Starting background service...").start();

      const installResult = await installDaemon();
      if (!installResult.success) {
        daemonSpinner.fail(installResult.message);
        return;
      }

      const startResult = await startDaemon();
      if (startResult.success) {
        daemonSpinner.succeed(startResult.message);
      } else {
        daemonSpinner.fail(startResult.message);
      }
    }

    // Show next steps
    console.log();
    console.log(chalk.cyan("📝 Next steps:"));
    console.log();
    console.log("1. Add the bot to a Feishu group chat or start a direct message");
    console.log("2. Send a message to trigger Claude Code");
    console.log();
    console.log(chalk.dim("Commands available in chat:"));
    console.log(chalk.dim("  /cc help     - Show available commands"));
    console.log(chalk.dim("  /cc cd <dir> - Change working directory"));
    console.log(chalk.dim("  /cc pwd      - Show current directory"));
    console.log(chalk.dim("  /cc clear    - Clear conversation history"));
    console.log();
  } finally {
    rl.close();
  }
}
