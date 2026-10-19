import crypto from "crypto";
import express, { type Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "./config.js";
import { clientIp, recordAudit } from "./auth/audit.js";
import {
  createUser,
  findOrCreateUser,
  findUserByEmail,
  findUserById,
  findUserByPhone,
  linkIdentity,
  markEmailVerified,
  markPhoneVerified,
  recordLogin,
  setUserPassword,
  toPublicUser,
} from "./auth/account-service.js";
import { buildGoogleAuthUrl, exchangeGoogleCode, isGoogleConfigured } from "./auth/google-oauth.js";
import { hashPassword, needsRehash, validatePasswordStrength, verifyPassword } from "./auth/password.js";
import { issueOtp, otpCooldownRemaining, verifyOtp } from "./auth/otp-service.js";
import { normalizePeruPhone, maskPhone } from "./auth/phone.js";
import { issueRefreshToken, revokeAllUserTokens, revokeRefreshToken, rotateRefreshToken } from "./auth/refresh-service.js";
import { generateOpaqueToken, hashOpaqueToken, signAccessToken } from "./auth/tokens.js";
import { sendPasswordResetEmail, sendWelcomeEmail } from "./auth/email-templates.js";
import { requireAuth, type AuthenticatedRequest } from "./auth-middleware.js";
import { db } from "./db.js";
import { passwordResetTokens } from "../shared/schema.js";
import { and, eq, gt, isNull } from "drizzle-orm";

const router: Router = express.Router();

const emailSchema = z.string().email("Correo inválido").max(254);
const passwordSchema = z.string().min(10, "La contraseña debe tener al menos 10 caracteres").max(200);
const otpCodeSchema = z.string().regex(/^\d{4,8}$/, "Código inválido");

// --- Rate limiters scoped to sensitive auth endpoints ------------------------
const authLimiter = rateLimit({
  windowMs: config.security.apiRateLimitWindowMinutes * 60 * 1000,
  max: config.security.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiados intentos. Intenta de nuevo más tarde." },
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: config.security.otpRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => clientIp(req) ?? "unknown",
  message: { message: "Demasiadas solicitudes de código. Espera unos minutos." },
});

// --- Cookie + token helpers --------------------------------------------------
function refreshCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax" as const,
    domain: config.auth.cookieDomain,
    path: "/api/auth",
    maxAge: maxAgeMs,
  };
}

function setRefreshCookie(res: express.Response, token: string, expiresAt: Date) {
  res.cookie(config.auth.cookieName, token, refreshCookieOptions(expiresAt.getTime() - Date.now()));
}

function clearRefreshCookie(res: express.Response) {
  res.clearCookie(config.auth.cookieName, { path: "/api/auth", domain: config.auth.cookieDomain });
}

async function establishSession(
  req: express.Request,
  res: express.Response,
  userId: number,
  status: number,
  extra: Record<string, unknown> = {},
) {
  const user = await findUserById(userId);
  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

  const accessToken = signAccessToken(user);
  const refresh = await issueRefreshToken(userId, {
    userAgent: req.headers["user-agent"] ?? null,
    ip: clientIp(req),
  });
  setRefreshCookie(res, refresh.token, refresh.expiresAt);
  await recordLogin(userId);

  return res.status(status).json({
    user: toPublicUser(user),
    accessToken,
    expiresIn: config.auth.accessTokenTtl,
    ...extra,
  });
}

// --- Google OAuth (Authorization Code + PKCE) --------------------------------
const OAUTH_STATE_COOKIE = "micita_oauth";

router.get("/google/start", authLimiter, async (_req, res) => {
  if (!isGoogleConfigured()) {
    return res.status(503).json({ message: "El inicio de sesión con Google no está configurado" });
  }
  try {
    const { url, state, codeVerifier, nonce } = await buildGoogleAuthUrl();
    const payload = Buffer.from(JSON.stringify({ state, codeVerifier, nonce })).toString("base64url");
    res.cookie(OAUTH_STATE_COOKIE, payload, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: 10 * 60 * 1000,
    });
    res.redirect(url);
  } catch (error: any) {
    console.error("[auth/google] start failed:", error);
    res.status(500).json({ message: "No se pudo iniciar el flujo de Google" });
  }
});

