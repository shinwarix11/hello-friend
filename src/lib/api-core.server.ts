/**
 * Aegis public authentication & licensing API.
 *
 * Every endpoint is served through `/api/public/v1/<endpoint>` and shares the
 * same security envelope: application key resolution, optional API-key
 * authorisation, timestamp + nonce replay protection, optional request
 * signatures, structured audit logging and clean JSON error responses.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  hashPassword,
  hmacSha256Hex,
  randomToken,
  sha256Hex,
  timingSafeEqual,
  verifyPassword,
} from "./api-crypto.server";

type Admin = SupabaseClient<Database>;
type AppRow = Database["public"]["Tables"]["applications"]["Row"];
type LicenseRow = Database["public"]["Tables"]["licenses"]["Row"];
type AppUserRow = Database["public"]["Tables"]["app_users"]["Row"];
type ApiKeyRow = Database["public"]["Tables"]["api_keys"]["Row"];
type AuthLogKind = Database["public"]["Enums"]["auth_log_kind"];
type WebhookEvent = Database["public"]["Enums"]["webhook_event"];

export const API_VERSION = "v1";
const TIMESTAMP_TOLERANCE_SECONDS = 300;
const SESSION_TTL_MINUTES_FALLBACK = 720;

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "content-type, authorization, user-agent, x-app-key, x-app-name, x-api-key, x-session-token, x-timestamp, x-nonce, x-signature",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-max-age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      "cache-control": "no-store",
    },
  });
}

function ok(data: unknown) {
  return json({ success: true, data, timestamp: new Date().toISOString() });
}

function fail(code: string, message: string, status: number) {
  return json({ success: false, error: { code, message }, timestamp: new Date().toISOString() }, status);
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

type Ctx = {
  admin: Admin;
  app: AppRow;
  body: Record<string, unknown>;
  request: Request;
  ip: string | null;
  userAgent: string | null;
  apiKey: ApiKeyRow | null;
};

function str(body: Record<string, unknown>, key: string, required = true) {
  const value = body[key];
  if (typeof value !== "string" || value.trim() === "") {
    if (required) throw new ApiError("invalid_request", `Missing or invalid field: ${key}`, 400);
    return null;
  }
  return value.trim();
}

function requireScope(ctx: Ctx, scope: string) {
  if (!ctx.apiKey) {
    throw new ApiError("unauthorized", "This endpoint requires an API key (x-api-key).", 401);
  }
  const scopes = ctx.apiKey.scopes ?? [];
  if (scopes.length && !scopes.includes(scope)) {
    throw new ApiError("forbidden", `API key is missing the "${scope}" scope.`, 403);
  }
}

/* ------------------------------------------------------------------ */
/* Logging + webhooks                                                  */
/* ------------------------------------------------------------------ */

async function logAuth(
  ctx: Pick<Ctx, "admin" | "app" | "ip" | "userAgent">,
  kind: AuthLogKind,
  success: boolean,
  message: string,
  extra: {
    app_user_id?: string | null;
    license_id?: string | null;
    hwid?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
) {
  try {
    await ctx.admin.from("authentication_logs").insert({
      application_id: ctx.app.id,
      kind,
      success,
      message,
      ip_address: ctx.ip,
      user_agent: ctx.userAgent,
      app_user_id: extra.app_user_id ?? null,
      license_id: extra.license_id ?? null,
      hwid: extra.hwid ?? null,
      metadata: (extra.metadata ?? {}) as never,
    });
  } catch {
    /* logging must never break the request */
  }
}

export async function dispatchWebhooks(
  admin: Admin,
  applicationId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
) {
  try {
    const { data: hooks } = await admin
      .from("webhooks")
      .select("*")
      .eq("application_id", applicationId)
      .eq("is_active", true);

    const targets = (hooks ?? []).filter((h) => (h.events ?? []).includes(event));
    await Promise.all(
      targets.map(async (hook) => {
        const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
        const signature = await hmacSha256Hex(hook.signing_secret, body);
        let status: Database["public"]["Enums"]["webhook_delivery_status"] = "failed";
        let responseStatus: number | null = null;
        let error: string | null = null;
        try {
          const res = await fetch(hook.url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-aegis-event": event,
              "x-aegis-signature": `sha256=${signature}`,
            },
            body,
          });
          responseStatus = res.status;
          status = res.ok ? "success" : "failed";
          if (!res.ok) error = `Endpoint responded with ${res.status}`;
        } catch (e) {
          error = e instanceof Error ? e.message : "Delivery failed";
        }
        await admin.from("webhook_deliveries").insert({
          webhook_id: hook.id,
          application_id: applicationId,
          event,
          payload: payload as never,
          status,
          response_status: responseStatus,
          error,
          attempts: 1,
          next_retry_at: status === "failed" ? new Date(Date.now() + 60_000).toISOString() : null,
        });
      }),
    );
  } catch {
    /* webhook delivery is best-effort */
  }
}

