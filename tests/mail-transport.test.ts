import assert from "node:assert/strict";
import net from "node:net";
import { after, before, beforeEach, describe, it } from "node:test";
import { submitLead } from "@/server/leads/service";

/**
 * Real SMTP delivery.
 *
 * The API returning 200 only proves the request was accepted by our own code.
 * These tests stand up an actual SMTP server on a loopback port, point the
 * application at it, and then inspect the SMTP conversation that arrived —
 * envelope, headers and body. That proves the transport really opens a
 * connection, authenticates, sends, and that a provider-side failure surfaces as
 * an error instead of a fake success.
 *
 * What this still does NOT prove: that Gmail/Outlook accept and inbox the
 * message. That depends on domain reputation and SPF/DKIM/DMARC, which can only
 * be verified against the real provider — see docs/CONTENT-TODO.md A5.
 */

type CapturedMessage = {
  mailFrom: string | null;
  rcptTo: string[];
  data: string;
};

/**
 * Minimal SMTP sink: just enough of RFC 5321 for nodemailer to complete a send.
 * Only PLAIN auth is advertised so the exchange stays single-step.
 */
function createSmtpSink(options: { authFails?: boolean } = {}) {
  const received: CapturedMessage[] = [];

  const server = net.createServer((socket) => {
    let buffer = "";
    let inData = false;
    let dataLines: string[] = [];
    let current: CapturedMessage = { mailFrom: null, rcptTo: [], data: "" };

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
            current = { mailFrom: null, rcptTo: [], data: "" };
            dataLines = [];
            reply("250 2.0.0 Ok: queued as SINK1");
          } else {
            // Undo dot-stuffing (a leading ".." means a literal ".").
            dataLines.push(line.startsWith("..") ? line.slice(1) : line);
          }
        } else {
          const upper = line.toUpperCase();
          if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
            reply("250-sink.localhost");
            reply("250-AUTH PLAIN");
            reply("250-8BITMIME");
            reply("250 OK");
          } else if (upper.startsWith("AUTH")) {
            if (options.authFails) reply("535 5.7.8 Authentication credentials invalid");
            else reply("235 2.7.0 Authentication successful");
          } else if (upper.startsWith("MAIL FROM")) {
            current.mailFrom = line;
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
          } else if (upper === "RSET") {
            current = { mailFrom: null, rcptTo: [], data: "" };
            dataLines = [];
            reply("250 2.0.0 Ok");
          } else {
            reply("250 2.0.0 Ok");
          }
        }

        newline = buffer.indexOf("\r\n");
      }
    });

    socket.on("error", () => {
      /* client hang-ups are expected between tests */
    });
  });

  return {
    received,
    listen(): Promise<number> {
      return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => {
          resolve((server.address() as net.AddressInfo).port);
        });
      });
    },
    close(): Promise<void> {
      return new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}

/** A port nothing is listening on (bind, read, close). */
async function findClosedPort(): Promise<number> {
  const probe = net.createServer();
  const port = await new Promise<number>((resolve) => {
    probe.listen(0, "127.0.0.1", () => resolve((probe.address() as net.AddressInfo).port));
  });
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return port;
}

const ENV_KEYS = [
  "MAIL_TRANSPORT",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "MAIL_FROM_NAME",
  "MAIL_FROM_EMAIL",
  "SALES_RECIPIENTS",
  "NEXT_PUBLIC_SITE_URL",
  "NODE_ENV",
] as const;

let savedEnv: Record<string, string | undefined> = {};

/** `NODE_ENV` is declared read-only, so all env writes go through one cast. */
const mutableEnv = process.env as Record<string, string | undefined>;

before(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
});

after(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete mutableEnv[key];
    else mutableEnv[key] = savedEnv[key];
  }
});

beforeEach(() => {
  for (const key of ENV_KEYS) delete mutableEnv[key];
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
});

let agentCounter = 0;
const freshClient = () => ({ ip: "203.0.113.7", userAgent: `smtp-test-${(agentCounter += 1)}` });

/**
 * Next's type definitions declare `NODE_ENV` as a read-only literal, but these
 * tests genuinely need to flip it to exercise the production refusal paths.
 */
function setNodeEnv(value: string): void {
  mutableEnv.NODE_ENV = value;
}

const validLead = {
  fullName: "Nguyễn Văn A",
  phone: "0987 654 321",
  email: "khach@example.com",
  interest: "Quy Nhơn",
  tourSlug: "quy-nhon-phu-yen-3-ngay-2-dem",
  travelDate: "2026-12-01",
  partySize: "3",
  message: "Gia đình 4 người, muốn đi 3 ngày 2 đêm.",
  consent: true,
  sourcePage: "/tour/quy-nhon-phu-yen-3-ngay-2-dem",
};

