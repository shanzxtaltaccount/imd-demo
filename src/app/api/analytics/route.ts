import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/api";

export async function GET(_req: NextRequest) {
  try {
    const now = new Date();

    // IST offset = UTC+5:30 = 330 minutes
    const IST_OFFSET = 330 * 60 * 1000;
    const nowIST = new Date(now.getTime() + IST_OFFSET);

    // Today in IST as a date-only value (no time component)
    const todayIST = new Date(Date.UTC(
      nowIST.getUTCFullYear(),
      nowIST.getUTCMonth(),
      nowIST.getUTCDate()
    ));

    // Month start in IST
    const monthStartIST = new Date(Date.UTC(
      nowIST.getUTCFullYear(),
      nowIST.getUTCMonth(),
      1
    ));

    // Last 30 days from today IST
    const last30IST = new Date(todayIST);
    last30IST.setUTCDate(last30IST.getUTCDate() - 29);

    const [
      todaySpend, monthSpend, totalSpend, totalEntries,
      categorySpend, topVendors, dailySpend,
    ] = await Promise.all([
      prisma.entry.aggregate({
        where: { isDeleted: false, purchaseDate: { gte: todayIST } },
        _sum: { totalPrice: true }, _count: { id: true },
      }),
      prisma.entry.aggregate({
        where: { isDeleted: false, purchaseDate: { gte: monthStartIST } },
        _sum: { totalPrice: true }, _count: { id: true },
      }),
      prisma.entry.aggregate({
        where: { isDeleted: false },
        _sum: { totalPrice: true }, _count: { id: true },
      }),
      prisma.entry.count({ where: { isDeleted: false } }),
      prisma.entry.groupBy({
        by: ["category"],
        where: { isDeleted: false, purchaseDate: { gte: monthStartIST } },
        _sum: { totalPrice: true },
        orderBy: { _sum: { totalPrice: "desc" } },
      }),
      prisma.entry.groupBy({
        by: ["vendorName"],
        where: { isDeleted: false, purchaseDate: { gte: monthStartIST } },
        _sum: { totalPrice: true }, _count: { id: true },
        orderBy: { _sum: { totalPrice: "desc" } },
        take: 5,
      }),
      prisma.$queryRaw<{ date: string; total: number; count: number }[]>`
        SELECT
          TO_CHAR(purchase_date, 'YYYY-MM-DD') as date,
          SUM(total_price)::float as total,
          COUNT(id)::int as count
        FROM entries
        WHERE is_deleted = false
          AND purchase_date >= ${last30IST}
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