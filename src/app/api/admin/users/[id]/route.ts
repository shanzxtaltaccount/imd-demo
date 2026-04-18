import { NextRequest } from "next/server";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ok, err, forbidden, notFound, serverError } from "@/lib/api";
import { z } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

const UpdateSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  password: z.string().min(8).optional(),
});

// PATCH /api/admin/users/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const role = headersList.get("x-user-role");
    const currentUserId = headersList.get("x-user-id");
    if (role !== "ADMIN") return forbidden();

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return notFound("User");

    if (id === currentUserId) return err("You cannot modify your own account.");

    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message);

    const updateData: Record<string, unknown> = {};
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
    if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
    if (parsed.data.password) {
      updateData.passwordHash = await bcrypt.hash(parsed.data.password, 12);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, isActive: true, emailVerified: true },
    });

    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

// DELETE /api/admin/users/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const role = headersList.get("x-user-role");
    const currentUserId = headersList.get("x-user-id");
    const adminEmail = headersList.get("x-user-email");
    if (role !== "ADMIN") return forbidden();

    // Cannot delete yourself
    if (id === currentUserId) return err("You cannot delete your own account.");

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return notFound("User");

    // Verify OTP
    const body = await req.json();
    const { code } = body;
    if (!code || typeof code !== "string" || code.length !== 6) {
      return err("Invalid OTP.");
    }

    // Find admin user id from email header
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail! },
      select: { id: true },
    });
    if (!adminUser) return forbidden();

    const token = await prisma.verificationToken.findFirst({
      where: {
        userId: adminUser.id,
        code,
        type: "EMAIL_VERIFY",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!token) return err("Invalid or expired OTP.", 400);

    // Mark OTP used
    await prisma.verificationToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });

    // Delete user's tokens and entries first, then user
    await prisma.verificationToken.deleteMany({ where: { userId: id } });
    await prisma.entry.deleteMany({ where: { createdById: id } });
    await prisma.user.delete({ where: { id } });

    return ok({ message: "User deleted." });
  } catch (e) {
    return serverError(e);
  }
}