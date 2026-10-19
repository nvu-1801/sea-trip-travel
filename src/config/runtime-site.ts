import "server-only";
import { siteConfig as defaults } from "./site";
import { settings } from "@/server/cms/store";
export const siteConfig = new Proxy(defaults, {
  get(target, key: keyof typeof defaults) {
    const config = settings();
    if (key === "url")
      return (
        process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? target.url
      );
    if (key === "name") return config.name;
    if (key === "contact") return { ...target.contact, ...config.contact };
    return target[key];
  },
});
