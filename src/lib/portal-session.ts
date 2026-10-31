import type { PortalUser } from "./portal.functions";

const KEY = "portal.session.v1";

export function saveSession(user: PortalUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(user));
}

export function readSession(): PortalUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PortalUser) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export type ReleaseDownload = {
  id: string;
  os: "windows" | "macos" | "linux" | "android";
  name: string;
  architecture: "x64" | "x86" | "arm64";
  ext: string;
  compat: string;
  asset: string;
  sha: string;
};

export type ReleaseManifest = {
  version: string;
  tag: string;
  released: string;
  downloads: ReleaseDownload[];
};

export const CHANGELOG = [
  {
    version: "v2.4.0",
    date: "12 Sep 2026",
    items: [
      "Rebuilt render pipeline — 40% faster cold start on Windows.",
      "Native Apple Silicon build with hardened runtime notarization.",
      "New offline workspace sync with conflict resolution.",
    ],
  },
  {
    version: "v2.3.2",
    date: "28 Aug 2026",
    items: [
      "Fixed a rare crash when restoring multi-monitor layouts.",
      "Reduced idle memory footprint by 120 MB.",
    ],
  },
  {
    version: "v2.3.0",
    date: "05 Aug 2026",
    items: [
      "Introduced command palette with fuzzy project search.",
      "Signed Linux AppImage with delta auto-updates.",
      "Accessibility pass on all modal dialogs.",
    ],
  },
];
