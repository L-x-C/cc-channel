import chalk from "chalk";
import {
  getFeishuConfig,
  setFeishuConfig,
  getClaudeConfig,
  setClaudeConfig,
  getConfigPath,
  type FeishuConfig,
} from "../config.js";

export async function configCommand(action: string, key?: string, value?: string): Promise<void> {
  switch (action) {
    case "list":
    case "show":
      showConfig();
      break;

    case "set":
      if (!key || !value) {
        console.log(chalk.red("Usage: cc-channel config set <key> <value>"));
        console.log();
        console.log("Available keys:");
        console.log("  feishu.appId");
        console.log("  feishu.appSecret");
        console.log("  feishu.verificationToken");
        console.log("  feishu.encryptKey");
        console.log("  feishu.domain");
        console.log("  claude.defaultWorkDir");
        return;
      }
      await setConfigValue(key, value);
      break;

    case "path":
      console.log(getConfigPath());
      break;

    default:
      console.log(chalk.red(`Unknown action: ${action}`));
      console.log("Usage: cc-channel config <list|set|path>");
  }
}

function showConfig(): void {
  console.log(chalk.cyan("\n⚙️  Configuration\n"));
  console.log(`Config file: ${getConfigPath()}`);
  console.log();

  const feishu = getFeishuConfig();
  const claude = getClaudeConfig();

  console.log(chalk.bold("Feishu:"));
  if (feishu) {
    console.log(`  appId: ${feishu.appId}`);
    console.log(`  appSecret: ${feishu.appSecret ? "********" : "(not set)"}`);
    console.log(`  domain: ${feishu.domain}`);
    console.log(`  verificationToken: ${feishu.verificationToken ? "********" : "(not set)"}`);
    console.log(`  encryptKey: ${feishu.encryptKey ? "********" : "(not set)"}`);
  } else {
    console.log(chalk.yellow("  Not configured"));
  }
  console.log();

  console.log(chalk.bold("Claude:"));
  console.log(`  defaultWorkDir: ${claude.defaultWorkDir}`);
  console.log();
}

async function setConfigValue(key: string, value: string): Promise<void> {
  const [section, subkey] = key.split(".");

  if (section === "feishu") {
    const existing = getFeishuConfig();
    if (!existing) {
      console.log(chalk.red("Feishu not configured. Run 'cc-channel init' first."));
      return;
    }

    const feishu: FeishuConfig = { ...existing };

    switch (subkey) {
      case "appId":
        feishu.appId = value;
        break;
      case "appSecret":
        feishu.appSecret = value;
        break;
      case "verificationToken":
        feishu.verificationToken = value || undefined;
        break;
      case "encryptKey":
        feishu.encryptKey = value || undefined;
        break;
      case "domain":
        if (value !== "feishu" && value !== "lark") {
          console.log(chalk.red("Domain must be 'feishu' or 'lark'"));
          return;
        }
        feishu.domain = value;
        break;
      default:
        console.log(chalk.red(`Unknown key: feishu.${subkey}`));
        return;
    }

    setFeishuConfig(feishu);
    console.log(chalk.green(`✓ Set ${key}`));
  } else if (section === "claude") {
    switch (subkey) {
      case "defaultWorkDir":
        setClaudeConfig({ defaultWorkDir: value });
        break;
      default:
        console.log(chalk.red(`Unknown key: claude.${subkey}`));
        return;
    }

    console.log(chalk.green(`✓ Set ${key}`));
  } else {
    console.log(chalk.red(`Unknown section: ${section}`));
  }
}
