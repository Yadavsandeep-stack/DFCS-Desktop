import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PortalUser = {
  fullName: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  downloadCount: number;
};

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const passwordSchema = z.string().min(12).max(128);
const PASSWORD_HASH_ITERATIONS = 100_000;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  return new Uint8Array(value.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []);
}

async function derivePasswordHash(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PASSWORD_HASH_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

async function createPasswordRecord(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt);
  return { password_hash: bytesToHex(hash), password_salt: bytesToHex(salt) };
}

async function verifyPassword(password: string, hash: string, salt: string) {
  const actual = await derivePasswordHash(password, hexToBytes(salt));
  const expected = hexToBytes(hash);
  if (actual.length !== expected.length) return false;
  return actual.every((byte, index) => byte === expected[index]);
}

export const requestAccess = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        fullName: z.string().trim().min(2).max(100),
        email: emailSchema,
        password: passwordSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notifyAdminOfRequest } = await import("./portal-email.server");
    const passwordRecord = await createPasswordRecord(data.password);

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("access_requests")
      .select("status")
      .eq("email", data.email)
      .maybeSingle();

    if (lookupError) {
      console.error("[portal] access request lookup failed", {
        code: lookupError.code,
        message: lookupError.message,
      });
      throw new Error("Unable to check access request status.");
    }

    if (existing) {
      if (existing.status === "rejected") {
        const { error } = await supabaseAdmin
          .from("access_requests")
          .update({
            status: "pending",
            approved_at: null,
            last_login_at: null,
            download_count: 0,
            ...passwordRecord,
          })
          .eq("email", data.email);

        if (error) {
          console.error("[portal] access request reactivation failed", {
            code: error.code,
            message: error.message,
          });
          throw new Error("Unable to update the access request.");
        }

        await notifyAdminOfRequest(data.fullName, data.email);
        return {
          ok: true as const,
          duplicate: true as const,
          reactivated: true as const,
          status: "pending" as const,
        };
      }

      return {
        ok: true as const,
        duplicate: true as const,
        status: existing.status as PortalUser["status"],
      };
    }

    const { error } = await supabaseAdmin
      .from("access_requests")
      .insert({ full_name: data.fullName, email: data.email, ...passwordRecord });

    if (error) {
      console.error("[portal] access request insert failed", {
        code: error.code,
        message: error.message,
      });
      throw new Error("Unable to save the access request.");
    }

    await notifyAdminOfRequest(data.fullName, data.email);
    return { ok: true as const, duplicate: false as const, status: "pending" as const };
  });

export const loginWithEmail = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ email: emailSchema, password: passwordSchema }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("access_requests")
      .select("full_name, email, status, download_count, password_hash, password_salt")
      .eq("email", data.email)
      .maybeSingle();

    if (!row) return { outcome: "not_found" as const };
    if (!row.password_hash || !row.password_salt) return { outcome: "password_setup_required" as const };
    if (!(await verifyPassword(data.password, row.password_hash, row.password_salt))) {
      return { outcome: "invalid_credentials" as const };
    }
    if (row.status === "rejected") return { outcome: "rejected" as const };
    if (row.status !== "approved") return { outcome: "pending" as const };

    await supabaseAdmin
      .from("access_requests")
      .update({ last_login_at: new Date().toISOString() })
      .eq("email", data.email);

    return {
      outcome: "approved" as const,
      user: {
        fullName: row.full_name,
        email: row.email,
        status: row.status,
        downloadCount: row.download_count,
      } satisfies PortalUser,
    };
  });

export const verifySession = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ email: emailSchema }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("access_requests")
      .select("full_name, email, status, download_count")
      .eq("email", data.email)
      .maybeSingle();

    if (!row || row.status !== "approved") return { valid: false as const };
    return {
      valid: true as const,
      user: {
        fullName: row.full_name,
        email: row.email,
        status: row.status,
        downloadCount: row.download_count,
      } satisfies PortalUser,
    };
  });

export const recordDownload = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: emailSchema,
        os: z.enum(["windows", "macos", "linux", "android"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("access_requests")
      .select("download_count, status")
      .eq("email", data.email)
      .maybeSingle();

    if (!row || row.status !== "approved") throw new Error("Not authorized to download");

    await supabaseAdmin.from("downloads").insert({ email: data.email, os: data.os });
    await supabaseAdmin
      .from("access_requests")
      .update({ download_count: row.download_count + 1 })
      .eq("email", data.email);

    return { downloadCount: row.download_count + 1 };
  });

/* ---------------- Admin ---------------- */

function assertAdminKey(key: string) {
  const expected = process.env["ADMIN_PORTAL_KEY"] ?? "secret123";
  if (key !== expected) throw new Error("Invalid admin key");
}

export const getAdminAnalytics = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ adminKey: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => {
    assertAdminKey(data.adminKey);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: requests }, { data: downloads }] = await Promise.all([
      supabaseAdmin
        .from("access_requests")
        .select("id, full_name, email, status, download_count, last_login_at, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("downloads").select("os, created_at, email"),
    ]);

    const rows = requests ?? [];
    const dl = downloads ?? [];

    const dayCount = 14;
    const timeline = Array.from({ length: dayCount }, (_, idx) => {
      const day = new Date();
      day.setUTCHours(0, 0, 0, 0);
      day.setUTCDate(day.getUTCDate() - (dayCount - 1 - idx));
      const next = new Date(day);
      next.setUTCDate(next.getUTCDate() + 1);

      const inDay = (value: string | null) =>
        value !== null && new Date(value) >= day && new Date(value) < next;

      return {
        date: day.toISOString().slice(5, 10),
        downloads: dl.filter((d) => inDay(d.created_at)).length,
        activeUsers: new Set(dl.filter((d) => inDay(d.created_at)).map((d) => d.email)).size,
      };
    });

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

    return {
      kpis: {
        totalUsers: rows.length,
        approvedUsers: rows.filter((r) => r.status === "approved").length,
        pendingRequests: rows.filter((r) => r.status === "pending").length,
        activeDaily: rows.filter(
          (r) => r.last_login_at !== null && new Date(r.last_login_at).getTime() > dayAgo,
        ).length,
        totalDownloads: dl.length,
      },
      osSplit: (["windows", "macos", "linux", "android"] as const).map((os) => ({
        os,
        value: dl.filter((d) => d.os === os).length,
      })),
      timeline,
      requests: rows.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        status: r.status as PortalUser["status"],
        downloadCount: r.download_count,
        createdAt: r.created_at,
      })),
    };
  });

export const approveRequest = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ adminKey: z.string().min(1).max(200), id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    assertAdminKey(data.adminKey);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notifyUserApproved } = await import("./portal-email.server");

    const { data: row, error } = await supabaseAdmin
      .from("access_requests")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", data.id)
      .select("full_name, email")
      .single();

    if (error) throw new Error(error.message);
    await notifyUserApproved(row.full_name, row.email);
    return { ok: true as const };
  });

export const removeAccess = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ adminKey: z.string().min(1).max(200), id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    assertAdminKey(data.adminKey);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("access_requests")
      .update({ status: "rejected", approved_at: null })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
