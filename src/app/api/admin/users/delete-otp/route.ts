import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendEmail, otpEmailHtml } from "@/lib/email";
import { createOTP } from "@/lib/otp";
import { ok, err, forbidden, serverError } from "@/lib/api";

export async function POST(_req: NextRequest) {
  try {
    const headersList = await headers();
    const role = headersList.get("x-user-role");
    const adminEmail = headersList.get("x-user-email");
    const adminName = headersList.get("x-user-name");
    if (role !== "ADMIN") return forbidden();

    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail! },
      select: { id: true },
    });
    if (!adminUser) return forbidden();

    const code = await createOTP(adminUser.id, "EMAIL_VERIFY");
    await sendEmail({
      to: adminEmail!,
      subject: "IMD Store Log — Confirm User Deletion",
      html: otpEmailHtml(code, "verify", adminName ?? "Admin"),
    });

    return ok({ message: "OTP sent." });
  } catch (e) {
    return serverError(e);
  }
}