/* ------------------------------------------------------------------ */
/* License helpers                                                     */
/* ------------------------------------------------------------------ */

function licenseExpired(license: LicenseRow) {
  return Boolean(license.expires_at && new Date(license.expires_at).getTime() < Date.now());
}

function publicLicense(license: LicenseRow) {
  return {
    key: license.license_key,
    status: licenseExpired(license) ? "expired" : license.status,
    created_at: license.created_at,
    activated_at: license.activated_at,
    expires_at: license.expires_at,
    duration_days: license.duration_days,
    hwid_lock: license.hwid_lock,
    max_activations: license.max_activations,
    current_activations: license.current_activations,
    tags: license.tags,
    subscription_id: license.subscription_id,
  };
}

function publicUser(user: AppUserRow) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    status: user.status,
    hwid: user.hwid,
    created_at: user.created_at,
    last_login_at: user.last_login_at,
    login_count: user.login_count,
  };
}

async function assertLicenseUsable(ctx: Ctx, license: LicenseRow) {
  if (license.status === "banned") throw new ApiError("license_banned", "This license is banned.", 403);
  if (license.status === "suspended")
    throw new ApiError("license_suspended", "This license is suspended.", 403);
  if (licenseExpired(license)) {
    if (license.status !== "expired") {
      await ctx.admin.from("licenses").update({ status: "expired" }).eq("id", license.id);
      void dispatchWebhooks(ctx.admin, ctx.app.id, "license.expired", { license: license.license_key });
    }
    throw new ApiError("license_expired", "This license has expired.", 403);
  }
}

async function findLicense(ctx: Ctx, key: string) {
  const { data } = await ctx.admin
    .from("licenses")
    .select("*")
    .eq("application_id", ctx.app.id)
    .eq("license_key", key)
    .maybeSingle();
  if (!data)
    throw new ApiError("license_not_found", "License key not found or expired.", 404);
  return data;
}

