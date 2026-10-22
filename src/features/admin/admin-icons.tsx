import type { ReactNode, SVGProps } from "react";

/**
 * Small monochrome icon set for the Studio.
 *
 * The admin used emoji as iconography; mixed colour, platform-dependent glyphs
 * made the tools feel informal. These line icons share one 24×24 grid and take
 * the surrounding text colour, so navigation and section cards stay calm.
 */
export type AdminIconName =
  | "overview"
  | "home"
  | "tours"
  | "articles"
  | "categories"
  | "destinations"
  | "media"
  | "messages"
  | "settings"
  | "leads"
  | "account"
  | "image"
  | "search"
  | "map"
  | "star"
  | "shield"
  | "clock"
  | "compass"
  | "gem"
  | "news"
  | "help"
  | "edit"
  | "trash"
  | "eye"
  | "restore"
  | "plus"
  | "phone"
  | "mail"
  | "calendar"
  | "chart"
  | "funnel"
  | "trophy"
  | "new"
  | "globe"
  | "device"
  | "language"
  | "briefcase"
  | "money"
  | "refresh";

const PATHS: Record<AdminIconName, ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.4" />
      <rect x="14" y="3" width="7" height="7" rx="1.4" />
      <rect x="3" y="14" width="7" height="7" rx="1.4" />
      <rect x="14" y="14" width="7" height="7" rx="1.4" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  tours: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  articles: (
    <>
      <path d="M6 3.5h8l4 4V20H6Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  categories: (
    <>
      <rect x="3.5" y="4" width="17" height="4" rx="1.2" />
      <rect x="3.5" y="10" width="17" height="4" rx="1.2" />
      <rect x="3.5" y="16" width="17" height="4" rx="1.2" />
    </>
  ),
  destinations: (
    <>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
  media: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m5 17 4.5-4 3 2.5 2.5-2 4 3.5" />
    </>
  ),
  messages: (
    <>
      <path d="M4 5.5h16v11H9l-5 4Z" />
      <path d="M8 9h8M8 12.5h5" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  leads: (
    <>
      <path d="M4 5.5h16v13H4Z" />
      <path d="m4.5 6.5 7.5 6 7.5-6" />
    </>
  ),
  account: (
    <>
      <path d="M12 3.5 19 6v5.5c0 4.3-2.8 7.4-7 9-4.2-1.6-7-4.7-7-9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m5 17 4.5-4 3 2.5 2.5-2 4 3.5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 4.5 4.5" />
    </>
  ),
  map: (
    <>
      <path d="m3.5 6.5 5-2 7 2 5-2v13l-5 2-7-2-5 2Z" />
      <path d="M8.5 4.5v13M15.5 6.5v13" />
    </>
  ),
  star: (
    <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8Z" />
  ),
  shield: (
    <>
      <path d="M12 3.5 19 6v5.5c0 4.3-2.8 7.4-7 9-4.2-1.6-7-4.7-7-9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.5l3.5 2" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  gem: (
    <>
      <path d="M7 4h10l3 4.5L12 20 4 8.5Z" />
      <path d="M4 8.5h16M9.5 4 8 8.5 12 20l4-11.5L14.5 4" />
    </>
  ),
  news: (
    <>
      <path d="M4 5h13v14H6a2 2 0 0 1-2-2Z" />
      <path d="M17 8h3v9a2 2 0 0 1-2 2M7 8h6M7 12h6M7 16h4" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.3a2.5 2.5 0 1 1 3.7 2.6c-.8.5-1.3 1-1.3 2" />
      <path d="M12 17h.01" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17Z" />
      <path d="m14.5 6.5 3 3" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9 7V4.5h6V7M7 7l1 13h8l1-13" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  eye: (
    <>
      <path d="M3 12s3.2-6 9-6 9 6 9 6-3.2 6-9 6-9-6-9-6Z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  restore: (
    <>
      <path d="M4 10a8 8 0 1 1 2 5.3" />
      <path d="M4 5v5h5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  phone: (
    <path d="M6 4h3l1.5 4-2 1.5a12 12 0 0 0 6 6L16 13.5 20 15v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4 6.2 2 2 0 0 1 6 4Z" />
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V5M4 19h16" />
      <path d="m7 15 4-4 3 2.5L20 8" />
    </>
  ),
  funnel: (
    <>
      <path d="M4 5h16l-6 7v6l-4 2v-8Z" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0Z" />
      <path d="M8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3M12 13v4M9 20h6" />
    </>
  ),
  new: (
    <>
      <path d="M12 4v16M4 12h16" />
      <circle cx="12" cy="12" r="8.5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5S14.4 18.2 12 20.5C9.6 18.2 8.4 15.3 8.4 12S9.6 5.8 12 3.5Z" />
    </>
  ),
  device: (
    <>
      <rect x="7" y="3.5" width="10" height="17" rx="2" />
      <path d="M10.5 17.5h3" />
    </>
  ),
  language: (
    <>
      <path d="M4 5h9M8.5 3.5V5M11 5c-.5 3.5-2.5 6.2-5.8 7.8" />
      <path d="M6 8c1 2.7 2.7 4.5 5 5.5M13.5 20l3.5-9 3.5 9M14.8 17h4.4" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M9 7.5V5h6v2.5M3.5 12h17" />
    </>
  ),
  money: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5v5M17.5 9.5v5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-2 5.3" />
      <path d="M20 5v6h-6" />
    </>
  ),
};

export function AdminIcon({
  name,
  size = 18,
  ...props
}: { name: AdminIconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
