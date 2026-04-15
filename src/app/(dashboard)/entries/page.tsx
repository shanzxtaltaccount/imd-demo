"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import EntryFormModal from "@/components/entries/EntryFormModal";
import EntryDetailModal from "@/components/entries/EntryDetailModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CategoryBadge from "@/components/ui/CategoryBadge";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/validations";
import { formatINR, formatDate } from "@/lib/format";

// ── Types ──────────────────────────────────────────────────
interface Entry {
  id: string;
  itemName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  totalPrice: string;
  vendorName: string;
  purchaseDate: string;
  invoiceNumber?: string | null;
  category: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Inner component (has access to toast context) ──────────
function EntriesContent() {
  const { toast } = useToast();

  // Data
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [viewEntry, setViewEntry] = useState<Entry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchEntries = useCallback(async (params: {
    page: number;
    search: string;
    category: string;
    from: string;
    to: string;
  }) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(params.page),
        limit: "25",
        ...(params.search && { search: params.search }),
        ...(params.category && { category: params.category }),
        ...(params.from && { from: params.from }),
        ...(params.to && { to: params.to }),
      });

      const res = await fetch(`/api/entries?${qs}`);
      const data = await res.json();

      if (data.success) {
        setEntries(data.data.entries);
        setPagination(data.data.pagination);
      }
    } catch {
      toast("Failed to load entries.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Re-fetch when filters change (debounce search)
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchEntries({ page, search, category, from, to });
    }, search ? 350 : 0);
    return () => clearTimeout(searchTimerRef.current);
  }, [page, search, category, from, to, fetchEntries]);

  function handleFilterChange() {
    setPage(1); // reset to page 1 on filter change
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      toast("Entry deleted.");
      fetchEntries({ page, search, category, from, to });
    } catch {
      toast("Failed to delete entry.", "error");
    } finally {
      setDeleteId(null);
    }
  }

  function onFormSuccess() {
    setShowForm(false);
    setEditEntry(null);
    toast(editEntry ? "Entry updated." : "Entry added.");
    fetchEntries({ page, search, category, from, to });
  }

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Purchase Log</h1>
          <div className="subtitle">
            {pagination.total} record{pagination.total !== 1 ? "s" : ""} total
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setEditEntry(null); setShowForm(true); }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Entry
        </button>
      </div>

      {/* Body */}
      <div className="page-body">
        {/* Filters */}
        <div className="filter-bar">
          <input
            className="form-input"
            placeholder="Search item / vendor / invoice…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
            style={{ minWidth: 220 }}
          />
          <select
            className="form-select"
            value={category}
            onChange={(e) => { setCategory(e.target.value); handleFilterChange(); }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <input
            type="date"
            className="form-input"
            value={from}
            onChange={(e) => { setFrom(e.target.value); handleFilterChange(); }}
            title="From date"
            style={{ width: 150 }}
          />
          <input
            type="date"
            className="form-input"
            value={to}
            onChange={(e) => { setTo(e.target.value); handleFilterChange(); }}
            title="To date"
            style={{ width: 150 }}
          />
          {(search || category || from || to) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch(""); setCategory(""); setFrom(""); setTo("");
                setPage(1);
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Category</th>
                <th>Qty</th>
                <th style={{ textAlign: "right" }}>Unit Price</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Vendor</th>
                <th>Invoice</th>
                <th>By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row">
                  <td colSpan={10}>Loading…</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state">
                      <div className="empty-icon">📋</div>
                      <p>No entries found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="td-mono">{formatDate(entry.purchaseDate)}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: "2px 0", textAlign: "left", fontWeight: 500, color: "var(--text-primary)" }}
                        onClick={() => setViewEntry(entry)}
                      >
                        {entry.itemName}
                      </button>
                    </td>
                    <td><CategoryBadge category={entry.category} /></td>
                    <td className="td-mono">{entry.quantity} {entry.unit}</td>
                    <td className="td-amount">{formatINR(Number(entry.unitPrice))}</td>
                    <td className="td-amount">{formatINR(Number(entry.totalPrice))}</td>
                    <td style={{ color: "var(--text-secondary)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.vendorName}
                    </td>
                    <td className="td-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      {entry.invoiceNumber ?? "—"}
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {entry.createdBy?.name?.split(" ")[0] ?? "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Edit"
                          onClick={() => { setEditEntry(entry); setShowForm(true); }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          title="Delete"
                          onClick={() => setDeleteId(entry.id)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <span className="page-info">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} entries
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <EntryFormModal
          entry={editEntry}
          onSuccess={onFormSuccess}
          onClose={() => { setShowForm(false); setEditEntry(null); }}
        />
      )}

      {viewEntry && (
        <EntryDetailModal
          entry={viewEntry}
          onClose={() => setViewEntry(null)}
        />
      )}

      {deleteId && (
        <ConfirmDialog
          message="Are you sure you want to delete this entry? This action can be reversed by the administrator."
          confirmLabel="Delete Entry"
          danger
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </>
  );
}

// ── Page export wraps with ToastProvider ───────────────────
export default function EntriesPage() {
  return (
    <ToastProvider>
      <EntriesContent />
    </ToastProvider>
  );
}
