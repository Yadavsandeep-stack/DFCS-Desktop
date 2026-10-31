import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ChevronDown, Download, LogOut } from "lucide-react";

import { BrandMark } from "@/components/portal/brand";
import { GlowButton } from "@/components/portal/controls";
import {
  CursorSpotlight,
  GlassCard,
  GridBackdrop,
  TiltCard,
  riseIn,
  stagger,
} from "@/components/portal/effects";
import { recordDownload, verifySession, type PortalUser } from "@/lib/portal.functions";
import {
  CHANGELOG,
  clearSession,
  readSession,
  saveSession,
  type ReleaseDownload,
  type ReleaseManifest,
} from "@/lib/portal-session";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Download Portal — DFCS Desktop" },
      {
        name: "description",
        content:
          "Private download portal for approved users: signed Windows, macOS and Linux builds with checksums and changelog.",
      },
      { property: "og:title", content: "Download Portal — DFCS Desktop" },
      {
        property: "og:description",
        content: "Approved-user download portal with verified builds for every platform.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const check = useServerFn(verifySession);
  const track = useServerFn(recordDownload);

  const [user, setUser] = useState<PortalUser | null>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [release, setRelease] = useState<ReleaseManifest | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [openLog, setOpenLog] = useState<string | null>(CHANGELOG[0]?.version ?? null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      navigate({ to: "/" });
      return;
    }
    void check({ data: { email: session.email } }).then(async (result) => {
      if (!result.valid) {
        clearSession();
        navigate({ to: "/" });
        return;
      }
      saveSession(result.user);
      setUser(result.user);
      const workerUrl = import.meta.env.VITE_DOWNLOAD_WORKER_URL as string | undefined;
      if (!workerUrl) {
        setReleaseError("Downloads are not configured yet. Please contact the administrator.");
        setReady(true);
        return;
      }
      try {
        const response = await fetch(new URL("/manifest", workerUrl), { cache: "no-store" });
        if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
        setRelease((await response.json()) as ReleaseManifest);
      } catch {
        setReleaseError("The latest release could not be loaded. Please try again later.");
      }
      setReady(true);
    });
  }, [check, navigate]);

  async function startDownload(download: ReleaseDownload) {
    const workerUrl = import.meta.env.VITE_DOWNLOAD_WORKER_URL as string | undefined;
    if (!user || progress[download.id]) return;
    if (!workerUrl) {
      setDownloadError("Downloads are not configured yet. Please contact the administrator.");
      return;
    }

    setDownloadError(null);
    setProgress((prev) => ({ ...prev, [download.id]: 12 }));
    try {
      const result = await track({ data: { email: user.email, os: download.os } });
      setUser({ ...user, downloadCount: result.downloadCount });
      const url = new URL("/download", workerUrl);
      url.searchParams.set("asset", download.asset);
      window.location.assign(url.toString());
    } catch {
      setDownloadError("The download could not be started. Please try again.");
      setProgress((prev) => ({ ...prev, [download.id]: 0 }));
    }
  }

  if (!ready || !user) {
    return (
      <main className="relative flex min-h-screen items-center justify-center">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Verifying access…
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <GridBackdrop />
      <CursorSpotlight />

      <header className="relative z-10 border-b border-border/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <BrandMark className="size-7 rounded-lg" /> DFCS Portal
          </span>
          <Link to="/" className="text-xs text-muted-foreground underline hover:text-foreground">
            Access home
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-success/35 bg-success/10 px-3 py-1 text-[11px] font-medium text-success">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full" /> System Operational
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:block">
              Welcome, <span className="text-foreground">{user.fullName}</span> ·{" "}
              {user.downloadCount} downloads
            </span>
            <GlowButton
              variant="outline"
              className="h-9 px-3 text-xs"
              onClick={() => {
                clearSession();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </GlowButton>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl space-y-10 px-6 py-12">
        <motion.section variants={stagger} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={riseIn}>
            <span className="font-mono text-[11px] tracking-widest text-accent uppercase">
              {release?.tag ?? "LATEST RELEASE"}
            </span>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              DFCS Desktop {release?.version ?? "Latest Release"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Downloadable assets from the latest GitHub release. Source code, signatures, and
              archive files are excluded.
            </p>
          </motion.div>

          {releaseError || downloadError ? (
            <p role="alert" className="text-sm text-destructive">
              {releaseError ?? downloadError}
            </p>
          ) : null}

          <motion.div variants={riseIn} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {release?.downloads.map((download) => {
              const value = progress[download.id] ?? 0;
              return (
                <TiltCard key={download.id} className="group p-6">
                  <div className="flex items-center justify-between">
                    <BrandMark
                      className="size-12 rounded-xl shadow-glow"
                      alt={`${download.name} DFCS icon`}
                    />
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {download.ext}
                    </span>
                  </div>
                  <h2 className="mt-4 break-all font-mono text-sm font-semibold">
                    {download.name}
                  </h2>
                  <p className="mt-1 h-9 max-w-[22ch] text-xs text-muted-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    {download.compat}
                  </p>

                  <GlowButton
                    className="mt-4 w-full"
                    loading={value > 0 && value < 100}
                    onClick={() => startDownload(download)}
                  >
                    <Download className="h-4 w-4" /> Download
                  </GlowButton>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary/60">
                    <motion.div
                      className="h-full bg-gradient-primary"
                      animate={{ width: `${value}%` }}
                      transition={{ ease: "easeOut", duration: 0.3 }}
                    />
                  </div>
                  <p className="mt-3 truncate font-mono text-[10px] text-muted-foreground">
                    SHA-256 {download.sha}
                  </p>
                </TiltCard>
              );
            })}
          </motion.div>
        </motion.section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Release changelog</h2>
          {CHANGELOG.map((entry) => {
            const open = openLog === entry.version;
            return (
              <GlassCard key={entry.version} glow={false} className="overflow-hidden">
                <button
                  onClick={() => setOpenLog(open ? null : entry.version)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <span className="flex items-baseline gap-3">
                    <span className="font-mono text-sm text-primary">{entry.version}</span>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28 }}
                    >
                      <ul className="space-y-2 px-5 pb-5 text-sm text-muted-foreground">
                        {entry.items.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </GlassCard>
            );
          })}
        </section>
      </div>
    </main>
  );
}
