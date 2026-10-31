import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("security runner rejects missing or misspelled scan modes", () => {
  const runner = fileURLToPath(
    new URL("../scripts/code-security.mjs", import.meta.url),
  );
  for (const args of [[], ["secret"], ["toString"], ["secrets", "--fix"]]) {
    const result = spawnSync(process.execPath, [runner, ...args], {
      encoding: "utf8",
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Usage:/);
    assert.doesNotMatch(result.stderr, /docker:/i);
  }
});
