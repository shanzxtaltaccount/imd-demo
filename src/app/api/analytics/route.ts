import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/api";
import { Prisma } from "@prisma/client";

export async function GET(_req: NextRequest) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const last30 = new Date(todayStart);
    last30.setDate(last30.getDate() - 29);

    // Run all queries in parallel
    const [
      todaySpend,
      monthSpend,
      totalSpend,
      totalEntries,
      categorySpend,
      topVendors,
      dailySpend,
    ] = await Promise.all([
      // Today's total
      prisma.entry.aggregate({
        where: { isDeleted: false, purchaseDate: { gte: todayStart } },
        _sum: { totalPrice: true },
        _count: { id: true },
      }),

      // This month's total
      prisma.entry.aggregate({
        where: { isDeleted: false, purchaseDate: { gte: monthStart } },
        _sum: { totalPrice: true },
        _count: { id: true },
      }),

      // All-time total
      prisma.entry.aggregate({
        where: { isDeleted: false },
        _sum: { totalPrice: true },
        _count: { id: true },
      }),

      // Total entries
      prisma.entry.count({ where: { isDeleted: false } }),

      // Category-wise spend (this month)
      prisma.entry.groupBy({
        by: ["category"],
        where: { isDeleted: false, purchaseDate: { gte: monthStart } },
        _sum: { totalPrice: true },
        orderBy: { _sum: { totalPrice: "desc" } },
      }),

      // Top 5 vendors (this month)
      prisma.entry.groupBy({
        by: ["vendorName"],
        where: { isDeleted: false, purchaseDate: { gte: monthStart } },
        _sum: { totalPrice: true },
        _count: { id: true },
        orderBy: { _sum: { totalPrice: "desc" } },
        take: 5,
      }),

      // Daily spend last 30 days
      prisma.$queryRaw<{ date: string; total: number; count: number }[]>`
        SELECT 
          TO_CHAR(purchase_date, 'YYYY-MM-DD') as date,
          SUM(total_price)::float as total,
          COUNT(id)::int as count
        FROM entries
        WHERE is_deleted = false
          AND purchase_date >= ${last30}
        GROUP BY purchase_date
        ORDER BY purchase_date ASC
      `,
    ]);

    return ok({
      summary: {
        todaySpend: Number(todaySpend._sum.totalPrice ?? 0),
        todayCount: todaySpend._count.id,
        monthSpend: Number(monthSpend._sum.totalPrice ?? 0),
        monthCount: monthSpend._count.id,
        totalSpend: Number(totalSpend._sum.totalPrice ?? 0),
        totalEntries,
      },
      categorySpend: categorySpend.map((c) => ({
        category: c.category,
        total: Number(c._sum.totalPrice ?? 0),
      })),
      topVendors: topVendors.map((v) => ({
        name: v.vendorName,
        total: Number(v._sum.totalPrice ?? 0),
        count: v._count.id,
      })),
      dailySpend: dailySpend.map((d) => ({
        date: d.date,
        total: Number(d.total),
        count: Number(d.count),
      })),
    });
  } catch (e) {
    return serverError(e);
  }
}
