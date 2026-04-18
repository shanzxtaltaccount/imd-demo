import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOTP, checkOTPLockout, recordOTPFailure, clearOTPFailures } from "@/lib/otp";
import { ok, err, serverError } from "@/lib/api";
import { z } from "zod";

const Schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message);

    const { email, code } = parsed.data;

    // 🔴 Fix #3: OTP brute-force lockout
    if (checkOTPLockout(email, "EMAIL_VERIFY")) {
      return err("Too many failed attempts. Please request a new OTP and try again.", 429);
    }

    const userId = await verifyOTP(email, code, "EMAIL_VERIFY");
    if (!userId) {
      recordOTPFailure(email, "EMAIL_VERIFY");
      return err("Invalid or expired OTP.", 400);
    }

    // Success — clear failure counter
    clearOTPFailures(email, "EMAIL_VERIFY");

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, isActive: true },
    });

    return ok({ message: "Email verified successfully." });
  } catch (e) {
    return serverError(e);
  }
}