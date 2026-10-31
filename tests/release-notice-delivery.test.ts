import assert from "node:assert/strict";
import net from "node:net";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * Gửi thật qua SMTP, không mock.
 *
 * Mục tiêu của file này không phải kiểm tra nội dung chữ (đã có ở
 * release-notice.test.ts) mà là chứng minh:
 *  - script CLI thật sự gửi đúng một thư tới địa chỉ cấu hình;
 *  - chạy lại cùng SHA không gửi thêm;
 *  - thiếu cấu hình thì không gửi và không làm hỏng deploy.
 */

type Captured = { rcptTo: string[]; data: string };

function createSink() {
  const received: Captured[] = [];
  const server = net.createServer((socket) => {
    let buffer = "";
    let inData = false;
    let dataLines: string[] = [];
    let current: Captured = { rcptTo: [], data: "" };
    const reply = (line: string) => socket.write(`${line}\r\n`);
    reply("220 sink.localhost ESMTP ready");

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let newline = buffer.indexOf("\r\n");
      while (newline !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 2);
        if (inData) {
          if (line === ".") {
            inData = false;
            current.data = dataLines.join("\r\n");
            received.push(current);
            current = { rcptTo: [], data: "" };
            dataLines = [];
            reply("250 2.0.0 Ok: queued as SINK1");
          } else {
            dataLines.push(line.startsWith("..") ? line.slice(1) : line);
          }
        } else {
          const upper = line.toUpperCase();
          if (upper.startsWith("EHLO")) {
            reply("250-sink.localhost");
            reply("250-AUTH PLAIN");
            reply("250-8BITMIME");
            reply("250 OK");
          } else if (upper.startsWith("AUTH")) {
            reply("235 2.7.0 Authentication successful");
          } else if (upper.startsWith("MAIL FROM")) {
            reply("250 2.1.0 Ok");
          } else if (upper.startsWith("RCPT TO")) {
            current.rcptTo.push(line);
            reply("250 2.1.5 Ok");
          } else if (upper === "DATA") {
            inData = true;
            reply("354 End data with <CR><LF>.<CR><LF>");
          } else if (upper === "QUIT") {
            reply("221 2.0.0 Bye");
            socket.end();
          } else {
            reply("250 2.0.0 Ok");
          }
        }
        newline = buffer.indexOf("\r\n");
      }
    });
    socket.on("error", () => {});
  });

  return {
    received,
    listen(): Promise<number> {
      return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => resolve((server.address() as net.AddressInfo).port));
      });
    },
    close(): Promise<void> {
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

const HEAD = "a".repeat(40);
const PREVIOUS = "b".repeat(40);

function manifest(notes: string[] = ["Bộ lọc tìm tour nhanh hơn trên điện thoại"]) {
  return JSON.stringify({
    version: 2,
    head: HEAD,
    order: [HEAD, PREVIOUS],
    notes: notes.length > 0 ? { [HEAD]: notes } : {},
  });
}

function tempStateFile(): string {
  return path.join(mkdtempSync(path.join(os.tmpdir(), "seatrip-notice-")), "state.json");
}

function runNotifier(env: Record<string, string>, stateFile: string): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.resolve("scripts/release-notice.mjs"), HEAD], {
      env: {
        ...process.env,
        RELEASE_NOTICE_STATE_FILE: stateFile,
        RELEASE_NOTICE_PREVIOUS_SHA: PREVIOUS,
        RELEASE_NOTES_JSON: manifest(),
        ...env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("close", (code) => resolve({ code, output }));
  });
}

const baseEnv = (port: number): Record<string, string> => ({
  MAIL_TRANSPORT: "smtp",
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: String(port),
  SMTP_SECURE: "false",
  SMTP_USER: "sink-user",
  SMTP_PASSWORD: "sink-pass",
  MAIL_FROM_EMAIL: "no-reply@example.com",
  MAIL_FROM_NAME: "SEA TRIP TRAVEL",
  RELEASE_NOTICE_RECIPIENTS: "owner@example.com",
  SALES_RECIPIENTS: "",
  NEXT_PUBLIC_SITE_URL: "https://sea-trip.example",
});

describe("release notice — gửi thật và chống trùng", () => {
  it("ưu tiên gửi đến sale khi cũng có địa chỉ chủ site", async () => {
    const sink = createSink();
    const port = await sink.listen();
    try {
      const result = await runNotifier({ ...baseEnv(port), SALES_RECIPIENTS: "sales@example.com" }, tempStateFile());
      assert.equal(result.code, 0, result.output);
      assert.equal(sink.received.length, 1);
      assert.deepEqual(sink.received[0].rcptTo, ["RCPT TO:<sales@example.com>"]);
    } finally {
      await sink.close();
    }
  });
  it("gửi đúng một thư cho mỗi SHA", async () => {
    const sink = createSink();
    const port = await sink.listen();
    const stateFile = tempStateFile();
    try {
      const first = await runNotifier(baseEnv(port), stateFile);
      assert.equal(first.code, 0, first.output);
      assert.equal(sink.received.length, 1);
      assert.deepEqual(sink.received[0].rcptTo, ["RCPT TO:<owner@example.com>"]);
      assert.match(sink.received[0].data, /To: owner@example\.com/i);

      const second = await runNotifier(baseEnv(port), stateFile);
      assert.equal(second.code, 0, second.output);
      assert.equal(sink.received.length, 1, "chạy lại cùng SHA không được gửi thư thứ hai");
      assert.match(second.output, /đã được thông báo trước đó/);

      const state = JSON.parse(readFileSync(stateFile, "utf8"));
      assert.equal(state.notified.length, 1);
      assert.equal(state.notified[0].sha, HEAD);
      assert.equal(state.notified[0].status, "sent");
    } finally {
      await sink.close();
    }
  });

  it("không gửi khi MAIL_TRANSPORT chưa phải smtp", async () => {
    const sink = createSink();
    const port = await sink.listen();
    try {
      const result = await runNotifier(
        { ...baseEnv(port), MAIL_TRANSPORT: "log" },
        tempStateFile(),
      );
      assert.equal(result.code, 0);
      assert.equal(sink.received.length, 0);
      assert.match(result.output, /MAIL_TRANSPORT/);
    } finally {
      await sink.close();
    }
  });

  it("không gửi khi thiếu người nhận, và ghi rõ biến cần thêm", async () => {
    const sink = createSink();
    const port = await sink.listen();
    try {
      const env = baseEnv(port);
      delete env.RELEASE_NOTICE_RECIPIENTS;
      const result = await runNotifier(env, tempStateFile());
      assert.equal(result.code, 0);
      assert.equal(sink.received.length, 0);
      assert.match(result.output, /RELEASE_NOTICE_RECIPIENTS/);
    } finally {
      await sink.close();
    }
  });

  it("không gửi nội dung kỹ thuật dù commit có ghi chú nội bộ", async () => {
    const sink = createSink();
    const port = await sink.listen();
    try {
      const result = await runNotifier(
        {
          ...baseEnv(port),
          RELEASE_NOTES_JSON: manifest(["Fix bug trong src/app/page.tsx"]),
        },
        tempStateFile(),
      );
      assert.equal(result.code, 0, result.output);
      assert.equal(sink.received.length, 1);
      assert.match(result.output, /1 ghi chú bị bỏ/);
      assert.ok(!sink.received[0].data.includes("page.tsx"));
    } finally {
      await sink.close();
    }
  });
});
