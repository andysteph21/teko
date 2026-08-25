// Pictos de navigation de la console (traits 2.2, 24×24) — maquette A-02.

import type { JSX } from "react";

export type IconName =
  | "dashboard"
  | "kyc"
  | "map"
  | "finance"
  | "users"
  | "settings"
  | "more"
  | "logout";

const PATHS: Record<IconName, JSX.Element> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="10" width="8" height="11" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
    </>
  ),
  kyc: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="10" cy="10" r="2.2" />
      <path d="M6 18c1-2.4 2.5-3.5 4-3.5s3 1.1 4 3.5M15 8h3" />
    </>
  ),
  map: (
    <>
      <path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  finance: (
    <>
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19c1.2-2.8 3.3-4.2 5.5-4.2s4.3 1.4 5.5 4.2M16 8h5M16 12h5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
      <path d="M15 8l4 4-4 4M19 12H9" />
    </>
  ),
};

export function NavIcon({ name, size = 15 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
