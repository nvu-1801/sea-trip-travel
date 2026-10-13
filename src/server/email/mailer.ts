import "server-only";

/**
 * Mail transport.
 *
 * The app depends on this interface only — never on nodemailer, never on a
 * provider SDK. Swapping SMTP for a provider HTTP API (or vice versa) is a new
 * class here plus one env var, with no changes anywhere in the UI or in the
 * lead service.
 *
 * `server-only` guarantees the module (and therefore the transport credentials)
 * can never be pulled into a Client Component bundle.
 */

export type MailMessage = {
  to: readonly string[];
  from: string;
  /** Only ever set from a validated customer email. */
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
};

export type MailResult =
  | { ok: true; transport: string; providerMessageId: string | null }
  | { ok: false; transport: string; reason: "NOT_CONFIGURED" | "DELIVERY_FAILED"; message: string };

export interface Mailer {
  readonly transport: string;
  isConfigured(): boolean;
  send(message: MailMessage): Promise<MailResult>;
}

/**
 * Development transport: writes a redacted summary to the server log and
 * reports success without sending anything. Deliberately does NOT log the
 * message body, which contains customer PII.
 *
 * It is deliberately NOT configured in production: if `MAIL_TRANSPORT` is left
 * as `log` on a production deployment, `POST /api/leads` returns
 * `MAIL_NOT_CONFIGURED` instead of reporting a success that never happened.
 */
class LogMailer implements Mailer {
  readonly transport = "log";

  isConfigured(): boolean {
    return process.env.NODE_ENV !== "production";
  }

  async send(message: MailMessage): Promise<MailResult> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        transport: this.transport,
        reason: "NOT_CONFIGURED",
        message: "Chưa cấu hình dịch vụ gửi email trên môi trường production",
      };
    }
    console.warn(
      `[mail:log] DEV ONLY — not actually sent. subject="${message.subject}" recipients=${message.to.length} from=${message.from} hasReplyTo=${Boolean(message.replyTo)}`,
    );
    return { ok: true, transport: this.transport, providerMessageId: null };
  }
}

class SmtpMailer implements Mailer {
  readonly transport = "smtp";
  private transporter: import("nodemailer").Transporter | null = null;

  constructor(
    private readonly config: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
    },
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.host && this.config.user && this.config.password);
  }

  private async getTransporter() {
    if (this.transporter) return this.transporter;
    const { createTransport } = await import("nodemailer");
    this.transporter = createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: { user: this.config.user, pass: this.config.password },
      // Fail fast rather than holding the request open.
      connectionTimeout: 10_000,
      greetingTimeout: 8_000,
      socketTimeout: 15_000,
    });
    return this.transporter;
  }

  async send(message: MailMessage): Promise<MailResult> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        transport: this.transport,
        reason: "NOT_CONFIGURED",
        message: "SMTP chưa được cấu hình",
      };
    }

    try {
      const transporter = await this.getTransporter();
      const info = await transporter.sendMail({
        from: message.from,
        to: [...message.to],
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      return {
        ok: true,
        transport: this.transport,
        providerMessageId: info.messageId ?? null,
      };
    } catch (error) {
      // Never surface the raw provider error to the client; log the reason only.
      const message_ = error instanceof Error ? error.message : "unknown SMTP error";
      console.error(`[mail:smtp] delivery failed: ${message_}`);
      return {
        ok: false,
        transport: this.transport,
        reason: "DELIVERY_FAILED",
        message: "Không gửi được email qua SMTP",
      };
    }
  }
}

let cached: Mailer | null = null;

export function getMailer(): Mailer {
  if (cached) return cached;

  const transport = (process.env.MAIL_TRANSPORT ?? "log").toLowerCase();

  if (transport === "smtp") {
    cached = new SmtpMailer({
      host: process.env.SMTP_HOST ?? "",
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: (process.env.SMTP_SECURE ?? "false").toLowerCase() === "true",
      user: process.env.SMTP_USER ?? "",
      password: process.env.SMTP_PASSWORD ?? "",
    });
    return cached;
  }

  cached = new LogMailer();
  return cached;
}
