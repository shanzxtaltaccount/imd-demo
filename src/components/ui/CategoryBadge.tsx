import { CATEGORY_LABELS } from "@/lib/validations";
import type { Category } from "@prisma/client";

const CATEGORY_COLORS: Record<string, string> = {
  OFFICE_SUPPLIES: "badge-blue",
  ELECTRONICS:     "badge-amber",
  FURNITURE:       "badge-gray",
  MAINTENANCE:     "badge-red",
  IT_EQUIPMENT:    "badge-amber",
  STATIONERY:      "badge-blue",
  INSTRUMENTS:     "badge-green",
  CONSUMABLES:     "badge-gray",
  OTHER:           "badge-gray",
};

export default function CategoryBadge({ category }: { category: Category | string }) {
  const color = CATEGORY_COLORS[category] ?? "badge-gray";
  const label = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category;
  return <span className={`badge ${color}`}>{label}</span>;
}
