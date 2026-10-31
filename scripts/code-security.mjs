import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const commands = {
  semgrep: [
    "semgrep/semgrep:1.183.0",
    "semgrep",
    "scan",
    "--config",
    "p/security-audit",
    "--config",
    "p/javascript",
    "--config",
    "p/typescript",
    "--metrics=off",
    "--disable-version-check",
    "--strict",
    "--error",
    "src",
    "scripts",
  ],
  secrets: [
    "zricethezav/gitleaks:v8.30.1",
    "dir",
    ".",
    "--config",
    ".gitleaks.toml",
    "--redact=100",
    "--no-banner",
  ],
  history: [
    "zricethezav/gitleaks:v8.30.1",
    "git",
    ".",
    "--config",
    ".gitleaks.toml",
    "--redact=100",
    "--no-banner",
  ],
};
const mode = process.argv[2];
if (process.argv.length !== 3 || !Object.hasOwn(commands, mode)) {
  console.error(
    "Usage: node scripts/code-security.mjs semgrep|secrets|history",
  );
  process.exit(2);
}
const command = commands[mode];
const gitMounts = [];
const gitDir = spawnSync("git", ["rev-parse", "--absolute-git-dir"], {
  cwd: root,
  encoding: "utf8",
});
if (gitDir.status === 0) {
  const common = spawnSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { cwd: root, encoding: "utf8" },
  );
  if (common.status !== 0) {
    console.error("Cannot resolve repository metadata");
    process.exit(2);
  }
  const commonPath = common.stdout.trim();
  const relative = path.relative(commonPath, gitDir.stdout.trim());
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    console.error("Unsupported Git metadata layout");
    process.exit(2);
  }
  gitMounts.push(
    "--mount",
    `type=bind,source=${commonPath},target=/repo-git,readonly`,
    "--env",
    "GIT_COMMON_DIR=/repo-git",
    "--env",
    `GIT_DIR=/repo-git${relative ? "/" + relative.split(path.sep).join("/") : ""}`,
    "--env",
    "GIT_WORK_TREE=/src",
  );
} else if (mode === "history") {
  console.error("History scanning requires a Git checkout");
  process.exit(2);
}
// Mount read-only: scanners must not modify source or apply automatic fixes.
const result = spawnSync(
  "docker",
  [
    "run",
    "--rm",
    "--mount",
    `type=bind,source=${root},target=/src,readonly`,
    ...gitMounts,
    "--env",
    "GIT_CONFIG_COUNT=1",
    "--env",
    "GIT_CONFIG_KEY_0=safe.directory",
    "--env",
    "GIT_CONFIG_VALUE_0=/src",
    "--workdir",
    "/src",
    ...command,
  ],
  { cwd: root, stdio: "inherit" },
);
if (result.error) console.error(`Cannot start Docker: ${result.error.message}`);
process.exit(result.status ?? 1);
