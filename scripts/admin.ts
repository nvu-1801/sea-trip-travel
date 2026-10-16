/**
 * Admin account CLI.
 *
 *   npm run admin -- create-admin --username <name>
 *   npm run admin -- reset-password --username <name>
 *   npm run admin -- list
 *
 * The password is read from the ADMIN_PASSWORD environment variable when set
 * (useful for provisioning scripts); otherwise it is typed at a hidden prompt
 * and confirmed. It is never echoed, never logged and never written to disk in
 * clear text.
 */
import { createInterface } from "node:readline";
import { createInterface as createPromptInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { closeDb } from "@/server/db/connection";
import { ensureDatabase } from "@/server/db/bootstrap";
import { countAdmins, createAdmin, getAdminByUsername, listAdmins, updateAdminPassword } from "@/server/repo/admin";
import { hashPassword, passwordProblem } from "@/server/auth/password";

function parseArgs(argv: string[]): { command: string; flags: Record<string, string | boolean> } {
  const [command = "help", ...rest] = argv;
  const flags: Record<string, string | boolean> = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = rest[index + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      index += 1;
    } else {
      flags[key] = true;
    }
  }
  return { command, flags };
}

/** Read a line of visible input (used for the username prompt). */
export function promptText(question: string): Promise<string> {
  const rl = createPromptInterface({ input, output });
  return rl.question(question).finally(() => rl.close());
}

/** Read a line with echoless input (falls back to visible when not a TTY). */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    if (!input.isTTY) {
      const rl = createInterface({ input, output });
      rl.once("line", (line) => {
        rl.close();
        resolve(line);
      });
      return;
    }

    output.write(question);
    let buffer = "";
    const wasRaw = input.isRaw;
    input.setRawMode(true);
    input.resume();

    const onData = (chunk: Buffer) => {
      const char = chunk.toString("utf8");
      if (char === "\r" || char === "\n") {
        input.removeListener("data", onData);
        input.setRawMode(wasRaw);
        output.write("\n");
        resolve(buffer);
        return;
      }
      if (char === "\u0003") {
        output.write("\n");
        process.exit(130);
      }
      if (char === "\u007f" || char === "\b") {
        buffer = buffer.slice(0, -1);
        return;
      }
      buffer += char;
    };
    input.on("data", onData);
  });
}

async function resolvePassword(prompt: string, confirm: boolean): Promise<string> {
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv) return fromEnv;

  const first = await promptHidden(prompt);
  const problem = passwordProblem(first);
  if (problem) {
    console.error(`Lỗi: ${problem}`);
    process.exit(1);
  }
  if (confirm) {
    const second = await promptHidden("Nhập lại mật khẩu: ");
    if (first !== second) {
      console.error("Lỗi: hai lần nhập mật khẩu không khớp.");
      process.exit(1);
    }
  }
  return first;
}

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv.slice(2));
  await ensureDatabase();

  if (command === "help" || flags.help) {
    console.log("Lệnh:");
    console.log("  create-admin --username <tên> [--force]   Tạo tài khoản quản trị");
    console.log("  reset-password --username <tên>           Đặt lại mật khẩu");
    console.log("  list                                      Liệt kê tài khoản");
    console.log("");
    console.log("Mật khẩu lấy từ biến ADMIN_PASSWORD nếu có, ngược lại sẽ được nhập ẩn.");
    return;
  }

  if (command === "list") {
    const admins = listAdmins();
    if (admins.length === 0) {
      console.log("Chưa có tài khoản quản trị nào. Dùng create-admin để tạo.");
      return;
    }
    for (const admin of admins) {
      console.log(`- ${admin.username} (tạo ${admin.createdAt}, đổi mật khẩu ${admin.passwordChangedAt})`);
    }
    return;
  }

  if (command === "create-admin") {
    const username = String(flags.username ?? "").trim().toLowerCase();
    if (!username) {
      console.error("Thiếu --username");
      process.exit(1);
    }
    if (getAdminByUsername(username)) {
      console.error(`Tài khoản "${username}" đã tồn tại.`);
      process.exit(1);
    }
    if (countAdmins() > 0 && !flags.force) {
      console.error(
        "Đã có tài khoản quản trị. Hệ thống chỉ dùng một tài khoản — dùng --force nếu thực sự cần thêm.",
      );
      process.exit(1);
    }
    const password = await resolvePassword("Mật khẩu mới: ", true);
    createAdmin({ username, passwordHash: hashPassword(password) });
    console.log(`Đã tạo tài khoản "${username}".`);
    return;
  }

  if (command === "reset-password") {
    const username = String(flags.username ?? "").trim().toLowerCase();
    if (!username) {
      console.error("Thiếu --username");
      process.exit(1);
    }
    const user = getAdminByUsername(username);
    if (!user) {
      console.error(`Không tìm thấy tài khoản "${username}".`);
      process.exit(1);
    }
    const password = await resolvePassword("Mật khẩu mới: ", true);
    updateAdminPassword(user.id, hashPassword(password));
    console.log(`Đã đặt lại mật khẩu cho "${username}". Tất cả phiên đăng nhập cũ sẽ bị thu hồi khi đăng nhập lại.`);
    return;
  }

  console.error(`Lệnh không hợp lệ: ${command}`);
  process.exit(1);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  })
  .finally(() => closeDb());
