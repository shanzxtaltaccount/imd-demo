import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyOTP } from "@/lib/otp";
import { ok, err, serverError } from "@/lib/api";
import { z } from "zod";

const Schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message);

    const { email, code, newPassword } = parsed.data;

    const userId = await verifyOTP(email, code, "PASSWORD_RESET");
    if (!userId) return err("Invalid or expired OTP.", 400);

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return ok({ message: "Password reset successfully. Please log in." });
  } catch (e) {
    return serverError(e);
  }
}
