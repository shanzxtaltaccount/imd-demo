import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { EntryUpdateSchema } from "@/lib/validations";
import { ok, err, notFound, serverError } from "@/lib/api";

interface Params {
  params: { id: string };
}

// GET /api/entries/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const entry = await prisma.entry.findFirst({
      where: { id: params.id, isDeleted: false },
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
    const headersList = headers();
    const userId = headersList.get("x-user-id");
    if (!userId) return err("Unauthorized", 401);

    const existing = await prisma.entry.findFirst({
      where: { id: params.id, isDeleted: false },
    });
    if (!existing) return notFound("Entry");

    const body = await req.json();
    const parsed = EntryUpdateSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message);

    const data = parsed.data;

    // Recalculate total if quantity or unitPrice changed
    const newQty =
      data.quantity !== undefined ? data.quantity : Number(existing.quantity);
    const newUnitPrice =
      data.unitPrice !== undefined
        ? data.unitPrice
        : Number(existing.unitPrice);
    const totalPrice = Math.round(newQty * newUnitPrice * 100) / 100;

    const updated = await prisma.entry.update({
      where: { id: params.id },
      data: {
        ...data,
        totalPrice,
        ...(data.purchaseDate && { purchaseDate: new Date(data.purchaseDate) }),
      },
    });

    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

// DELETE /api/entries/[id] — SOFT DELETE ONLY
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const headersList = headers();
    const userId = headersList.get("x-user-id");
    if (!userId) return err("Unauthorized", 401);

    const existing = await prisma.entry.findFirst({
      where: { id: params.id, isDeleted: false },
    });
    if (!existing) return notFound("Entry");

    await prisma.entry.update({
      where: { id: params.id },
      data: { isDeleted: true },
    });

    return ok({ message: "Entry deleted successfully." });
  } catch (e) {
    return serverError(e);
  }
}
