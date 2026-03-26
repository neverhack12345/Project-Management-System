import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ENABLE_AUTO_COMMIT, ROOT } from "./constants.js";

const execFileAsync = promisify(execFile);

export async function maybeAutoCommit({ slug, message, files }) {
  if (!ENABLE_AUTO_COMMIT) {
    return { enabled: false };
  }

  try {
    const stagedFiles = files.map((file) => file.replaceAll("\\", "/"));
    await execFileAsync("git", ["add", "--", ...stagedFiles], { cwd: ROOT });
    await execFileAsync("git", ["commit", "-m", message], { cwd: ROOT });
    return { enabled: true, committed: true };
  } catch (error) {
    return {
      enabled: true,
      committed: false,
      warning: `Auto-commit failed for ${slug}: ${error.message}`
    };
  }
}