describe("SMTP transport — delivery", () => {
  it("completes a real SMTP exchange and sends the expected message", async () => {
    const sink = createSmtpSink();
    const port = await sink.listen();

    process.env.MAIL_TRANSPORT = "smtp";
    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = String(port);
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_USER = "sink-user";
    process.env.SMTP_PASSWORD = "sink-pass";
    process.env.SALES_RECIPIENTS = "sales-a@example.com, sales-b@example.com";
    process.env.MAIL_FROM_NAME = "SEA TRIP TRAVEL";
    process.env.MAIL_FROM_EMAIL = "no-reply@example.com";

    try {
      const result = await submitLead({ ...freshClient(), body: validLead });

      assert.equal(result.status, 200, "valid lead over SMTP must be accepted");
      assert.equal(result.response.ok, true);

      // The transport really was exercised.
      assert.equal(sink.received.length, 1, "exactly one message must arrive");

      const message = sink.received[0];
      assert.match(message.mailFrom ?? "", /MAIL FROM/i);
      assert.ok(
        message.mailFrom?.includes("no-reply@example.com"),
        "envelope sender must be the verified from-domain address",
      );

      // Recipients come from SALES_RECIPIENTS, never from the request body.
      assert.equal(message.rcptTo.length, 2);
      assert.ok(message.rcptTo.join(" ").includes("sales-a@example.com"));
      assert.ok(message.rcptTo.join(" ").includes("sales-b@example.com"));

      const raw = message.data;

      // --- Envelope + headers -------------------------------------------------
      assert.match(raw, /^From: SEA TRIP TRAVEL <no-reply@example\.com>$/m);
      assert.match(raw, /^To: sales-a@example\.com, sales-b@example\.com$/m);
      assert.match(raw, /^Reply-To: khach@example\.com$/m, "Reply-To must be the customer");
      assert.match(raw, /^Message-ID: /m);
      assert.match(raw, /^MIME-Version: 1\.0$/m);
      assert.match(raw, /Content-Type: multipart\/alternative/i);
      assert.match(raw, /Content-Type: text\/plain; charset=utf-8/i);
      assert.match(raw, /Content-Type: text\/html; charset=utf-8/i);
      assert.match(raw, /Content-Transfer-Encoding: quoted-printable/i);

      // The subject carries Vietnamese, so a correct transport must RFC 2047
      // encode it. Assert the encoding is present, then decode to read it.
      const rawSubject = headerValue(raw, "Subject");
      assert.match(rawSubject, /=\?UTF-8\?[QB]\?/i, "non-ASCII subject must be encoded");

      const subject = decodeEncodedWords(rawSubject);
      assert.ok(
        subject.startsWith("[SEA TRIP] Yêu cầu tư vấn mới · #STT-"),
        `unexpected subject: ${subject}`,
      );
      assert.ok(subject.includes("Quy Nhơn – Phú Yên 3 ngày 2 đêm"), "tour title in subject");

      // Personal data must not leak into the subject line.
      assert.ok(!subject.includes("0987654321"));
      assert.ok(!subject.includes("khach@example.com"));
      assert.ok(!subject.includes("Nguyễn"));

      // The recipients came from SALES_RECIPIENTS, never from the request body.
      assert.ok(!raw.includes("attacker@example.com"));

      // --- Decoded bodies ----------------------------------------------------
      const decoded = decodeMime(raw);

      assert.ok(decoded.html.includes("Yêu cầu tư vấn mới"));
      assert.ok(decoded.text.includes("YÊU CẦU TƯ VẤN MỚI"));

      for (const part of [decoded.html, decoded.text]) {
        assert.ok(part.includes("Nguyễn Văn A"), "guest name must survive transport");
        assert.ok(part.includes("0987654321"), "normalised phone must survive transport");
        assert.ok(part.includes("Gia đình 4 người"), "message body must survive transport");
        assert.ok(part.includes("STT-"), "request code must be present");
        assert.ok(part.includes("(GMT+7)"), "timestamp must be in Vietnam time");
      }

      // The HTML part resolves the tour slug to a real title and link.
      assert.ok(decoded.html.includes("Quy Nhơn – Phú Yên 3 ngày 2 đêm"));
      assert.ok(decoded.html.includes("Mở trang tour"));
      assert.ok(decoded.html.includes("mailto:khach%40example.com"));
      assert.ok(decoded.html.includes("tel:0987654321"));
      // No raw customer markup may reach an HTML body.
      assert.ok(!decoded.html.includes("<script"));
    } finally {
      await sink.close();
    }
  });

  it("reports MAIL_DELIVERY_FAILED when the provider rejects authentication", async () => {
    const sink = createSmtpSink({ authFails: true });
    const port = await sink.listen();

    process.env.MAIL_TRANSPORT = "smtp";
    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = String(port);
    process.env.SMTP_USER = "sink-user";
    process.env.SMTP_PASSWORD = "wrong";
    process.env.SALES_RECIPIENTS = "sales@example.com";
    process.env.MAIL_FROM_EMAIL = "no-reply@example.com";

    try {
      const result = await submitLead({ ...freshClient(), body: validLead });

      assert.equal(result.status, 502);
      assert.equal(result.response.ok, false);
      if (result.response.ok) return;
      assert.equal(result.response.error.code, "MAIL_DELIVERY_FAILED");
      assert.match(result.response.error.message, /hotline/i);
      // Nothing may be reported as delivered.
      assert.equal(sink.received.length, 0);
    } finally {
      await sink.close();
    }
  });

  it("reports MAIL_DELIVERY_FAILED when the host is unreachable", async () => {
    const closedPort = await findClosedPort();

    process.env.MAIL_TRANSPORT = "smtp";
    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = String(closedPort);
    process.env.SMTP_USER = "sink-user";
    process.env.SMTP_PASSWORD = "sink-pass";
    process.env.SALES_RECIPIENTS = "sales@example.com";
    process.env.MAIL_FROM_EMAIL = "no-reply@example.com";

    const result = await submitLead({ ...freshClient(), body: validLead });

    assert.equal(result.status, 502);
    assert.equal(result.response.ok, false);
    if (result.response.ok) return;
    assert.equal(result.response.error.code, "MAIL_DELIVERY_FAILED");
  });
});

