import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, otpEmailHtml } from "@/lib/email";
import { createOTP } from "@/lib/otp";
import { ok, err, serverError, rateLimit } from "@/lib/api";
import { z } from "zod";
import { TokenType } from "@prisma/client";

const Schema = z.object({
  email: z.string().email(),
  type: z.enum(["EMAIL_VERIFY", "PASSWORD_RESET"]),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(ip, 3, 60_000)) {
    return err("Too many requests. Please wait a minute.", 429);
  }

  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message);

    const { email, type } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, name: true, email: true, isActive: true, emailVerified: true },
    });

    // For password reset: silently succeed even if user not found (prevent enumeration)
    if (!user || !user.isActive) {
      return ok({ message: "If this email exists, an OTP has been sent." });
    }

    const code = await createOTP(user.id, type as TokenType);
    const purpose = type === "EMAIL_VERIFY" ? "verify" : "reset";

    await sendEmail({
      to: user.email,
      subject: type === "EMAIL_VERIFY" ? "Verify your IMD Store Log email" : "Reset your IMD Store Log password",
      html: otpEmailHtml(code, purpose, user.name),
    });

    return ok({ message: "OTP sent successfully." });
  } catch (e) {
    return serverError(e);
  }
}