router.get("/google/callback", async (req, res) => {
  try {
    const cookie = req.cookies?.[OAUTH_STATE_COOKIE];
    if (!cookie) {
      return redirectToApp(res, "/login?error=google_state");
    }
    const { state, codeVerifier, nonce } = JSON.parse(Buffer.from(cookie, "base64url").toString("utf8"));
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/api/auth/google" });

    if (req.query.error) {
      return redirectToApp(res, "/login?error=google_denied");
    }
    if (typeof req.query.state !== "string" || req.query.state !== state) {
      return redirectToApp(res, "/login?error=google_state");
    }

    const currentUrl = new URL(`${config.appUrl}${req.originalUrl}`);
    const profile = await exchangeGoogleCode(currentUrl, codeVerifier, state, nonce);

    const user = await findOrCreateUser(profile.email, "google", {
      name: profile.name,
      avatarUrl: profile.picture ?? null,
      providerAccountId: profile.sub,
      emailVerified: profile.emailVerified,
    });

    await recordAudit(req, { userId: user.id, email: user.email, event: "google_login", provider: "google" });

    // Issue tokens then hand the SPA a short-lived one-time code via redirect.
    const accessToken = signAccessToken(user);
    const refresh = await issueRefreshToken(user.id, {
      userAgent: req.headers["user-agent"] ?? null,
      ip: clientIp(req),
    });
    setRefreshCookie(res, refresh.token, refresh.expiresAt);
    return redirectToApp(res, `/auth/callback?access_token=${encodeURIComponent(accessToken)}`);
  } catch (error: any) {
    console.error("[auth/google] callback failed:", error);
    return redirectToApp(res, "/login?error=google_failed");
  }
});

function redirectToApp(res: express.Response, path: string) {
  const base = config.isProduction ? config.appUrl.replace(/\/$/, "") : "";
  return res.redirect(`${base}${path}`);
}

// --- Email + password --------------------------------------------------------
const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(120),
  phone: z.string().max(30).optional(),
});

router.post("/register", authLimiter, async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten().fieldErrors });
    }
    const { email, password, name } = parsed.data;

    const policy = validatePasswordStrength(password);
    if (!policy.valid) {
      return res.status(400).json({ message: "Contraseña débil", errors: { password: policy.errors } });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "El correo ya está registrado" });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ email, name, passwordHash, provider: "password" });
    await linkIdentity(user.id, "password", email);

    await recordAudit(req, { userId: user.id, email: user.email, event: "register", provider: "password" });
    await sendWelcomeEmail(user.email, user.name).catch(() => undefined);

    // Registration always requires email OTP verification before full access.
    const otp = await issueOtp(user.email, "email", "verify_email");
    return establishSession(req, res, user.id, 201, {
      requiresEmailVerification: true,
      otpSent: otp.sent,
      ...(otp.devCode ? { devCode: otp.devCode } : {}),
    });
  } catch (error: any) {
    console.error("[auth/register] error:", error);
    return res.status(500).json({ message: "No se pudo crear la cuenta" });
  }
});

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(200) });

router.post("/login", authLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos" });

    const { email, password } = parsed.data;
    const user = await findUserByEmail(email);
    const valid = user ? await verifyPassword(password, user.password) : false;

    if (!user || !valid) {
      await recordAudit(req, { email, event: "login_failed", provider: "password" });
      return res.status(401).json({ message: "Credenciales inválidas" });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: "Cuenta desactivada" });
    }

    // Opportunistically upgrade legacy bcrypt hashes to argon2id.
    if (needsRehash(user.password)) {
      await setUserPassword(user.id, await hashPassword(password));
    }

    await recordAudit(req, { userId: user.id, email: user.email, event: "login_success", provider: "password" });
    return establishSession(req, res, user.id, 200);
  } catch (error: any) {
    console.error("[auth/login] error:", error);
    return res.status(500).json({ message: "Error en el inicio de sesión" });
  }
});

