import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOTP } from "@/lib/otp";
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

    const userId = await verifyOTP(email, code, "EMAIL_VERIFY");
    if (!userId) return err("Invalid or expired OTP.", 400);

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    return ok({ message: "Email verified successfully." });
  } catch (e) {
    return serverError(e);
  }
}