describe("transport configuration", () => {
  it("refuses to report success in production when SMTP is not configured", async () => {
    setNodeEnv("production");
    process.env.MAIL_TRANSPORT = "smtp";
    // SMTP_HOST / SMTP_USER / SMTP_PASSWORD deliberately unset.

    const result = await submitLead({ ...freshClient(), body: validLead });

    assert.equal(result.status, 503);
    assert.equal(result.response.ok, false);
    if (result.response.ok) return;
    assert.equal(result.response.error.code, "MAIL_NOT_CONFIGURED");
    assert.match(result.response.error.message, /hotline/i);
  });

  it("refuses to report success in production when MAIL_TRANSPORT is left as 'log'", async () => {
    setNodeEnv("production");
    process.env.MAIL_TRANSPORT = "log";

    const result = await submitLead({ ...freshClient(), body: validLead });

    assert.equal(result.status, 503);
    assert.equal(result.response.ok, false);
    if (result.response.ok) return;
    assert.equal(result.response.error.code, "MAIL_NOT_CONFIGURED");
  });

  it("succeeds with the log transport outside production (developer flow)", async () => {
    setNodeEnv("development");
    process.env.MAIL_TRANSPORT = "log";

    const result = await submitLead({ ...freshClient(), body: validLead });

    assert.equal(result.status, 200);
    assert.equal(result.response.ok, true);
  });
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Read a header value, unfolding continuation lines (RFC 5322 §2.2.3). */
function headerValue(raw: string, name: string): string {
  const lines = raw.split("\r\n");
  const start = lines.findIndex((line) =>
    line.toLowerCase().startsWith(`${name.toLowerCase()}:`),
  );
  if (start === -1) return "";

  let value = lines[start].slice(name.length + 1).trim();
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s/.test(lines[index])) value += lines[index].trim();
    else break;
  }
  return value;
}

/**
 * Decode RFC 2047 encoded-words: `=?UTF-8?Q?…?=` and `=?UTF-8?B?…?=`.
 * Whitespace between two adjacent encoded-words is not part of the value and is
 * removed before decoding, per the RFC.
 */
function decodeEncodedWords(value: string): string {
  return value
    .replace(/\?=\s+=\?/g, "?==?")
    .replace(/=\?[^?]+\?([BQ])\?([^?]*)\?=/gi, (_, encoding: string, payload: string) => {
      if (encoding.toUpperCase() === "B") {
        return Buffer.from(payload, "base64").toString("utf8");
      }
      const bytes = payload
        .replace(/_/g, " ")
        .replace(/=([0-9A-F]{2})/gi, (__, hex: string) => String.fromCharCode(parseInt(hex, 16)));
      return Buffer.from(bytes, "binary").toString("utf8");
    });
}

/** Decode the quoted-printable and base64 MIME parts so assertions can read them. */
function decodeMime(raw: string) {
  const parts = { html: "", text: "" };

  const boundaryMatch = /boundary="?([^"\r\n;]+)"?/i.exec(raw);
  const chunks = boundaryMatch ? raw.split(`--${boundaryMatch[1]}`) : [raw];

  for (const chunk of chunks) {
    const isHtml = /Content-Type: text\/html/i.test(chunk);
    const isText = /Content-Type: text\/plain/i.test(chunk);
    if (!isHtml && !isText) continue;

    const [headers, ...bodyParts] = chunk.split(/\r\n\r\n/);
    const body = bodyParts.join("\r\n\r\n");
    const decoded = /Content-Transfer-Encoding:\s*base64/i.test(headers ?? "")
      ? Buffer.from(body.replace(/\s/g, ""), "base64").toString("utf8")
      : decodeQuotedPrintable(body);

    if (isHtml) parts.html = decoded;
    else parts.text = decoded;
  }

  return parts;
}

function decodeQuotedPrintable(input: string): string {
  const bytes = input
    .replace(/=\r\n/g, "")
    .replace(/=([0-9A-F]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  return Buffer.from(bytes, "binary").toString("utf8");
}