// --- Email OTP ---------------------------------------------------------------
router.post("/otp/email/request", otpLimiter, async (req, res) => {
  try {
    const parsed = z.object({ email: emailSchema, purpose: z.enum(["login", "verify_email"]).optional() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Correo inválido" });

    const email = parsed.data.email.toLowerCase();
    const purpose = parsed.data.purpose ?? "login";

    const cooldown = await otpCooldownRemaining(email, purpose);
    if (cooldown > 0) {
      return res.status(429).json({ message: `Espera ${cooldown}s antes de solicitar otro código` });
    }

    const otp = await issueOtp(email, "email", purpose);
    await recordAudit(req, { email, event: "otp_sent", provider: "email" });

    // Never reveal whether the account exists.
    return res.json({
      ok: true,
      sent: otp.sent,
      expiresAt: otp.expiresAt.toISOString(),
      ...(otp.devCode ? { devCode: otp.devCode } : {}),
    });
  } catch (error: any) {
    console.error("[auth/otp/email/request] error:", error);
    return res.status(500).json({ message: "No se pudo enviar el código" });
  }
});

router.post("/otp/email/verify", authLimiter, async (req, res) => {
  try {
    const parsed = z
      .object({ email: emailSchema, code: otpCodeSchema, purpose: z.enum(["login", "verify_email"]).optional() })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos" });

    const email = parsed.data.email.toLowerCase();
    const purpose = parsed.data.purpose ?? "login";
    const result = await verifyOtp(email, parsed.data.code, purpose);
    if (!result.valid) {
      await recordAudit(req, { email, event: "otp_failed", provider: "email", metadata: { reason: result.reason } });
      return res.status(401).json({ message: "Código inválido o expirado" });
    }

    let user = await findUserByEmail(email);
    if (!user) {
      // Passwordless sign-up: an unregistered email that passes OTP creates an account.
      user = await findOrCreateUser(email, "email_otp", { emailVerified: true });
    } else {
      await markEmailVerified(user.id, email);
    }

    await recordAudit(req, { userId: user.id, email, event: "otp_verified", provider: "email" });
    return establishSession(req, res, user.id, 200, { requiresEmailVerification: false });
  } catch (error: any) {
    console.error("[auth/otp/email/verify] error:", error);
    return res.status(500).json({ message: "No se pudo verificar el código" });
  }
});

// --- Phone OTP ---------------------------------------------------------------
router.post("/otp/phone/request", otpLimiter, async (req, res) => {
  try {
    const parsed = z.object({ phone: z.string().min(6).max(30) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Número inválido" });

    const phone = normalizePeruPhone(parsed.data.phone);
    if (!phone) return res.status(400).json({ message: "Número de teléfono inválido (usa formato +51 9XXXXXXXX)" });

    const cooldown = await otpCooldownRemaining(phone, "login");
    if (cooldown > 0) {
      return res.status(429).json({ message: `Espera ${cooldown}s antes de solicitar otro código` });
    }

    const otp = await issueOtp(phone, "phone", "login");
    await recordAudit(req, { event: "otp_sent", provider: "phone", metadata: { phone: maskPhone(phone) } });

    return res.json({
      ok: true,
      sent: otp.sent,
      phone: maskPhone(phone),
      expiresAt: otp.expiresAt.toISOString(),
      ...(otp.devCode ? { devCode: otp.devCode } : {}),
    });
  } catch (error: any) {
    console.error("[auth/otp/phone/request] error:", error);
    return res.status(500).json({ message: "No se pudo enviar el código" });
  }
});

router.post("/otp/phone/verify", authLimiter, async (req, res) => {
  try {
    const parsed = z.object({ phone: z.string().min(6).max(30), code: otpCodeSchema }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos" });

    const phone = normalizePeruPhone(parsed.data.phone);
    if (!phone) return res.status(400).json({ message: "Número de teléfono inválido" });

    const result = await verifyOtp(phone, parsed.data.code, "login");
    if (!result.valid) {
      await recordAudit(req, { event: "otp_failed", provider: "phone", metadata: { reason: result.reason } });
      return res.status(401).json({ message: "Código inválido o expirado" });
    }

    let user = await findUserByPhone(phone);
    if (!user) {
      // Phone-only accounts still need an email; synthesize a stable placeholder.
      const placeholderEmail = `${phone.replace(/\D/g, "")}@phone.micita.pe`;
      user = await findOrCreateUser(placeholderEmail, "phone_otp", { name: `Usuario ${maskPhone(phone)}` });
    }
    await markPhoneVerified(user.id, phone);

    await recordAudit(req, { userId: user.id, event: "otp_verified", provider: "phone" });
    return establishSession(req, res, user.id, 200);
  } catch (error: any) {
    console.error("[auth/otp/phone/verify] error:", error);
    return res.status(500).json({ message: "No se pudo verificar el código" });
  }
});

// --- Password reset ----------------------------------------------------------
router.post("/password/forgot", otpLimiter, async (req, res) => {
  try {
    const parsed = z.object({ email: emailSchema }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Correo inválido" });

    const email = parsed.data.email.toLowerCase();
    const user = await findUserByEmail(email);

    // Always respond 200 to avoid account enumeration.
    if (user) {
      const token = generateOpaqueToken(32);
      const tokenHash = hashOpaqueToken(token);
      const expiresAt = new Date(Date.now() + config.auth.resetTokenTtlMinutes * 60 * 1000);
      await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });

      const resetUrl = `${config.appUrl.replace(/\/$/, "")}/reset-password?token=${token}`;
      await sendPasswordResetEmail(email, resetUrl, config.auth.resetTokenTtlMinutes).catch(() => undefined);
      await recordAudit(req, { userId: user.id, email, event: "password_reset_requested" });

      if (!config.isProduction && config.otp.exposeInResponse) {
        return res.json({ ok: true, devToken: token });
      }
    }
    return res.json({ ok: true });
  } catch (error: any) {
    console.error("[auth/password/forgot] error:", error);
    return res.status(500).json({ message: "No se pudo procesar la solicitud" });
  }
});

router.post("/password/reset", authLimiter, async (req, res) => {
  try {
    const parsed = z
      .object({ token: z.string().min(10), password: passwordSchema })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos" });

    const policy = validatePasswordStrength(parsed.data.password);
    if (!policy.valid) {
      return res.status(400).json({ message: "Contraseña débil", errors: { password: policy.errors } });
    }

    const tokenHash = hashOpaqueToken(parsed.data.token);
    const [record] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!record) return res.status(400).json({ message: "Token inválido o expirado" });

    await setUserPassword(record.userId, await hashPassword(parsed.data.password));
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));

    // Invalidate all existing sessions after a password change.
    await revokeAllUserTokens(record.userId);
    await recordAudit(req, { userId: record.userId, event: "password_reset_completed" });

    return res.json({ ok: true });
  } catch (error: any) {
    console.error("[auth/password/reset] error:", error);
    return res.status(500).json({ message: "No se pudo restablecer la contraseña" });
  }
});

router.post("/password/change", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = z
      .object({ currentPassword: z.string().min(1), newPassword: passwordSchema })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos" });

    const user = await findUserById(req.user!.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const ok = await verifyPassword(parsed.data.currentPassword, user.password);
    if (!ok) return res.status(401).json({ message: "Contraseña actual incorrecta" });

    const policy = validatePasswordStrength(parsed.data.newPassword);
    if (!policy.valid) {
      return res.status(400).json({ message: "Contraseña débil", errors: { password: policy.errors } });
    }

    await setUserPassword(user.id, await hashPassword(parsed.data.newPassword));
    await revokeAllUserTokens(user.id);
    await recordAudit(req, { userId: user.id, event: "password_changed" });
    return res.json({ ok: true });
  } catch (error: any) {
    console.error("[auth/password/change] error:", error);
    return res.status(500).json({ message: "No se pudo cambiar la contraseña" });
  }
});

