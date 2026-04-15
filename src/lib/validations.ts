import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const CATEGORIES = [
  "OFFICE_SUPPLIES",
  "ELECTRONICS",
  "FURNITURE",
  "MAINTENANCE",
  "IT_EQUIPMENT",
  "STATIONERY",
  "INSTRUMENTS",
  "CONSUMABLES",
  "OTHER",
] as const;

export const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  OFFICE_SUPPLIES: "Office Supplies",
  ELECTRONICS: "Electronics",
  FURNITURE: "Furniture",
  MAINTENANCE: "Maintenance",
  IT_EQUIPMENT: "IT Equipment",
  STATIONERY: "Stationery",
  INSTRUMENTS: "Instruments",
  CONSUMABLES: "Consumables",
  OTHER: "Other",
};

export const EntryCreateSchema = z.object({
  itemName: z
    .string()
    .min(2, "Item name too short")
    .max(200, "Item name too long"),
  quantity: z
    .number()
    .positive("Quantity must be positive")
    .max(99999, "Quantity too large"),
  unit: z.string().min(1).max(20).default("nos"),
  unitPrice: z
    .number()
    .positive("Unit price must be positive")
    .max(9999999, "Price too large"),
  vendorName: z
    .string()
    .min(2, "Vendor name too short")
    .max(200, "Vendor name too long"),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  invoiceNumber: z.string().max(100).optional().nullable(),
  category: z.enum(CATEGORIES),
  notes: z.string().max(1000).optional().nullable(),
});

export const EntryUpdateSchema = EntryCreateSchema.partial();

export const EntryFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(10).max(100).default(25),
  category: z.enum(CATEGORIES).optional(),
  vendor: z.string().max(200).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().max(100).optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type EntryCreateInput = z.infer<typeof EntryCreateSchema>;
export type EntryUpdateInput = z.infer<typeof EntryUpdateSchema>;
export type EntryFilterInput = z.infer<typeof EntryFilterSchema>;
