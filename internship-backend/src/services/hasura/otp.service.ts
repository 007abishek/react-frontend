import crypto from "crypto";
import fs from "fs";
import nodemailer from "nodemailer";
import path from "path";
import db from "../../config/knex";

type VerifyResult = { success: boolean; message: string };

const DEFAULT_PURPOSE = "email_verification";
const OTP_TTL_MS = 10 * 60 * 1000; // 10 min
const MAX_ATTEMPTS = 5;
const HASH_ITERATIONS = 100_000;
const HASH_BYTES = 32;

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return defaultValue;
}

function normalizePurpose(purpose?: string): string {
  const normalized = (purpose ?? "").trim().toLowerCase();
  return normalized || DEFAULT_PURPOSE;
}

function makeSalt(): string {
  return crypto.randomBytes(16).toString("base64");
}

function hashOtp(code: string, salt: string): string {
  return crypto
    .pbkdf2Sync(code, salt, HASH_ITERATIONS, HASH_BYTES, "sha256")
    .toString("base64");
}

function timingSafeEqualBase64(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "base64");
  const bufB = Buffer.from(b, "base64");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

type OtpMailerEnv = {
  user: string;
  pass: string;
  host?: string;
  port?: number;
  secure?: boolean;
  tlsRejectUnauthorized: boolean;
  tlsCaFile?: string;
};

let cachedTransporter:
  | { key: string; transporter: nodemailer.Transporter }
  | undefined;

function resolvePathFromCwd(p: string): string {
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}

function readCaFileIfProvided(caFilePath: string | undefined): string | undefined {
  if (!caFilePath) return undefined;
  const resolved = resolvePathFromCwd(caFilePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`SMTP TLS CA file not found: ${resolved}`);
  }
  return fs.readFileSync(resolved, "utf8");
}

function getOtpMailerEnv(): OtpMailerEnv {
  const user = process.env.SMTP_USER ?? process.env.NODEMAILER_EMAIL;
  const pass = process.env.SMTP_PASS ?? process.env.NODEMAILER_PASS;
  if (!user || !pass) {
    throw new Error(
      "OTP email is not configured. Set NODEMAILER_EMAIL + NODEMAILER_PASS (or SMTP_USER + SMTP_PASS)."
    );
  }

  const isProduction = process.env.NODE_ENV === "production";

  const host = process.env.SMTP_HOST?.trim() || undefined;
  const portRaw = process.env.SMTP_PORT?.trim();
  const port =
    portRaw && /^\d+$/.test(portRaw) ? Number.parseInt(portRaw, 10) : undefined;

  const requestedRejectUnauthorized = parseBooleanEnv(
    process.env.SMTP_TLS_REJECT_UNAUTHORIZED,
    true
  );
  const tlsRejectUnauthorized = isProduction ? true : requestedRejectUnauthorized;
  if (isProduction && requestedRejectUnauthorized === false) {
    console.warn(
      "SMTP_TLS_REJECT_UNAUTHORIZED=false is ignored in production; forcing TLS certificate validation."
    );
  }

  const secureFromEnv = process.env.SMTP_SECURE;
  const secure =
    secureFromEnv !== undefined
      ? parseBooleanEnv(secureFromEnv, true)
      : port !== undefined
        ? port === 465
        : undefined;

  const tlsCaFile =
    process.env.SMTP_TLS_CA_FILE?.trim() ||
    process.env.NODEMAILER_TLS_CA_FILE?.trim() ||
    undefined;

  return { user, pass, host, port, secure, tlsRejectUnauthorized, tlsCaFile };
}

