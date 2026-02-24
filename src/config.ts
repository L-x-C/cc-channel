import Conf from "conf";
import { homedir } from "os";

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  verificationToken?: string;
  encryptKey?: string;
  domain: "feishu" | "lark";
}

export interface ClaudeConfig {
  defaultWorkDir: string;
}

export interface AppConfig {
  feishu: FeishuConfig | null;
  claude: ClaudeConfig;
}

const defaults: AppConfig = {
  feishu: null,
  claude: {
    defaultWorkDir: homedir(),
  },
};

export const config = new Conf<AppConfig>({
  projectName: "cc-channel",
  defaults,
});

export function getFeishuConfig(): FeishuConfig | null {
  return config.get("feishu");
}

export function setFeishuConfig(cfg: FeishuConfig): void {
  config.set("feishu", cfg);
}

export function getClaudeConfig(): ClaudeConfig {
  return config.get("claude");
}

export function setClaudeConfig(cfg: Partial<ClaudeConfig>): void {
  config.set("claude", { ...config.get("claude"), ...cfg });
}

export function isConfigured(): boolean {
  const feishu = getFeishuConfig();
  return feishu !== null && feishu.appId !== "" && feishu.appSecret !== "";
}

export function getConfigPath(): string {
  return config.path;
}
