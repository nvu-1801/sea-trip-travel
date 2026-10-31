import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { encrypt, decrypt } from "@/server/cms/leads";
test("encrypted leads round-trip and reject truncated GCM authentication tags", () => {
  const previous = process.env.LEAD_ENCRYPTION_KEY;
  process.env.LEAD_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  try {
    const payload = { message: "synthetic encryption regression fixture" };
    const encoded = encrypt(payload),
      [iv, tag, body] = encoded.split(":");
    assert.deepEqual(decrypt(encoded), payload);
    assert.throws(() => decrypt([iv, tag.slice(0, 16), body].join(":")));
  } finally {
    if (previous === undefined) delete process.env.LEAD_ENCRYPTION_KEY;
    else process.env.LEAD_ENCRYPTION_KEY = previous;
  }
});
