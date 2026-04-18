import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { EntryCreateSchema, EntryFilterSchema } from "@/lib/validations";
import { ok, err, serverError } from "@/lib/api";
import { Prisma } from "@prisma/client";

// GET /api/entries
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const parsed = EntryFilterSchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );
    if (!parsed.success) {
      return err(parsed.error.errors[0].message);
    }

    const { page, limit, category, vendor, from, to, search } = parsed.data;
    const skip = (page - 1) * limit;

    const where: Prisma.EntryWhereInput = {
      isDeleted: false,
      ...(category && { category }),
      ...(vendor && {
        vendorName: { contains: vendor, mode: "insensitive" },
      }),
      ...(from || to
        ? {
            purchaseDate: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to + "T23:59:59.999Z") }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { itemName: { contains: search, mode: "insensitive" } },
          { vendorName: { contains: search, mode: "insensitive" } },
          { invoiceNumber: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [entries, total] = await Promise.all([
      prisma.entry.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { purchaseDate: "desc" },
          { createdAt: "desc" },
        ],
        select: {
          id: true,
          itemName: true,
          quantity: true,
          unit: true,
          unitPrice: true,
          totalPrice: true,
          vendorName: true,
          purchaseDate: true,
          invoiceNumber: true,
          category: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          createdBy: { select: { id: true, name: true } },
        },
      }),
      prisma.entry.count({ where }),
    ]);

    return ok({
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    return serverError(e);
  }
}

// POST /api/entries
export async function POST(req: NextRequest) {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    if (!userId) return err("Unauthorized", 401);

    const body = await req.json();
    const parsed = EntryCreateSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.errors[0].message);
    }

    const data = parsed.data;
    const totalPrice = Math.round(data.quantity * data.unitPrice * 100) / 100;

    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.entry.create({
        data: {
          itemName: data.itemName,
          quantity: data.quantity,
          unit: data.unit,
          unitPrice: data.unitPrice,
          totalPrice,
          vendorName: data.vendorName,
          purchaseDate: new Date(data.purchaseDate),
          invoiceNumber: data.invoiceNumber ?? null,
          category: data.category,
          notes: data.notes ?? null,
          createdById: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "CREATE",
          entityType: "Entry",
          entityId: created.id,
          diff: {
            itemName: created.itemName,
            quantity: Number(created.quantity),
            unit: created.unit,
            unitPrice: Number(created.unitPrice),
            totalPrice: Number(created.totalPrice),
            vendorName: created.vendorName,
            purchaseDate: created.purchaseDate,
            category: created.category,
            invoiceNumber: created.invoiceNumber ?? null,
            notes: created.notes ?? null,
          } as object,
        },
      });

      return created;
    });

    return ok(entry, 201);
  } catch (e) {
    return serverError(e);
  }
}