async function activateLicense(ctx: Ctx, license: LicenseRow, hwid: string | null, userId: string | null) {
  await assertLicenseUsable(ctx, license);

  const { data: existing } = await ctx.admin
    .from("license_activations")
    .select("*")
    .eq("license_id", license.id)
    .eq("is_active", true);

  const activations = existing ?? [];
  const match = hwid ? activations.find((a) => a.hwid === hwid) : undefined;

  if (!match) {
    if (license.hwid_lock && !hwid) {
      throw new ApiError("invalid_request", "This license requires a hardware id (hwid).", 400);
    }
    if (activations.length >= license.max_activations) {
      throw new ApiError(
        "activation_limit",
        `Activation limit of ${license.max_activations} reached for this license.`,
        403,
      );
    }
    await ctx.admin.from("license_activations").insert({
      license_id: license.id,
      application_id: ctx.app.id,
      hwid,
      ip_address: ctx.ip,
      user_agent: ctx.userAgent,
      app_user_id: userId,
    });
  }

  const patch: Database["public"]["Tables"]["licenses"]["Update"] = {
    current_activations: match ? activations.length : activations.length + 1,
  };
  if (!license.activated_at) {
    const activatedAt = new Date();
    patch.activated_at = activatedAt.toISOString();
    patch.status = "active";
    if (license.duration_days !== null && !license.expires_at) {
      const expires = new Date(activatedAt);
      expires.setDate(expires.getDate() + license.duration_days);
      patch.expires_at = expires.toISOString();
    }
  } else if (license.status === "unused") {
    patch.status = "active";
  }
  if (userId && !license.app_user_id) patch.app_user_id = userId;

  const { data: updated } = await ctx.admin
    .from("licenses")
    .update(patch)
    .eq("id", license.id)
    .select("*")
    .single();

  const result = updated ?? license;
  if (!match) {
    void dispatchWebhooks(ctx.admin, ctx.app.id, "license.activated", {
      license: result.license_key,
      hwid,
    });
  }
  return result;
}

async function createSession(ctx: Ctx, user: AppUserRow, licenseId: string | null, hwid: string | null) {
  const { data: settings } = await ctx.admin
    .from("application_settings")
    .select("session_timeout_minutes")
    .eq("application_id", ctx.app.id)
    .maybeSingle();

  const minutes = settings?.session_timeout_minutes || SESSION_TTL_MINUTES_FALLBACK;
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + minutes * 60_000).toISOString();

  await ctx.admin.from("app_user_sessions").insert({
    application_id: ctx.app.id,
    app_user_id: user.id,
    license_id: licenseId,
    token_hash: await sha256Hex(token),
    hwid,
    ip_address: ctx.ip,
    user_agent: ctx.userAgent,
    expires_at: expiresAt,
  });

  return { token, expires_at: expiresAt };
}

async function resolveSession(ctx: Ctx) {
  const token =
    ctx.request.headers.get("x-session-token") ?? (typeof ctx.body["session_token"] === "string" ? (ctx.body["session_token"] as string) : null);
  if (!token) throw new ApiError("session_invalid", "Missing session token.", 401);

  const { data: session } = await ctx.admin
    .from("app_user_sessions")
    .select("*")
    .eq("application_id", ctx.app.id)
    .eq("token_hash", await sha256Hex(token))
    .maybeSingle();

  if (!session || !session.is_active) throw new ApiError("session_invalid", "Session is not valid.", 401);
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await ctx.admin.from("app_user_sessions").update({ is_active: false }).eq("id", session.id);
    throw new ApiError("session_expired", "Session has expired.", 401);
  }

  const { data: user } = await ctx.admin
    .from("app_users")
    .select("*")
    .eq("id", session.app_user_id)
    .maybeSingle();
  if (!user) throw new ApiError("session_invalid", "Session user no longer exists.", 401);
  if (user.status !== "active") throw new ApiError("user_blocked", `User is ${user.status}.`, 403);

  return { session, user, token };
}

/* ------------------------------------------------------------------ */
/* Endpoint handlers                                                   */
/* ------------------------------------------------------------------ */

