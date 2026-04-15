"use client";

import CategoryBadge from "@/components/ui/CategoryBadge";
import { formatINR, formatDate } from "@/lib/format";

interface EntryDetailProps {
  entry: {
    id: string;
    itemName: string;
    quantity: number | string;
    unit: string;
    unitPrice: number | string;
    totalPrice: number | string;
    vendorName: string;
    purchaseDate: string | Date;
    invoiceNumber?: string | null;
    category: string;
    notes?: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    createdBy?: { name: string } | null;
  };
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, borderBottom: "1px solid var(--border)", padding: "9px 0" }}>
      <span style={{
        width: 130,
        flexShrink: 0,
        fontFamily: "var(--font-mono)",
        fontSize: "0.65rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        paddingTop: 2,
      }}>
        {label}
      </span>
      <span style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

export default function EntryDetailModal({ entry, onClose }: EntryDetailProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Entry Details</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <Row label="Item" value={entry.itemName} />
          <Row label="Quantity" value={`${entry.quantity} ${entry.unit}`} />
          <Row label="Unit Price" value={<span className="td-mono">{formatINR(Number(entry.unitPrice))}</span>} />
          <Row
            label="Total Price"
            value={
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--amber-400)" }}>
                {formatINR(Number(entry.totalPrice))}
              </span>
            }
          />
          <Row label="Vendor" value={entry.vendorName} />
          <Row label="Purchase Date" value={formatDate(entry.purchaseDate)} />
          <Row label="Category" value={<CategoryBadge category={entry.category} />} />
          {entry.invoiceNumber && <Row label="Invoice No." value={<span className="td-mono">{entry.invoiceNumber}</span>} />}
          {entry.notes && <Row label="Notes" value={<span style={{ whiteSpace: "pre-wrap" }}>{entry.notes}</span>} />}
          <Row label="Added By" value={entry.createdBy?.name ?? "—"} />
          <Row label="Created" value={<span className="td-mono">{formatDate(entry.createdAt)}</span>} />
          {entry.updatedAt !== entry.createdAt && (
            <Row label="Last Updated" value={<span className="td-mono">{formatDate(entry.updatedAt)}</span>} />
          )}
          <Row label="Entry ID" value={<span className="td-mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{entry.id}</span>} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
