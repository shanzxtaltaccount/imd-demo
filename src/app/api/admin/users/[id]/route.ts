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
    const currentUserId = headersList.get("x-user-id");
    if (!currentUserId) return forbidden();

    // 🔴 Fix #4: live DB role check
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true },
    });
    if (!currentUser || currentUser.role !== "ADMIN") return forbidden();

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

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerified: true,
        },
      });

      const diff: Record<string, unknown> = {};
      if (parsed.data.isActive !== undefined && parsed.data.isActive !== user.isActive) {
        diff.isActive = { from: user.isActive, to: parsed.data.isActive };
      }
      if (parsed.data.role !== undefined && parsed.data.role !== user.role) {
        diff.role = { from: user.role, to: parsed.data.role };
      }
      if (parsed.data.password) {
        diff.password = { from: "[redacted]", to: "[changed]" };
      }

      await tx.auditLog.create({
        data: {
          userId: currentUserId,
          action: "UPDATE",
          entityType: "User",
          entityId: id,
          diff: diff as object,
        },
      });

      return result;
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
    const currentUserId = headersList.get("x-user-id");
    const adminEmail = headersList.get("x-user-email");
    if (!currentUserId) return forbidden();

    // 🔴 Fix #4: live DB role check
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true },
    });
    if (!currentUser || currentUser.role !== "ADMIN") return forbidden();

    if (id === currentUserId) return err("You cannot delete your own account.");

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return notFound("User");

    const body = await req.json();
    const { code } = body;
    if (!code || typeof code !== "string" || code.length !== 6) {
      return err("Invalid OTP.");
    }

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

    await prisma.verificationToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });

    // Audit log written BEFORE deleting so the user record still exists
    await prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: "DELETE",
        entityType: "User",
        entityId: id,
        diff: {
          email: user.email,
          name: user.name,
          role: user.role,
        } as object,
      },
    });

    await prisma.verificationToken.deleteMany({ where: { userId: id } });
    await prisma.entry.deleteMany({ where: { createdById: id } });
    await prisma.user.delete({ where: { id } });

    return ok({ message: "User deleted." });
  } catch (e) {
    return serverError(e);
  }
}