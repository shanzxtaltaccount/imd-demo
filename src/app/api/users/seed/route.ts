import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api";

// IMPORTANT: Disable this route after initial setup by removing it
// or protecting it with a setup token.
const SETUP_TOKEN = process.env.SETUP_TOKEN;

export async function POST(req: NextRequest) {
  // This endpoint is disabled in production unless SETUP_TOKEN is set
  if (process.env.NODE_ENV === "production" && !SETUP_TOKEN) {
    return err("This endpoint is disabled.", 404);
  }

  const body = await req.json();

  if (SETUP_TOKEN && body.setupToken !== SETUP_TOKEN) {
    return err("Invalid setup token.", 403);
  }

  const { email, name, password, role } = body;

  if (!email || !name || !password) {
    return err("email, name, and password are required.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
        role: role === "ADMIN" ? "ADMIN" : "STAFF",
      },
      select: { id: true, email: true, name: true, role: true },
    });
    return ok(user, 201);
  } catch {
    return err("User with this email already exists.");
  }
}
