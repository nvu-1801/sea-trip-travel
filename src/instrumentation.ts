export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.CMS_ENABLED !== "1")
    return;

  const { purgeExpiredTrash, seed } = await import("@/server/cms/store");
  seed();
  const sweep = () => {
    try {
      purgeExpiredTrash(Date.now(), true);
    } catch (error) {
      console.error("[cms] Không dọn được thùng rác khách sạn", error);
    }
  };
  sweep();
  setInterval(sweep, 60 * 60 * 1000).unref();
}
