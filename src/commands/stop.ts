import chalk from "chalk";
import { stopDaemon } from "../daemon/service.js";

export async function stopCommand(): Promise<void> {
  const result = await stopDaemon();

  if (result.success) {
    console.log(chalk.green(`✓ ${result.message}`));
  } else {
    console.log(chalk.red(result.message));
  }
}
