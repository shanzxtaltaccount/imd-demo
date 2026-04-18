import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { EntryUpdateSchema } from "@/lib/validations";
import { ok, err, notFound, serverError } from "@/lib/api";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/entries/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const entry = await prisma.entry.findFirst({
      where: { id, isDeleted: false },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!entry) return notFound("Entry");
    return ok(entry);
  } catch (e) {
    return serverError(e);
  }
}

// PATCH /api/entries/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    if (!userId) return err("Unauthorized", 401);

    const existing = await prisma.entry.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) return notFound("Entry");

    const body = await req.json();
    const parsed = EntryUpdateSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message);

    const data = parsed.data;

    const newQty =
      data.quantity !== undefined ? data.quantity : Number(existing.quantity);
    const newUnitPrice =
      data.unitPrice !== undefined ? data.unitPrice : Number(existing.unitPrice);
    const totalPrice = Math.round(newQty * newUnitPrice * 100) / 100;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.entry.update({
        where: { id },
        data: {
          ...data,
          totalPrice,
          ...(data.purchaseDate && { purchaseDate: new Date(data.purchaseDate) }),
        },
      });

      const diff: Record<string, unknown> = {};
      const fields = Object.keys(data) as (keyof typeof data)[];
      for (const field of fields) {
        const before = existing[field as keyof typeof existing];
        const after = result[field as keyof typeof result];
        if (String(before) !== String(after)) {
          diff[field] = { from: before, to: after };
        }
      }
      if (data.quantity !== undefined || data.unitPrice !== undefined) {
        diff.totalPrice = {
          from: Number(existing.totalPrice),
          to: Number(result.totalPrice),
        };
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: "UPDATE",
          entityType: "Entry",
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

// DELETE /api/entries/[id] — SOFT DELETE ONLY
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    if (!userId) return err("Unauthorized", 401);

    const existing = await prisma.entry.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) return notFound("Entry");

    await prisma.$transaction(async (tx) => {
      await tx.entry.update({
        where: { id },
        data: { isDeleted: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "DELETE",
          entityType: "Entry",
          entityId: id,
          diff: {
            itemName: existing.itemName,
            totalPrice: Number(existing.totalPrice),
            vendorName: existing.vendorName,
          } as object,
        },
      });
    });

    return ok({ message: "Entry deleted successfully." });
  } catch (e) {
    return serverError(e);
  }
}