const handlers: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  async status(ctx) {
    const { data: settings } = await ctx.admin
      .from("application_settings")
      .select("maintenance_message")
      .eq("application_id", ctx.app.id)
      .maybeSingle();
    return {
      online: true,
      application: ctx.app.name,
      status: ctx.app.status,
      maintenance: ctx.app.status === "maintenance",
      maintenance_message: settings?.maintenance_message ?? null,
      api_version: API_VERSION,
      server_time: new Date().toISOString(),
    };
  },

  async init(ctx) {
    const version = str(ctx.body, "version", false);
    const { data: settings } = await ctx.admin
      .from("application_settings")
      .select("*")
      .eq("application_id", ctx.app.id)
      .maybeSingle();

    const updateRequired = Boolean(
      version && compareVersions(version, ctx.app.minimum_version ?? "0.0.0") < 0,
    );

    await logAuth(ctx, "init", true, `Client initialised${version ? ` on v${version}` : ""}.`);

    return {
      application: {
        id: ctx.app.id,
        name: ctx.app.name,
        internal_name: ctx.app.internal_name,
        environment: ctx.app.environment,
        status: ctx.app.status,
      },
      version: {
        current: ctx.app.current_version,
        minimum: ctx.app.minimum_version,
        client: version,
        update_required: updateRequired,
      },
      maintenance: ctx.app.status === "maintenance",
      maintenance_message: settings?.maintenance_message ?? null,
      hwid_required: settings?.hwid_lock ?? false,
      session_timeout_minutes: settings?.session_timeout_minutes ?? SESSION_TTL_MINUTES_FALLBACK,
      server_time: new Date().toISOString(),
    };
  },

  async register(ctx) {
    const username = str(ctx.body, "username")!;
    const password = str(ctx.body, "password")!;
    const email = str(ctx.body, "email", false);
    const key = str(ctx.body, "license_key", false);
    const hwid = str(ctx.body, "hwid", false);

    if (password.length < 8) {
      throw new ApiError("invalid_request", "Password must be at least 8 characters.", 400);
    }

    const { data: existing } = await ctx.admin
      .from("app_users")
      .select("id")
      .eq("application_id", ctx.app.id)
      .eq("username", username)
      .maybeSingle();
    if (existing) throw new ApiError("user_exists", "Username is already taken.", 409);

    let license: LicenseRow | null = null;
    if (key) {
      license = await findLicense(ctx, key);
      await assertLicenseUsable(ctx, license);
    }

    const { data: user, error } = await ctx.admin
      .from("app_users")
      .insert({
        application_id: ctx.app.id,
        username,
        email,
        password_hash: await hashPassword(password),
        hwid,
        last_ip: ctx.ip,
      })
      .select("*")
      .single();
    if (error || !user) throw new ApiError("server_error", "Could not create the user.", 500);

    if (license) license = await activateLicense(ctx, license, hwid, user.id);

    await logAuth(ctx, "register", true, `User ${username} registered.`, {
      app_user_id: user.id,
      license_id: license?.id ?? null,
      hwid,
    });
    void dispatchWebhooks(ctx.admin, ctx.app.id, "user.registered", { username, email });

    return { user: publicUser(user), license: license ? publicLicense(license) : null };
  },

  async login(ctx) {
    const username = str(ctx.body, "username")!;
    const password = str(ctx.body, "password")!;
    const hwid = str(ctx.body, "hwid", false);

    const { data: user } = await ctx.admin
      .from("app_users")
      .select("*")
      .eq("application_id", ctx.app.id)
      .eq("username", username)
      .maybeSingle();

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      await logAuth(ctx, "login", false, `Failed login for ${username}.`, { hwid });
      throw new ApiError("invalid_credentials", "Invalid username or password.", 401);
    }
    if (user.status !== "active") {
      await logAuth(ctx, "login", false, `Blocked login for ${username} (${user.status}).`, {
        app_user_id: user.id,
      });
      throw new ApiError("user_blocked", `This account is ${user.status}.`, 403);
    }
    if (user.hwid && hwid && user.hwid !== hwid) {
      await logAuth(ctx, "login", false, `HWID mismatch for ${username}.`, {
        app_user_id: user.id,
        hwid,
      });
      throw new ApiError("hwid_mismatch", "Hardware id does not match this account.", 403);
    }

    const { data: license } = await ctx.admin
      .from("licenses")
      .select("*")
      .eq("application_id", ctx.app.id)
      .eq("app_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (license) await assertLicenseUsable(ctx, license);

    await ctx.admin
      .from("app_users")
      .update({
        last_login_at: new Date().toISOString(),
        login_count: user.login_count + 1,
        last_ip: ctx.ip,
        hwid: user.hwid ?? hwid,
      })
      .eq("id", user.id);

    const session = await createSession(ctx, user, license?.id ?? null, hwid);
    await logAuth(ctx, "login", true, `User ${username} logged in.`, {
      app_user_id: user.id,
      license_id: license?.id ?? null,
      hwid,
    });
    void dispatchWebhooks(ctx.admin, ctx.app.id, "user.login", { username });

    return {
      user: publicUser(user),
      license: license ? publicLicense(license) : null,
      session,
    };
  },

  async logout(ctx) {
    const { session } = await resolveSession(ctx);
    await ctx.admin.from("app_user_sessions").update({ is_active: false }).eq("id", session.id);
    await logAuth(ctx, "logout", true, "Session terminated.", { app_user_id: session.app_user_id });
    return { terminated: true };
  },

  async heartbeat(ctx) {
    const { session, user } = await resolveSession(ctx);
    await ctx.admin
      .from("app_user_sessions")
      .update({ last_seen_at: new Date().toISOString(), ip_address: ctx.ip })
      .eq("id", session.id);
    return { alive: true, user: publicUser(user), expires_at: session.expires_at };
  },

  async "session/check"(ctx) {
    const { session, user } = await resolveSession(ctx);
    let license = null;
    if (session.license_id) {
      const { data } = await ctx.admin.from("licenses").select("*").eq("id", session.license_id).maybeSingle();
      license = data ? publicLicense(data) : null;
    }
    return { valid: true, user: publicUser(user), license, expires_at: session.expires_at };
  },

  async log(ctx) {
    const message = str(ctx.body, "message")!.slice(0, 2000);
    const pcuser = str(ctx.body, "pcuser", false);
    const hwid = str(ctx.body, "hwid", false);

    // Client logs are accepted with or without an active session — a session
    // simply links the entry to the end user when one exists.
    let appUserId: string | null = null;
    try {
      const { session } = await resolveSession(ctx);
      appUserId = session.app_user_id;
    } catch {
      /* anonymous client log */
    }

    await logAuth(ctx, "log", true, message, {
      app_user_id: appUserId,
      hwid,
      metadata: pcuser ? { pcuser } : {},
    });
    return { logged: true };
  },

  async "license/validate"(ctx) {
    const key = str(ctx.body, "license_key")!;
    const hwid = str(ctx.body, "hwid", false);
    const license = await findLicense(ctx, key);
    await assertLicenseUsable(ctx, license);

    if (license.hwid_lock && hwid) {
      const { data: activations } = await ctx.admin
        .from("license_activations")
        .select("hwid")
        .eq("license_id", license.id)
        .eq("is_active", true);
      const known = activations ?? [];
      if (known.length && !known.some((a) => a.hwid === hwid)) {
        await logAuth(ctx, "validate", false, "HWID mismatch on validate.", {
          license_id: license.id,
          hwid,
        });
        throw new ApiError("hwid_mismatch", "This license is locked to another device.", 403);
      }
    }

    const { data: variables } = await ctx.admin
      .from("license_variables")
      .select("key, value, is_public")
      .eq("license_id", license.id);

    await logAuth(ctx, "validate", true, "License validated.", { license_id: license.id, hwid });
    return {
      valid: true,
      license: publicLicense(license),
      variables: Object.fromEntries((variables ?? []).filter((v) => v.is_public).map((v) => [v.key, v.value])),
    };
  },

  async "license/activate"(ctx) {
    const key = str(ctx.body, "license_key")!;
    const hwid = str(ctx.body, "hwid", false);
    const username = str(ctx.body, "username", false);

    let userId: string | null = null;
    if (username) {
      const { data: user } = await ctx.admin
        .from("app_users")
        .select("id")
        .eq("application_id", ctx.app.id)
        .eq("username", username)
        .maybeSingle();
      userId = user?.id ?? null;
    }

    const license = await activateLicense(ctx, await findLicense(ctx, key), hwid, userId);
    await logAuth(ctx, "activate", true, "License activated.", { license_id: license.id, hwid });
    return { activated: true, license: publicLicense(license) };
  },

  async "variables/get"(ctx) {
    const scope = str(ctx.body, "scope", false) ?? "application";

    if (scope === "application") {
      const { data } = await ctx.admin
        .from("application_variables")
        .select("key, value, is_public, category")
        .eq("application_id", ctx.app.id)
        .eq("is_public", true);
      await logAuth(ctx, "variable", true, "Application variables read.");
      return { scope, variables: Object.fromEntries((data ?? []).map((v) => [v.key, v.value])) };
    }

    if (scope === "license") {
      const license = await findLicense(ctx, str(ctx.body, "license_key")!);
      const { data } = await ctx.admin
        .from("license_variables")
        .select("key, value, is_public")
        .eq("license_id", license.id);
      return {
        scope,
        variables: Object.fromEntries(
          (data ?? []).filter((v) => v.is_public).map((v) => [v.key, v.value]),
        ),
      };
    }

    const { user } = await resolveSession(ctx);
    const { data } = await ctx.admin
      .from("app_user_variables")
      .select("key, value")
      .eq("app_user_id", user.id);
    return { scope: "user", variables: Object.fromEntries((data ?? []).map((v) => [v.key, v.value])) };
  },

  async "variables/set"(ctx) {
    const scope = str(ctx.body, "scope", false) ?? "user";
    const key = str(ctx.body, "key")!;
    const value = str(ctx.body, "value", false) ?? "";

    if (scope === "user") {
      const { user } = await resolveSession(ctx);
      await ctx.admin
        .from("app_user_variables")
        .upsert(
          { application_id: ctx.app.id, app_user_id: user.id, key, value },
          { onConflict: "app_user_id,key" },
        );
      await logAuth(ctx, "variable", true, `User variable "${key}" written.`, {
        app_user_id: user.id,
      });
      return { scope, key, saved: true };
    }

    if (scope === "license") {
      requireScope(ctx, "variables:write");
      const license = await findLicense(ctx, str(ctx.body, "license_key")!);
      await ctx.admin
        .from("license_variables")
        .upsert(
          { application_id: ctx.app.id, license_id: license.id, key, value },
          { onConflict: "license_id,key" },
        );
      return { scope, key, saved: true };
    }

    requireScope(ctx, "variables:write");
    await ctx.admin
      .from("application_variables")
      .upsert(
        { application_id: ctx.app.id, name: key, key, value, category: "api" },
        { onConflict: "application_id,key" },
      );
    return { scope: "application", key, saved: true };
  },

  async "user/data"(ctx) {
    const { user } = await resolveSession(ctx);
    const [{ data: variables }, { data: licenses }, { data: sessions }] = await Promise.all([
      ctx.admin.from("app_user_variables").select("key, value").eq("app_user_id", user.id),
      ctx.admin.from("licenses").select("*").eq("app_user_id", user.id),
      ctx.admin
        .from("app_user_sessions")
        .select("id, created_at, last_seen_at, ip_address, is_active")
        .eq("app_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    return {
      user: publicUser(user),
      variables: Object.fromEntries((variables ?? []).map((v) => [v.key, v.value])),
      licenses: (licenses ?? []).map(publicLicense),
      sessions: sessions ?? [],
    };
  },

  async "app/data"(ctx) {
    const [{ data: versions }, { data: downloads }, { count: users }, { count: licenses }] =
      await Promise.all([
        ctx.admin
          .from("application_versions")
          .select("version, channel, release_notes, is_current, is_minimum, released_at")
          .eq("application_id", ctx.app.id)
          .order("released_at", { ascending: false })
          .limit(20),
        ctx.admin
          .from("application_downloads")
          .select("id, name, kind, file_url, checksum, size_bytes, release_notes")
          .eq("application_id", ctx.app.id),
        ctx.admin
          .from("app_users")
          .select("id", { count: "exact", head: true })
          .eq("application_id", ctx.app.id),
        ctx.admin
          .from("licenses")
          .select("id", { count: "exact", head: true })
          .eq("application_id", ctx.app.id),
      ]);
    return {
      application: {
        id: ctx.app.id,
        name: ctx.app.name,
        internal_name: ctx.app.internal_name,
        description: ctx.app.description,
        category: ctx.app.category,
        environment: ctx.app.environment,
        status: ctx.app.status,
        current_version: ctx.app.current_version,
        minimum_version: ctx.app.minimum_version,
      },
      stats: { users: users ?? 0, licenses: licenses ?? 0 },
      versions: versions ?? [],
      downloads: downloads ?? [],
    };
  },

  async "version/check"(ctx) {
    const version = str(ctx.body, "version")!;
    const channel = str(ctx.body, "channel", false) ?? "stable";
    const { data: versions } = await ctx.admin
      .from("application_versions")
      .select("*")
      .eq("application_id", ctx.app.id)
      .eq("channel", channel as Database["public"]["Enums"]["app_version_channel"])
      .order("released_at", { ascending: false });

    const latest = (versions ?? []).find((v) => v.is_current) ?? (versions ?? [])[0] ?? null;
    const minimum = ctx.app.minimum_version ?? "0.0.0";
    const updateRequired = compareVersions(version, minimum) < 0;
    const updateAvailable = latest ? compareVersions(version, latest.version) < 0 : false;

    await logAuth(ctx, "version", true, `Version check from v${version}.`);
    return {
      client_version: version,
      latest_version: latest?.version ?? ctx.app.current_version,
      minimum_version: minimum,
      channel,
      update_available: updateAvailable,
      update_required: updateRequired,
      release_notes: latest?.release_notes ?? null,
      maintenance: ctx.app.status === "maintenance",
    };
  },

  async downloads(ctx) {
    const version = str(ctx.body, "version", false);
    let query = ctx.admin
      .from("application_downloads")
      .select("id, name, kind, file_url, checksum, size_bytes, release_notes, version_id, download_count")
      .eq("application_id", ctx.app.id);

    if (version) {
      const { data: v } = await ctx.admin
        .from("application_versions")
        .select("id")
        .eq("application_id", ctx.app.id)
        .eq("version", version)
        .maybeSingle();
      if (v) query = query.eq("version_id", v.id);
    }

    const { data } = await query;
    await logAuth(ctx, "download", true, "Download manifest requested.");
    return { downloads: data ?? [] };
  },

  async "webhook/trigger"(ctx) {
    requireScope(ctx, "webhooks:trigger");
    const event = str(ctx.body, "event")! as WebhookEvent;
    const payload = (ctx.body["payload"] ?? {}) as Record<string, unknown>;
    await dispatchWebhooks(ctx.admin, ctx.app.id, event, payload);
    return { dispatched: true, event };
  },
};

export function compareVersions(a: string, b: string) {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

export const API_ENDPOINTS = Object.keys(handlers);

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export async function handleApiRequest(endpoint: string, request: Request): Promise<Response> {
  const startedAt = Date.now();
  // Preflight: a 204 must have a null body — a JSON body here makes the
  // runtime throw, which is what surfaced to SDKs as "Request failed.".
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...CORS_HEADERS, "cache-control": "no-store" },
    });
  }

  const handler = handlers[endpoint];
  if (!handler) return fail("not_found", `Unknown endpoint "${endpoint}".`, 404);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as Admin;

  const raw = request.method === "GET" ? "" : await request.text();
  let body: Record<string, unknown> = {};
  if (raw) {
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return fail("invalid_request", "Request body must be valid JSON.", 400);
    }
  }
  if (request.method === "GET") {
    body = Object.fromEntries(new URL(request.url).searchParams.entries());
  }

  const appKey =
    request.headers.get("x-app-key") ?? (typeof body["app_key"] === "string" ? (body["app_key"] as string) : null);
  if (!appKey) return fail("unauthorized", "Missing application key (x-app-key).", 401);

  const { data: app } = await admin.from("applications").select("*").eq("public_key", appKey).maybeSingle();
  if (!app) return fail("not_found", "Application or License key not found.", 404);

  // Optional application-name verification (KeyAuth-style name+key binding).
  // Only enforced when the client actually sends a name.
  const presentedName =
    request.headers.get("x-app-name") ??
    (typeof body["app_name"] === "string" ? (body["app_name"] as string) : null);
  if (
    presentedName &&
    presentedName.localeCompare(app.name, undefined, { sensitivity: "accent" }) !== 0 &&
    presentedName !== app.internal_name
  ) {
    return fail("not_found", "Application or License key not found.", 404);
  }

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const userAgent = request.headers.get("user-agent");

  // --- Timestamp validation + replay protection -------------------------
  const timestamp = request.headers.get("x-timestamp");
  const nonce = request.headers.get("x-nonce");
  if (timestamp) {
    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) return fail("invalid_timestamp", "x-timestamp must be a unix timestamp.", 400);
    const seconds = ts > 1e12 ? ts / 1000 : ts;
    if (Math.abs(Date.now() / 1000 - seconds) > TIMESTAMP_TOLERANCE_SECONDS) {
      return fail("invalid_timestamp", "Request timestamp is outside the allowed window.", 401);
    }
  }
  if (nonce) {
    const { error } = await admin.from("api_request_nonces").insert({ application_id: app.id, nonce });
    if (error) return fail("replay_detected", "This request nonce has already been used.", 409);
  }

  // --- Optional request signature ---------------------------------------
  const signature = request.headers.get("x-signature");
  if (signature) {
    const expected = await hmacSha256Hex(app.secret_key, `${timestamp ?? ""}.${raw}`);
    if (!timingSafeEqual(signature.replace(/^sha256=/, ""), expected)) {
      return fail("invalid_signature", "Request signature verification failed.", 401);
    }
  }

  // --- Optional API key --------------------------------------------------
  let apiKey: ApiKeyRow | null = null;
  const presentedKey = request.headers.get("x-api-key");
  if (presentedKey) {
    const { data: keyRow } = await admin
      .from("api_keys")
      .select("*")
      .eq("application_id", app.id)
      .eq("key_hash", await sha256Hex(presentedKey))
      .maybeSingle();
    if (!keyRow || keyRow.revoked_at) return fail("unauthorized", "Invalid or revoked API key.", 401);
    apiKey = keyRow;
    void admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
  }

  const ctx: Ctx = { admin, app, body, request, ip, userAgent, apiKey };

  // --- Lifecycle gates ---------------------------------------------------
  if (app.status === "archived" || app.status === "paused") {
    return fail("application_unavailable", `Application is ${app.status}.`, 503);
  }
  if (app.status === "maintenance" && endpoint !== "status" && endpoint !== "init") {
    return fail("maintenance", "Application is in maintenance mode.", 503);
  }

  let response: Response;
  try {
    response = ok(await handler(ctx));
  } catch (error) {
    if (error instanceof ApiError) {
      response = fail(error.code, error.message, error.status);
    } else {
      console.error("[api]", endpoint, error);
      await logAuth(ctx, "error", false, `Unhandled error on ${endpoint}.`);
      response = fail("server_error", "An unexpected error occurred.", 500);
    }
  }

  void admin.from("api_usage_logs").insert({
    application_id: app.id,
    endpoint,
    method: request.method,
    status_code: response.status,
    duration_ms: Date.now() - startedAt,
    ip_address: ip,
    api_key_id: apiKey?.id ?? null,
  });

  return response;
}
