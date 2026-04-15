import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { LoginSchema } from "@/lib/validations";
import { ok, err, serverError, rateLimit } from "@/lib/api";

export async function POST(req: NextRequest) {
  // Rate limit: max 5 login attempts per minute per IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(ip, 5, 60_000)) {
    return err("Too many login attempts. Please wait a minute.", 429);
  }

  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return err(parsed.error.errors[0].message);
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        emailVerified: true,
        isActive: true,
      },
    });

    // Constant-time comparison even when user not found (prevent timing attacks)
    const dummyHash =
      "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345";
    const hashToCheck = user?.passwordHash ?? dummyHash;
    const passwordMatch = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordMatch || !user.isActive) {
      return err("Invalid email or password.", 401);
    }

    const token = await signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = ok({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: user.emailVerified },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return response;
  } catch (e) {
    return serverError(e);
  }
}
