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
