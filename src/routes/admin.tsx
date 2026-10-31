import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BadgeCheck,
  Clock,
  DownloadCloud,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { GlassAlert, GlowButton, NeonField, StatusBadge } from "@/components/portal/controls";
import { BrandMark } from "@/components/portal/brand";
import {
  Counter,
  CursorSpotlight,
  GlassCard,
  GridBackdrop,
  riseIn,
  stagger,
} from "@/components/portal/effects";
import { approveRequest, getAdminAnalytics, removeAccess } from "@/lib/portal.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Analytics — DFCS Desktop Portal" },
      {
        name: "description",
        content:
          "Private admin console for the DFCS Desktop portal: access request queue, approvals, download analytics and platform split.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin Analytics — DFCS Desktop Portal" },
      {
        property: "og:description",
        content: "Private admin console for access approvals and download analytics.",
      },
    ],
  }),
  component: AdminPage,
});

type Analytics = Awaited<ReturnType<typeof getAdminAnalytics>>;

const OS_LABEL = { windows: "Windows", macos: "macOS", linux: "Linux", android: "Android" } as const;
const OS_COLOR = { windows: "#6366f1", macos: "#22d3ee", linux: "#f59e0b", android: "#22c55e" } as const;

function AdminPage() {
  const load = useServerFn(getAdminAnalytics);
  const approve = useServerFn(approveRequest);
  const remove = useServerFn(removeAccess);

  const [keyInput, setKeyInput] = useState("");
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [data, setData] = useState<Analytics | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("admin_key");
    const stored = window.sessionStorage.getItem("dfcs.adminKey");
    const candidate = fromUrl ?? stored;
    if (candidate) setAdminKey(candidate);
  }, []);

  const refresh = useCallback(
    async (key: string) => {
      setBusy(true);
      setError(null);
      try {
        const result = await load({ data: { adminKey: key } });
        setData(result);
        window.sessionStorage.setItem("dfcs.adminKey", key);
      } catch {
        setData(null);
        setAdminKey(null);
        window.sessionStorage.removeItem("dfcs.adminKey");
        setError("Invalid admin key. Access denied.");
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  useEffect(() => {
    if (adminKey) void refresh(adminKey);
  }, [adminKey, refresh]);

  async function onApprove(id: string) {
    if (!adminKey) return;
    setApproving(id);
    setNotice(null);
    try {
      await approve({ data: { adminKey, id } });
      setNotice("Access approved — the user has been notified by email.");
      await refresh(adminKey);
    } catch {
      setError("Approval failed. Please retry.");
    } finally {
      setApproving(null);
    }
  }

  async function onRemove(id: string) {
    if (!adminKey) return;
    setApproving(id);
    setNotice(null);
    try {
      await remove({ data: { adminKey, id } });
      setNotice("Access removed — the user can no longer log in or download.");
      await refresh(adminKey);
    } catch {
      setError("Removal failed. Please retry.");
    } finally {
      setApproving(null);
    }
  }

  if (!adminKey || !data) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        <GridBackdrop />
        <CursorSpotlight />
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md"
        >
          <GlassCard className="p-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-secondary/40 px-3 py-1 font-mono text-[11px] tracking-widest text-accent uppercase">
              <BrandMark className="size-4 rounded" alt="DFCS" /> Restricted
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Admin console</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the admin key to unlock analytics and the access approval queue.
            </p>
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (keyInput.trim()) setAdminKey(keyInput.trim());
              }}
            >
              <NeonField
                label="Admin key"
                type="password"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                maxLength={200}
                error={error ?? undefined}
              />
              <GlowButton type="submit" loading={busy} className="w-full">
                Unlock console <KeyRound className="h-4 w-4" />
              </GlowButton>
            </form>
          </GlassCard>
        </motion.div>
      </main>
    );
  }

  const kpis = [
    { icon: Users, label: "Total registered", value: data.kpis.totalUsers },
    { icon: BadgeCheck, label: "Approved users", value: data.kpis.approvedUsers },
    { icon: Clock, label: "Pending requests", value: data.kpis.pendingRequests },
    { icon: Activity, label: "Active (24h)", value: data.kpis.activeDaily },
    { icon: DownloadCloud, label: "Total downloads", value: data.kpis.totalDownloads },
  ];

  const donut = data.osSplit.map((entry) => ({
    name: OS_LABEL[entry.os as keyof typeof OS_LABEL],
    value: entry.value,
    fill: OS_COLOR[entry.os as keyof typeof OS_COLOR],
  }));

  return (
    <main className="relative min-h-screen overflow-hidden">
      <GridBackdrop />
      <CursorSpotlight />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-14">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.header
            variants={riseIn}
            className="flex flex-wrap items-end justify-between gap-4"
          >
            <div>
              <span className="font-mono text-[11px] tracking-widest text-accent uppercase">
                Admin analytics
              </span>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Release control room</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Approvals, adoption and platform split across the last 14 days.
              </p>
            </div>
            <GlowButton
              variant="outline"
              loading={busy}
              onClick={() => void refresh(adminKey)}
              className="h-11"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </GlowButton>
            <Link
              to="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Open download portal
            </Link>
          </motion.header>

          {notice ? (
            <motion.div variants={riseIn} className="mt-6">
              <GlassAlert tone="success" title={notice} />
            </motion.div>
          ) : null}

          <motion.div
            variants={riseIn}
            className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            {kpis.map((kpi) => (
              <GlassCard key={kpi.label} className="p-5">
                <kpi.icon className="h-4 w-4 text-primary" />
                <p className="mt-4 text-3xl font-semibold tracking-tight">
                  <Counter value={kpi.value} />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.label}</p>
              </GlassCard>
            ))}
          </motion.div>

          <motion.div variants={riseIn} className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <GlassCard className="p-6">
              <h2 className="text-sm font-semibold tracking-wide">
                Daily downloads &amp; active users
              </h2>
              <div className="mt-6 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeline}>
                    <defs>
                      <linearGradient id="dlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="auGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(148,163,184,0.6)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="rgba(148,163,184,0.6)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(8,12,20,0.92)",
                        border: "1px solid rgba(99,102,241,0.35)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="downloads"
                      name="Downloads"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#dlGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="activeUsers"
                      name="Active users"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      fill="url(#auGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="text-sm font-semibold tracking-wide">Downloads by platform</h2>
              <div className="mt-6 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donut}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="58%"
                      outerRadius="88%"
                      isAnimationActive={false}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {donut.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "rgba(8,12,20,0.92)",
                        border: "1px solid rgba(99,102,241,0.35)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {donut.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: entry.fill }}
                      />
                      {entry.name}
                    </span>
                    <span className="font-mono text-foreground">{entry.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={riseIn} className="mt-6">
            <GlassCard className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-glass-border px-6 py-5">
                <h2 className="text-sm font-semibold tracking-wide">Access request queue</h2>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {data.requests.length} records
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] tracking-widest text-muted-foreground uppercase">
                      <th className="px-6 py-3 font-medium">Name</th>
                      <th className="px-6 py-3 font-medium">Email</th>
                      <th className="px-6 py-3 font-medium">Requested</th>
                      <th className="px-6 py-3 font-medium">Downloads</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.requests.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-glass-border/60 transition-colors hover:bg-secondary/30"
                      >
                        <td className="px-6 py-4 font-medium">{row.fullName}</td>
                        <td className="px-6 py-4 text-muted-foreground">{row.email}</td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                          {new Date(row.createdAt).toISOString().slice(0, 10)}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{row.downloadCount}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {row.status === "pending" ? (
                              <GlowButton
                                className="h-9 px-4 text-xs"
                                loading={approving === row.id}
                                onClick={() => void onApprove(row.id)}
                              >
                                Approve access
                              </GlowButton>
                            ) : null}

                            {row.status === "approved" || row.status === "pending" ? (
                              <GlowButton
                                variant="outline"
                                className="h-9 px-4 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                                loading={approving === row.id}
                                onClick={() => void onRemove(row.id)}
                              >
                                Remove access
                              </GlowButton>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {data.requests.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-10 text-center text-sm text-muted-foreground"
                        >
                          No access requests yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
