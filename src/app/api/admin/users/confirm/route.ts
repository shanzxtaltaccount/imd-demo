import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyOTP, checkOTPLockout, recordOTPFailure, clearOTPFailures } from "@/lib/otp";
import { ok, err, forbidden, serverError } from "@/lib/api";
import { z } from "zod";

const Schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const headersList = await headers();
    const currentUserId = headersList.get("x-user-id");
    if (!currentUserId) return forbidden();

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true },
    });
    if (!currentUser || currentUser.role !== "ADMIN") return forbidden();

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message);

    const { email, code } = parsed.data;

    if (checkOTPLockout(email, "EMAIL_VERIFY")) {
      return err("Too many failed attempts. Please resend OTP and try again.", 429);
    }

    const userId = await verifyOTP(email, code, "EMAIL_VERIFY");
    if (!userId) {
      recordOTPFailure(email, "EMAIL_VERIFY");
      return err("Invalid or expired OTP.", 400);
    }

    clearOTPFailures(email, "EMAIL_VERIFY");

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { emailVerified: true, isActive: true },
      });

      await tx.auditLog.create({
        data: {
          userId: currentUserId,
          action: "UPDATE",
          entityType: "User",
          entityId: userId,
          diff: {
            emailVerified: { from: false, to: true },
            isActive: { from: false, to: true },
          } as object,
        },
      });
    });

    return ok({ message: "User verified and activated." });
  } catch (e) {
    return serverError(e);
  }
}