function getTransporter(): nodemailer.Transporter {
  const env = getOtpMailerEnv();
  const key = JSON.stringify(env);
  if (cachedTransporter?.key === key) return cachedTransporter.transporter;

  const tlsCa = readCaFileIfProvided(env.tlsCaFile);
  const tls = {
    rejectUnauthorized: env.tlsRejectUnauthorized,
    ...(tlsCa ? { ca: tlsCa } : {}),
  };

  const transporter = env.host
    ? nodemailer.createTransport({
        host: env.host,
        port: env.port ?? (env.secure === false ? 587 : 465),
        secure: env.secure ?? true,
        auth: { user: env.user, pass: env.pass },
        tls,
      })
    : nodemailer.createTransport({
        service: "gmail",
        auth: { user: env.user, pass: env.pass },
        tls,
      });

  cachedTransporter = { key, transporter };
  return transporter;
}

export function generateOTP(): string {
  // crypto.randomInt max is exclusive; use 1_000_000 to allow 999999
  return crypto.randomInt(100000, 1000000).toString();
}

export async function sendOTPEmail(
  email: string,
  purpose?: string
): Promise<{ expiresAt: Date }> {
  const mailerEnv = getOtpMailerEnv();
  const normalizedPurpose = normalizePurpose(purpose);
  const otp = generateOTP();
  const salt = makeSalt();
  const codeHash = hashOtp(otp, salt);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.transaction(async (trx) => {
    // Invalidate any previously issued, unconsumed OTPs for this email+purpose
    await trx("email_otps")
      .where({ email, purpose: normalizedPurpose })
      .whereNull("consumed_at")
      .update({ consumed_at: trx.fn.now() });

    await trx("email_otps").insert({
      email,
      purpose: normalizedPurpose,
      code_hash: codeHash,
      salt,
      attempts: 0,
      expires_at: expiresAt,
    });
  });

  await getTransporter().sendMail({
    from: `"Your App" <${process.env.MAIL_FROM ?? mailerEnv.user}>`,
    to: email,
    subject: "Your verification code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:12px;border:1px solid #e2e8f0;">
        <h2 style="color:#1e293b;margin-bottom:8px;">Verify your email</h2>
        <p style="color:#64748b;margin-bottom:24px;">
          Use the code below to complete your signup. Expires in <strong>10 minutes</strong>.
        </p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#10b981;text-align:center;padding:20px;background:#f0fdf4;border-radius:8px;">
          ${otp}
        </div>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;text-align:center;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  return { expiresAt };
}

export async function verifyOTP(
  email: string,
  inputOtp: string,
  purpose?: string
): Promise<VerifyResult> {
  const normalizedPurpose = normalizePurpose(purpose);

  return db.transaction(async (trx) => {
    const record = (await trx("email_otps")
      .where({ email, purpose: normalizedPurpose })
      .whereNull("consumed_at")
      .orderBy("created_at", "desc")
      .forUpdate()
      .first()) as
      | {
          id: number;
          code_hash: string;
          salt: string;
          attempts: number;
          expires_at: Date;
        }
      | undefined;

    if (!record) {
      return { success: false, message: "OTP not found. Please request a new one." };
    }

    const now = Date.now();
    const expiresAtMs = new Date(record.expires_at).getTime();
    if (now > expiresAtMs) {
      await trx("email_otps").where({ id: record.id }).update({ consumed_at: trx.fn.now() });
      return { success: false, message: "OTP has expired. Please request a new one." };
    }

    const nextAttempts = (record.attempts ?? 0) + 1;
    await trx("email_otps").where({ id: record.id }).update({ attempts: nextAttempts });

    if (nextAttempts > MAX_ATTEMPTS) {
      await trx("email_otps").where({ id: record.id }).update({ consumed_at: trx.fn.now() });
      return { success: false, message: "Too many attempts. Please request a new OTP." };
    }

    const expectedHash = record.code_hash;
    const actualHash = hashOtp(inputOtp, record.salt);
    if (!timingSafeEqualBase64(expectedHash, actualHash)) {
      return { success: false, message: "Incorrect OTP. Please try again." };
    }

    await trx("email_otps").where({ id: record.id }).update({ consumed_at: trx.fn.now() });
    return { success: true, message: "OTP verified successfully." };
  });
}
