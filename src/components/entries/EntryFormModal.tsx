"use client";

import { useState, useEffect, FormEvent } from "react";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/validations";
import { todayISO, toDateInputValue } from "@/lib/format";

interface EntryFormData {
  itemName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vendorName: string;
  purchaseDate: string;
  invoiceNumber: string;
  category: string;
  notes: string;
}

interface EntryFormProps {
  entry?: {
    id: string;
    itemName: string;
    quantity: number | string;
    unit: string;
    unitPrice: number | string;
    vendorName: string;
    purchaseDate: string | Date;
    invoiceNumber?: string | null;
    category: string;
    notes?: string | null;
  } | null;
  onSuccess: () => void;
  onClose: () => void;
}

const UNITS = ["nos", "pcs", "kg", "g", "L", "mL", "m", "box", "set", "pair", "roll", "packet"];

const EMPTY: EntryFormData = {
  itemName: "",
  quantity: "",
  unit: "nos",
  unitPrice: "",
  vendorName: "",
  purchaseDate: todayISO(),
  invoiceNumber: "",
  category: "OFFICE_SUPPLIES",
  notes: "",
};

export default function EntryFormModal({ entry, onSuccess, onClose }: EntryFormProps) {
  const isEdit = !!entry;
  const [form, setForm] = useState<EntryFormData>(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entry) {
      setForm({
        itemName: entry.itemName,
        quantity: String(entry.quantity),
        unit: entry.unit,
        unitPrice: String(entry.unitPrice),
        vendorName: entry.vendorName,
        purchaseDate: toDateInputValue(entry.purchaseDate),
        invoiceNumber: entry.invoiceNumber ?? "",
        category: entry.category,
        notes: entry.notes ?? "",
      });
    }
  }, [entry]);

  function set(field: keyof EntryFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const computedTotal =
    form.quantity && form.unitPrice
      ? (parseFloat(form.quantity) * parseFloat(form.unitPrice)).toFixed(2)
      : "—";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      itemName: form.itemName.trim(),
      quantity: parseFloat(form.quantity),
      unit: form.unit,
      unitPrice: parseFloat(form.unitPrice),
      vendorName: form.vendorName.trim(),
      purchaseDate: form.purchaseDate,
      invoiceNumber: form.invoiceNumber.trim() || null,
      category: form.category,
      notes: form.notes.trim() || null,
    };

    try {
      const url = isEdit ? `/api/entries/${entry!.id}` : "/api/entries";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Failed to save entry.");
        return;
      }

      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? "Edit Entry" : "New Purchase Entry"}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Item Name *</label>
              <input
                className="form-input"
                value={form.itemName}
                onChange={(e) => set("itemName", e.target.value)}
                placeholder="e.g. A4 Paper Ream"
                required
                maxLength={200}
              />
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  placeholder="0"
                  required
                  min="0.001"
                  step="any"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-select" value={form.unit} onChange={(e) => set("unit", e.target.value)}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Unit Price (₹) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.unitPrice}
                  onChange={(e) => set("unitPrice", e.target.value)}
                  placeholder="0.00"
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>

            <div style={{
              background: "var(--navy-950)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "8px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Total Price
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", fontWeight: 600, color: "var(--amber-400)" }}>
                ₹ {computedTotal}
              </span>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Vendor Name *</label>
                <input
                  className="form-input"
                  value={form.vendorName}
                  onChange={(e) => set("vendorName", e.target.value)}
                  placeholder="e.g. Rathi Stationery"
                  required
                  maxLength={200}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Purchase Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.purchaseDate}
                  onChange={(e) => set("purchaseDate", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-select"
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  required
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Invoice No. (optional)</label>
                <input
                  className="form-input"
                  value={form.invoiceNumber}
                  onChange={(e) => set("invoiceNumber", e.target.value)}
                  placeholder="INV-2024-001"
                  maxLength={100}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-textarea"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Any additional remarks..."
                maxLength={1000}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving…" : isEdit ? "Update Entry" : "Add Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