// --- Session lifecycle -------------------------------------------------------
router.post("/refresh", async (req, res) => {
  try {
    const presented = req.cookies?.[config.auth.cookieName];
    if (!presented) return res.status(401).json({ message: "No hay sesión activa" });

    const result = await rotateRefreshToken(presented, {
      userAgent: req.headers["user-agent"] ?? null,
      ip: clientIp(req),
    });

    if (!result.ok) {
      clearRefreshCookie(res);
      await recordAudit(req, { event: "token_refresh_failed", metadata: { reason: result.reason } });
      return res.status(401).json({ message: "Sesión expirada", reason: result.reason });
    }

    const user = await findUserById(result.userId);
    if (!user) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    setRefreshCookie(res, result.refresh.token, result.refresh.expiresAt);
    await recordAudit(req, { userId: user.id, event: "token_refresh" });
    return res.json({ user: toPublicUser(user), accessToken: signAccessToken(user), expiresIn: config.auth.accessTokenTtl });
  } catch (error: any) {
    console.error("[auth/refresh] error:", error);
    return res.status(500).json({ message: "No se pudo renovar la sesión" });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const presented = req.cookies?.[config.auth.cookieName];
    if (presented) await revokeRefreshToken(presented);
    clearRefreshCookie(res);
    await recordAudit(req, { event: "logout" });
    return res.json({ ok: true });
  } catch (error: any) {
    clearRefreshCookie(res);
    return res.json({ ok: true });
  }
});

router.post("/logout-all", requireAuth, async (req: AuthenticatedRequest, res) => {
  await revokeAllUserTokens(req.user!.id);
  clearRefreshCookie(res);
  return res.json({ ok: true });
});

// --- Current user ------------------------------------------------------------
router.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.dbUser ?? (await findUserById(req.user!.id));
  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
  return res.json({ user: toPublicUser(user) });
});

router.get("/providers", requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await findUserById(req.user!.id);
  return res.json({
    hasPassword: Boolean(user?.password),
    googleEnabled: isGoogleConfigured(),
  });
});

export default router;
