import { homedir, platform } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  existsSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  mkdirSync,
} from "fs";

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isMacOS = platform() === "darwin";
const isLinux = platform() === "linux";

const LAUNCH_AGENT_NAME = "com.cc-channel";
const SYSTEMD_SERVICE_NAME = "cc-channel";

function getLaunchAgentPath(): string {
  const dir = join(homedir(), "Library", "LaunchAgents");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, `${LAUNCH_AGENT_NAME}.plist`);
}

function getSystemdServicePath(): string {
  const dir = join(homedir(), ".config", "systemd", "user");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, `${SYSTEMD_SERVICE_NAME}.service`);
}

function getNodePath(): string {
  return process.execPath;
}

function getDaemonScriptPath(): string {
  // __dirname is dist/daemon/ (this file is dist/daemon/service.js)
  // daemon.js is in dist/daemon.js
  return join(__dirname, "..", "daemon.js");
}

/**
 * Generate macOS LaunchAgent plist content
 */
function generateLaunchAgentPlist(): string {
  const nodePath = getNodePath();
  const daemonPath = getDaemonScriptPath();

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LAUNCH_AGENT_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${daemonPath}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/cc-channel.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/cc-channel.error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${join(homedir(), ".local", "bin")}</string>
    </dict>
</dict>
</plist>`;
}

/**
 * Generate Linux systemd service content
 */
function generateSystemdService(): string {
  const nodePath = getNodePath();
  const daemonPath = getDaemonScriptPath();

  return `[Unit]
Description=CC-Channel - Feishu channel for Claude Code
After=network.target

[Service]
Type=simple
ExecStart=${nodePath} ${daemonPath}
Restart=always
RestartSec=10
StandardOutput=file:/tmp/cc-channel.log
StandardError=file:/tmp/cc-channel.error.log
Environment=PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${join(homedir(), ".local", "bin")}

[Install]
WantedBy=default.target
`;
}

export interface DaemonStatus {
  installed: boolean;
  running: boolean;
  platform: "macos" | "linux" | "unsupported";
}

/**
 * Check if daemon is installed
 */
export function isDaemonInstalled(): boolean {
  if (isMacOS) {
    return existsSync(getLaunchAgentPath());
  }
  if (isLinux) {
    return existsSync(getSystemdServicePath());
  }
  return false;
}

/**
 * Install daemon service
 */
export async function installDaemon(): Promise<{ success: boolean; message: string }> {
  if (isMacOS) {
    const plistPath = getLaunchAgentPath();
    const plistContent = generateLaunchAgentPlist();

    writeFileSync(plistPath, plistContent);

    return {
      success: true,
      message: `LaunchAgent installed at ${plistPath}`,
    };
  }

  if (isLinux) {
    const servicePath = getSystemdServicePath();
    const serviceContent = generateSystemdService();

    writeFileSync(servicePath, serviceContent);

    return {
      success: true,
      message: `Systemd service installed at ${servicePath}. Run 'systemctl --user daemon-reload' to reload.`,
    };
  }

  return {
    success: false,
    message: "Unsupported platform. Only macOS and Linux are supported.",
  };
}

/**
 * Uninstall daemon service
 */
export async function uninstallDaemon(): Promise<{ success: boolean; message: string }> {
  if (isMacOS) {
    const plistPath = getLaunchAgentPath();

    if (existsSync(plistPath)) {
      // First unload if running
      try {
        const { execSync } = await import("child_process");
        execSync(`launchctl bootout gui/${process.getuid?.() ?? ""} ${LAUNCH_AGENT_NAME}`, {
          stdio: "ignore",
        });
      } catch {
        // Ignore errors if not loaded
      }

      unlinkSync(plistPath);
    }

    return {
      success: true,
      message: "LaunchAgent uninstalled",
    };
  }

  if (isLinux) {
    const servicePath = getSystemdServicePath();

    if (existsSync(servicePath)) {
      unlinkSync(servicePath);
    }

    return {
      success: true,
      message: "Systemd service uninstalled",
    };
  }

  return {
    success: false,
    message: "Unsupported platform",
  };
}

/**
 * Start daemon service
 */
export async function startDaemon(): Promise<{ success: boolean; message: string }> {
  if (!isDaemonInstalled()) {
    await installDaemon();
  }

  if (isMacOS) {
    const { execSync } = await import("child_process");
    const plistPath = getLaunchAgentPath();
    const uid = process.getuid?.() ?? "";

    // First try to bootout in case service is in weird state
    try {
      execSync(`launchctl bootout gui/${uid} ${LAUNCH_AGENT_NAME}`, {
        stdio: "ignore",
      });
    } catch {
      // Ignore if not loaded
    }

    // Also try remove for cached entries with SIGKILL status
    try {
      execSync(`launchctl remove ${LAUNCH_AGENT_NAME}`, {
        stdio: "ignore",
      });
    } catch {
      // Ignore if not present
    }

    // Wait a moment for cleanup
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      execSync(`launchctl bootstrap gui/${uid} ${plistPath}`, {
        stdio: "pipe",
      });

      return {
        success: true,
        message: "Daemon started. Logs: /tmp/cc-channel.log",
      };
    } catch (err) {
      return {
        success: false,
        message: `Failed to start: ${err}`,
      };
    }
  }

  if (isLinux) {
    const { execSync } = await import("child_process");

    try {
      execSync("systemctl --user daemon-reload", { stdio: "pipe" });
      execSync(`systemctl --user start ${SYSTEMD_SERVICE_NAME}`, { stdio: "pipe" });
      execSync(`systemctl --user enable ${SYSTEMD_SERVICE_NAME}`, { stdio: "pipe" });

      return {
        success: true,
        message: "Daemon started. Logs: /tmp/cc-channel.log",
      };
    } catch (err) {
      return {
        success: false,
        message: `Failed to start: ${err}`,
      };
    }
  }

  return {
    success: false,
    message: "Unsupported platform",
  };
}

/**
 * Stop daemon service
 */
export async function stopDaemon(): Promise<{ success: boolean; message: string }> {
  if (isMacOS) {
    const { execSync } = await import("child_process");

    // Step 1: Kill daemon processes first (while launchd is still managing)
    try {
      execSync("pkill -9 -f 'node.*cc-channel.*daemon.js'", { stdio: "ignore" });
    } catch {
      // Ignore if no process to kill
    }

    // Step 2: Wait for processes to terminate
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Step 3: Bootout from launchd to stop managing
    try {
      execSync(`launchctl bootout gui/${process.getuid?.() ?? ""} ${LAUNCH_AGENT_NAME}`, {
        stdio: "ignore",
      });
    } catch {
      // Ignore if not loaded
    }

    // Step 3.5: Also remove cached entry (for SIGKILL'd services)
    try {
      execSync(`launchctl remove ${LAUNCH_AGENT_NAME}`, { stdio: "ignore" });
    } catch {
      // Ignore if not present
    }

    // Step 4: Verify process is stopped
    await new Promise((resolve) => setTimeout(resolve, 500));

    let stillRunning = false;
    try {
      const result = execSync("pgrep -f 'node.*cc-channel.*daemon.js'", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe"],
      });
      stillRunning = result.toString().trim().length > 0;
    } catch {
      // pgrep returns non-zero when no match
      stillRunning = false;
    }

    if (stillRunning) {
    // Force kill any remaining
    try {
      execSync("pkill -9 -f 'node.*cc-channel.*daemon.js'", { stdio: "ignore" });
    } catch {
      // Ignore
    }
    }

    return {
      success: true,
      message: "Daemon stopped",
    };
  }

  if (isLinux) {
    const { execSync } = await import("child_process");

    try {
      execSync(`systemctl --user stop ${SYSTEMD_SERVICE_NAME}`, { stdio: "pipe" });
    } catch {
      // Ignore errors
    }

    return {
      success: true,
      message: "Daemon stopped",
    };
  }

  return {
    success: false,
    message: "Unsupported platform",
  };
}

/**
 * Get daemon status
 */
export async function getDaemonStatus(): Promise<DaemonStatus> {
  const platformName = isMacOS ? "macos" : isLinux ? "linux" : "unsupported";

  if (!isMacOS && !isLinux) {
    return {
      installed: false,
      running: false,
      platform: platformName,
    };
  }

  const installed = isDaemonInstalled();

  let running = false;

  if (isMacOS && installed) {
    try {
      const { execSync } = await import("child_process");
      const result = execSync(`launchctl print gui/${process.getuid?.() ?? ""}/${LAUNCH_AGENT_NAME}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      running = result.includes("state = running");
    } catch {
      running = false;
    }
  }

  if (isLinux && installed) {
    try {
      const { execSync } = await import("child_process");
      const result = execSync(`systemctl --user is-active ${SYSTEMD_SERVICE_NAME}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      running = result.trim() === "active";
    } catch {
      running = false;
    }
  }

  return {
    installed,
    running,
    platform: platformName,
  };
}
