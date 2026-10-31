import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useState } from "react";
import confetti from "canvas-confetti";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Download,
  Fingerprint,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { GlassAlert, GlowButton, NeonField } from "@/components/portal/controls";
import { BrandMark } from "@/components/portal/brand";
import {
  CursorSpotlight,
  GlassCard,
  GridBackdrop,
  riseIn,
  stagger,
} from "@/components/portal/effects";
import { loginWithEmail, requestAccess } from "@/lib/portal.functions";
import { saveSession } from "@/lib/portal-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DFCS Desktop — Request Access & Download" },
      {
        name: "description",
        content:
          "Request access to DFCS Desktop, get admin approval, then download signed builds for Windows, macOS and Linux.",
      },
      { property: "og:title", content: "DFCS Desktop — Request Access & Download" },
      {
        property: "og:description",
        content:
          "Gated access portal for DFCS Desktop: request access, get approved, and download verified builds.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Zap, label: "40% faster cold start" },
  { icon: ShieldCheck, label: "Notarized & code-signed" },
  { icon: Cpu, label: "Native Apple Silicon" },
  { icon: Fingerprint, label: "SHA-256 verified builds" },
];

function Landing() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"request" | "login">("request");

  const submitRequest = useServerFn(requestAccess);
  const submitLogin = useServerFn(loginWithEmail);

  const [name, setName] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [requestPassword, setRequestPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [busy, setBusy] = useState(false);
  const [requestEmailError, setRequestEmailError] = useState<string | null>(null);
  const [requestPasswordError, setRequestPasswordError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{
    tone: "info" | "success" | "warning" | "error";
    title: string;
    description?: string;
  } | null>(null);

  async function onRequest(event: React.FormEvent) {
    event.preventDefault();
    setAlert(null);
    setRequestEmailError(null);
    setRequestPasswordError(null);
    if (!acceptedPolicies) {
      setAlert({ tone: "warning", title: "Please accept the Terms and Privacy Policy to continue." });
      return;
    }
    if (name.trim().length < 2) return setAlert({ tone: "warning", title: "Please enter your full name." });
    if (!/^\S+@\S+\.\S+$/.test(requestEmail)) {
      setRequestEmailError("Enter a valid email address.");
      return;
    }
    if (requestPassword.length < 12) {
      setRequestPasswordError("Your password must be at least 12 characters.");
      return;
    }

    setBusy(true);
    try {
      const result = await submitRequest({ data: { fullName: name, email: requestEmail, password: requestPassword } });
      if (result.duplicate) {
        if (result.reactivated) {
          setAlert({
            tone: "info",
            title: "Previous access was removed. Your new request is pending review.",
            description: "The admin has been notified again and can approve access from the portal.",
          });
        } else {
          setAlert({
            tone: result.status === "approved" ? "success" : "warning",
            title:
              result.status === "approved"
                ? "You already have access."
                : "Request already on file — awaiting review.",
            description: "Switch to User Access Login to continue.",
          });
        }
      } else {
        setAlert({
          tone: "info",
          title: "Request Submitted! Awaiting Admin Authorization.",
          description: "You'll be notified as soon as your access is approved.",
        });
        setName("");
        setRequestEmail("");
        setRequestPassword("");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setAlert({
        tone: "error",
        title: message || "Something went wrong. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onLogin(event: React.FormEvent) {
    event.preventDefault();
    setAlert(null);
    setLoginError(null);
    if (!/^\S+@\S+\.\S+$/.test(loginEmail)) return setLoginError("Enter a valid email address.");
    if (!loginPassword) return setLoginError("Enter your password.");

    setBusy(true);
    try {
      const result = await submitLogin({ data: { email: loginEmail, password: loginPassword } });
      if (result.outcome === "not_found") {
        setLoginError("No access request found for this email.");
      } else if (result.outcome === "invalid_credentials") {
        setLoginError("Email or password is incorrect.");
      } else if (result.outcome === "password_setup_required") {
        setLoginError("This account needs a password reset by the administrator.");
      } else if (result.outcome === "pending") {
        setAlert({
          tone: "warning",
          title: "Access status is currently PENDING admin review.",
          description: "Hang tight — approval usually lands within a few hours.",
        });
      } else if (result.outcome === "rejected") {
        setAlert({
          tone: "error",
          title: "Access has been discontinued.",
          description: "Your access was removed by the administrator. Please contact the admin for help.",
        });
      } else {
        saveSession(result.user);
        confetti({ particleCount: 160, spread: 78, origin: { y: 0.7 } });
        setAlert({ tone: "success", title: `Access granted. Welcome, ${result.user.fullName}.` });
        setTimeout(() => navigate({ to: "/dashboard" }), 900);
      }
    } catch {
      setAlert({ tone: "error", title: "Sign-in failed. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  function openAdminPortal() {
    const key = adminKey.trim();
    if (!key) {
      setAlert({
        tone: "warning",
        title: "Admin key required.",
        description: "Enter the admin key in the field below, then continue.",
      });
      return;
    }

    const url = `${window.location.origin}/admin?admin_key=${encodeURIComponent(key)}`;
    window.location.assign(url);
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <GridBackdrop />
      <CursorSpotlight />

      <div className="relative z-10 mx-auto grid max-w-6xl gap-14 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.div variants={riseIn} className="mb-6 flex items-center gap-3">
            <BrandMark className="size-14 rounded-2xl shadow-glow" />
            <span className="text-lg font-semibold tracking-tight">DFCS Desktop</span>
          </motion.div>
          <motion.div variants={riseIn} className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-secondary/40 px-3 py-1 font-mono text-[11px] tracking-widest text-accent uppercase">
              <Sparkles className="h-3 w-3" /> Latest GitHub release
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              Automatically synced from GitHub
            </span>
          </motion.div>

          <motion.h1
            variants={riseIn}
            className="mt-6 text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl"
          >
            The desktop engine for <span className="text-gradient">serious operators</span>.
          </motion.h1>

          <motion.p variants={riseIn} className="mt-5 max-w-lg text-base text-muted-foreground">
            DFCS Desktop ships as a gated release. Request access, get authorized by an
            administrator, then pull signed builds for every platform from your private portal.
          </motion.p>

          <motion.div variants={riseIn} className="mt-8 flex flex-wrap gap-2">
            {FEATURES.map((feature) => (
              <span
                key={feature.label}
                className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-secondary/30 px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <feature.icon className="h-3.5 w-3.5 text-primary" />
                {feature.label}
              </span>
            ))}
          </motion.div>

          <motion.div
            variants={riseIn}
            className="mt-10 flex items-center gap-3 text-xs text-muted-foreground"
          >
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full text-success" />
            <span>Release channel operational — 3 platforms live</span>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <GlassCard className="p-2">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary/40 p-1">
              {(
                [
                  ["request", "Request Access"],
                  ["login", "User Access Login"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setTab(key);
                    setAlert(null);
                    setRequestEmailError(null);
                    setRequestPasswordError(null);
                    setLoginError(null);
                  }}
                  className={`relative h-10 rounded-lg text-sm font-medium transition-colors ${
                    tab === key ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === key ? (
                    <motion.span
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-lg bg-gradient-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  ) : null}
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>

            <div className="p-6">
              {tab === "request" ? (
                <form onSubmit={onRequest} className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Tell us who you are. An administrator reviews every request.
                  </p>
                  <NeonField
                    label="Full name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    maxLength={100}
                  />
                  <NeonField
                    label="Email address"
                    type="email"
                    value={requestEmail}
                    onChange={(event) => setRequestEmail(event.target.value)}
                    autoComplete="email"
                    maxLength={255}
                    error={requestEmailError ?? undefined}
                  />
                  <NeonField
                    label="Create password"
                    type="password"
                    value={requestPassword}
                    onChange={(event) => setRequestPassword(event.target.value)}
                    autoComplete="new-password"
                    maxLength={128}
                    error={requestPasswordError ?? undefined}
                  />
                  <p className="-mt-2 text-[11px] text-muted-foreground">
                    Use at least 12 characters. Your password is stored as a one-way hash.
                  </p>
                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={acceptedPolicies}
                      onChange={(event) => setAcceptedPolicies(event.target.checked)}
                      className="mt-0.5 size-4 accent-primary"
                    />
                    <span>
                      I agree to the <Link to="/terms" className="text-primary underline">Terms of Use</Link>{" "}
                      and <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.
                    </span>
                  </label>
                  <GlowButton type="submit" loading={busy} className="w-full">
                    Submit access request <ArrowRight className="h-4 w-4" />
                  </GlowButton>
                </form>
              ) : (
                <form onSubmit={onLogin} className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Enter the email you registered with to open your download portal.
                  </p>
                  <NeonField
                    label="Registered email"
                    type="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    autoComplete="email"
                    maxLength={255}
                    error={loginError ?? undefined}
                  />
                  <NeonField
                    label="Password"
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    autoComplete="current-password"
                    maxLength={128}
                  />
                  <GlowButton type="submit" loading={busy} className="w-full">
                    Enter download portal <Download className="h-4 w-4" />
                  </GlowButton>

                  <details className="rounded-xl border border-dashed border-border/80 bg-secondary/20 p-3">
                    <summary className="cursor-pointer text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                      Admin access
                    </summary>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={adminKey}
                        onChange={(event) => setAdminKey(event.target.value)}
                        type="password"
                        placeholder="Admin key"
                        autoComplete="off"
                        className="h-10 w-full rounded-xl border border-border bg-background/60 px-3 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground/80 focus:border-primary/50"
                      />
                      <button
                        type="button"
                        onClick={openAdminPortal}
                        className="h-10 rounded-xl border border-primary/40 bg-primary/15 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                      >
                        Open
                      </button>
                    </div>
                  </details>
                </form>
              )}

              {alert ? (
                <div className="mt-4">
                  <GlassAlert {...alert} />
                </div>
              ) : null}

              <p className="mt-5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                Access is per-email and revocable at any time.
              </p>
              <nav className="mt-4 flex gap-3 text-[11px] text-muted-foreground" aria-label="Legal">
                <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
                <Link to="/terms" className="underline hover:text-foreground">Terms of Use</Link>
              </nav>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </main>
  );
}
