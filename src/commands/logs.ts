import { spawn } from "child_process";
import chalk from "chalk";

export async function logsCommand(options: { follow: boolean }): Promise<void> {
  const logFile = "/tmp/cc-channel.log";
  const errorLogFile = "/tmp/cc-channel.error.log";

  if (options.follow) {
    console.log(chalk.cyan("Following logs (Ctrl+C to stop)...\n"));

    const tail = spawn("tail", ["-f", logFile, errorLogFile], {
      stdio: "inherit",
    });

    process.on("SIGINT", () => {
      tail.kill();
      process.exit(0);
    });
  } else {
    // Show last 100 lines
    console.log(chalk.cyan("Recent logs:\n"));

    const tail = spawn("tail", ["-n", "100", logFile], {
      stdio: "inherit",
    });

    tail.on("close", () => {
      console.log();
      console.log(chalk.dim(`Log file: ${logFile}`));
      console.log(chalk.dim(`Error log: ${errorLogFile}`));
    });
  }
}
