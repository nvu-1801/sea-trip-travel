import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("release history fixtures cannot mutate a repository inherited from a Git hook", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "seatrip-hook-context-"));
  const env = {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))),
    NODE_ENV: process.env.NODE_ENV,
    GIT_AUTHOR_NAME: "Hook fixture",
    GIT_AUTHOR_EMAIL: "fixture@example.com",
    GIT_COMMITTER_NAME: "Hook fixture",
    GIT_COMMITTER_EMAIL: "fixture@example.com",
  };
  const git = (...args) => execFileSync("git", args, {
    cwd: directory, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  try {
    git("init");
    git("commit", "--allow-empty", "-m", "Surrounding repository sentinel");
    const head = git("rev-parse", "HEAD");
    const branch = git("symbolic-ref", "HEAD");
    const root = fileURLToPath(new URL("../", import.meta.url));
    const result = spawnSync(process.execPath, ["--import", "tsx", "--test", "tests/release-notice.test.ts"], {
      cwd: root,
      env: {
        ...env,
        GIT_DIR: path.join(directory, ".git"),
        GIT_COMMON_DIR: path.join(directory, ".git"),
        GIT_WORK_TREE: directory,
        GIT_PREFIX: "inherited-hook-context/",
      },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(git("rev-parse", "HEAD"), head, "fixture changed the surrounding HEAD");
    assert.equal(git("symbolic-ref", "HEAD"), branch, "fixture changed the surrounding branch");
    assert.equal(git("config", "--get", "core.bare"), "false");
    assert.equal(git("status", "--porcelain"), "");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
