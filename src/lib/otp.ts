import { prisma } from "@/lib/prisma";
import { TokenType } from "@prisma/client";

/** Generate a cryptographically random 6-digit OTP */
export function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1_000_000).padStart(6, "0");
}

/** Create OTP in DB, invalidating any previous unused tokens of the same type */
export async function createOTP(userId: string, type: TokenType): Promise<string> {
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate previous tokens of same type
  await prisma.verificationToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.verificationToken.create({
    data: { userId, code, type, expiresAt },
  });

  return code;
}

// ── OTP brute-force lockout ──────────────────────────────────────────────────
// Tracks failed attempts per (email, type) key in memory.
// Max 5 failed attempts before lockout. Resets on success or after 15 minutes.
// In-memory is fine: OTPs expire in 10 min; a redeploy clears state safely.
const otpFailStore = new Map<string, { attempts: number; lockedUntil: number }>();

const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function checkOTPLockout(email: string, type: TokenType): boolean {
  const key = `${email}:${type}`;
  const entry = otpFailStore.get(key);
  if (!entry) return false; // not locked
  if (Date.now() > entry.lockedUntil) {
    otpFailStore.delete(key);
    return false; // lockout expired
  }
  return entry.attempts >= MAX_OTP_ATTEMPTS;
}

export function recordOTPFailure(email: string, type: TokenType): number {
  const key = `${email}:${type}`;
  const entry = otpFailStore.get(key) ?? { attempts: 0, lockedUntil: 0 };
  entry.attempts += 1;
  entry.lockedUntil = Date.now() + OTP_LOCKOUT_MS;
  otpFailStore.set(key, entry);
  return entry.attempts;
}

export function clearOTPFailures(email: string, type: TokenType): void {
  otpFailStore.delete(`${email}:${type}`);
}

/** Verify OTP — returns userId on success, null on failure */
export async function verifyOTP(
  email: string,
  code: string,
  type: TokenType
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });

  if (!user) return null;

  const token = await prisma.verificationToken.findFirst({
    where: {
      userId: user.id,
      code,
      type,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!token) return null;

  // Mark as used
  await prisma.verificationToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });

  return user.id;
}