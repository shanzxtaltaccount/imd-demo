import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyOTP } from "@/lib/otp";
import { ok, err, forbidden, serverError } from "@/lib/api";
import { z } from "zod";

const Schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const headersList = await headers();
    const role = headersList.get("x-user-role");
    if (role !== "ADMIN") return forbidden();

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message);

    const { email, code } = parsed.data;

    const userId = await verifyOTP(email, code, "EMAIL_VERIFY");
    if (!userId) return err("Invalid or expired OTP.", 400);

    // Activate the user now that OTP is confirmed
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, isActive: true },
    });

    return ok({ message: "User verified and activated." });
  } catch (e) {
    return serverError(e);
  }
}