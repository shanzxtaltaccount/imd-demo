import { NextRequest } from "next/server";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail, otpEmailHtml } from "@/lib/email";
import { createOTP } from "@/lib/otp";
import { ok, err, forbidden, serverError } from "@/lib/api";
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "STAFF"]).default("STAFF"),
});

// GET /api/admin/users - list all users
export async function GET(_req: NextRequest) {
  try {
    const headersList = await headers();
    const role = headersList.get("x-user-role");
    if (role !== "ADMIN") return forbidden();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return ok(users);
  } catch (e) {
    return serverError(e);
  }
}

// POST /api/admin/users - create user and send verification email
export async function POST(req: NextRequest) {
  try {
    const headersList = await headers();
    const role = headersList.get("x-user-role");
    if (role !== "ADMIN") return forbidden();

    const body = await req.json();
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message);

    const { email, name, password, role: userRole } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) return err("A user with this email already exists.");

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
        role: userRole,
        isActive: false,
        emailVerified: false,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    // Send verification email
    try {
      const code = await createOTP(user.id, "EMAIL_VERIFY");
      await sendEmail({
        to: user.email,
        subject: "Welcome to IMD Store Log — Verify your email",
        html: otpEmailHtml(code, "verify", user.name),
      });
    } catch (emailErr) {
      console.error("[Email Error]", emailErr);
      // Don't fail user creation if email fails
    }

    return ok(user, 201);
  } catch (e) {
    return serverError(e);
  }
}
