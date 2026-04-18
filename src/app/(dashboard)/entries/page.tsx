"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import EntryFormModal from "@/components/entries/EntryFormModal";
import EntryDetailModal from "@/components/entries/EntryDetailModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CategoryBadge from "@/components/ui/CategoryBadge";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/validations";
import { formatINR, formatDate } from "@/lib/format";

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

function EntriesContent() {
  const { toast } = useToast();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [viewEntry, setViewEntry] = useState<Entry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchEntries = useCallback(async (params: {
    page: number; search: string; category: string; from: string; to: string;
  }) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(params.page), limit: "25",
        ...(params.search && { search: params.search }),
        ...(params.category && { category: params.category }),
        ...(params.from && { from: params.from }),
        ...(params.to && { to: params.to }),
      });
      const res = await fetch(`/api/entries?${qs}`);
      const data = await res.json();
      if (data.success) { setEntries(data.data.entries); setPagination(data.data.pagination); }
    } catch { toast("Failed to load entries.", "error"); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchEntries({ page, search, category, from, to });
    }, search ? 350 : 0);
    return () => clearTimeout(searchTimerRef.current);
  }, [page, search, category, from, to, fetchEntries]);

  function handleFilterChange() { setPage(1); }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      toast("Entry deleted.");
      fetchEntries({ page, search, category, from, to });
    } catch { toast("Failed to delete entry.", "error"); }
    finally { setDeleteId(null); }
  }

  function onFormSuccess() {
    setShowForm(false); setEditEntry(null);
    toast(editEntry ? "Entry updated." : "Entry added.");
    fetchEntries({ page, search, category, from, to });
  }

  async function handleDownloadPDF() {
    setPdfLoading(true);
    setPdfProgress("Starting…");
    const BATCH_SIZE = 500;
    let allEntries: Entry[] = [];
    let currentPage = 1;
    let totalPages = 1;
    let totalCount = 0;

    try {
      do {
        const qs = new URLSearchParams({
          page: String(currentPage),
          limit: String(BATCH_SIZE),
          ...(search && { search }),
          ...(category && { category }),
          ...(from && { from }),
          ...(to && { to }),
        });
        const res = await fetch(`/api/entries?${qs}`);
        const data = await res.json();
        if (!data.success) { toast("Failed to fetch entries for PDF.", "error"); return; }
        allEntries = [...allEntries, ...data.data.entries];
        totalPages = data.data.pagination.totalPages;
        totalCount = data.data.pagination.total;
        setPdfProgress(`Fetching ${Math.min(currentPage * BATCH_SIZE, totalCount)} of ${totalCount}…`);
        currentPage++;
      } while (currentPage <= totalPages);

      setPdfProgress("Generating PDF…");

      const total = allEntries.reduce((sum, e) => sum + Number(e.totalPrice), 0);
      const now = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
      const filterDesc = [
        search && `Search: "${search}"`,
        category && `Category: ${CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}`,
        from && `From: ${from}`,
        to && `To: ${to}`,
      ].filter(Boolean).join(" · ") || "All entries";

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>IMD Store Log — Purchase Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'IBM Plex Sans', sans-serif; font-size: 11px; color: #1a1a2e; background: white; padding: 32px; }
    .header { border-bottom: 2px solid #1a1a2e; padding-bottom: 16px; margin-bottom: 20px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .org { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: #666; font-family: 'IBM Plex Mono', monospace; }
    .title { font-size: 20px; font-weight: 600; margin: 4px 0 2px; }
    .subtitle { font-size: 10px; color: #555; font-family: 'IBM Plex Mono', monospace; }
    .date { font-size: 9px; color: #888; font-family: 'IBM Plex Mono', monospace; text-align: right; }
    .filters { font-size: 9px; color: #666; font-family: 'IBM Plex Mono', monospace; margin-bottom: 16px; padding: 8px 10px; background: #f5f5f5; border-left: 3px solid #c8a84b; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1a1a2e; color: white; }
    th { padding: 7px 8px; text-align: left; font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; font-family: 'IBM Plex Mono', monospace; }
    th.right { text-align: right; }
    td { padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    .mono { font-family: 'IBM Plex Mono', monospace; font-size: 10px; }
    .amount { text-align: right; font-family: 'IBM Plex Mono', monospace; }
    .category { font-size: 9px; background: #e8eaf0; padding: 2px 6px; border-radius: 3px; font-family: 'IBM Plex Mono', monospace; display: inline-block; }
    .total-row { background: #1a1a2e !important; }
    .total-row td { color: white; font-weight: 600; border-bottom: none; background: #1a1a2e !important; }
    .total-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.08em; }
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; }
    .stamp { font-size: 8px; color: #aaa; font-family: 'IBM Plex Mono', monospace; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div>
        <div class="org">Government of India · Indian Meteorological Department · Pune Region</div>
        <div class="title">Purchase Log Report</div>
        <div class="subtitle">Store Log System — Official Record</div>
      </div>
      <div class="date">Generated: ${now}<br/>Total Records: ${allEntries.length}</div>
    </div>
  </div>
  <div class="filters">Filter: ${filterDesc}</div>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Item</th><th>Category</th><th>Qty</th>
        <th class="right">Unit Price</th><th class="right">Total</th>
        <th>Vendor</th><th>Invoice</th><th>By</th>
      </tr>
    </thead>
    <tbody>
      ${allEntries.map(e => `
        <tr>
          <td class="mono">${formatDate(e.purchaseDate)}</td>
          <td style="font-weight:500;max-width:140px">${e.itemName}</td>
          <td><span class="category">${CATEGORY_LABELS[e.category as keyof typeof CATEGORY_LABELS] ?? e.category}</span></td>
          <td class="mono">${e.quantity} ${e.unit}</td>
          <td class="amount">${formatINR(Number(e.unitPrice))}</td>
          <td class="amount">${formatINR(Number(e.totalPrice))}</td>
          <td style="max-width:120px">${e.vendorName}</td>
          <td class="mono" style="font-size:9px;color:#888">${e.invoiceNumber ?? "—"}</td>
          <td style="color:#666">${e.createdBy?.name?.split(" ")[0] ?? "—"}</td>
        </tr>
      `).join("")}
      <tr class="total-row">
        <td colspan="5" class="total-label">GRAND TOTAL</td>
        <td class="amount">${formatINR(total)}</td>
        <td colspan="3"></td>
      </tr>
    </tbody>
  </table>
  <div class="footer">
    <span class="stamp">RESTRICTED · INDIAN METEOROLOGICAL DEPARTMENT · PUNE REGION</span>
    <span class="stamp">System-generated report from IMD Store Log System</span>
  </div>
</body>
</html>`;

      const win = window.open("", "_blank");
      if (!win) { toast("Please allow popups to download PDF.", "error"); return; }
      win.document.write(html);
      win.document.close();
      win.onload = () => { win.print(); };

    } catch { toast("Failed to generate PDF.", "error"); }
    finally { setPdfLoading(false); setPdfProgress(null); }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Purchase Log</h1>
          <div className="subtitle">{pagination.total} record{pagination.total !== 1 ? "s" : ""} total</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleDownloadPDF} disabled={pdfLoading}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {pdfLoading ? (pdfProgress ?? "Preparing…") : "Download PDF"}
          </button>
          <button className="btn btn-primary" onClick={() => { setEditEntry(null); setShowForm(true); }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Entry
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="filter-bar">
          <input className="form-input" placeholder="Search item / vendor / invoice…" value={search}
            onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }} style={{ minWidth: 220 }} />
          <select className="form-select" value={category}
            onChange={(e) => { setCategory(e.target.value); handleFilterChange(); }}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <input type="date" className="form-input" value={from}
            onChange={(e) => { setFrom(e.target.value); handleFilterChange(); }} title="From date" style={{ width: 150 }} />
          <input type="date" className="form-input" value={to}
            onChange={(e) => { setTo(e.target.value); handleFilterChange(); }} title="To date" style={{ width: 150 }} />
          {(search || category || from || to) && (
            <button className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(""); setCategory(""); setFrom(""); setTo(""); setPage(1); }}>
              Clear
            </button>
          )}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Item</th><th>Category</th><th>Qty</th>
                <th style={{ textAlign: "right" }}>Unit Price</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Vendor</th><th>Invoice</th><th>By</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row"><td colSpan={10}>Loading…</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={10}>
                  <div className="empty-state"><div className="empty-icon">📋</div><p>No entries found.</p></div>
                </td></tr>
              ) : entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="td-mono">{formatDate(entry.purchaseDate)}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm"
                      style={{ padding: "2px 0", textAlign: "left", fontWeight: 500, color: "var(--text-primary)" }}
                      onClick={() => setViewEntry(entry)}>
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
                      <button className="btn btn-ghost btn-sm" title="Edit"
                        onClick={() => { setEditEntry(entry); setShowForm(true); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button className="btn btn-danger btn-sm" title="Delete" onClick={() => setDeleteId(entry.id)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="pagination">
            <span className="page-info">Page {pagination.page} of {pagination.totalPages} · {pagination.total} entries</span>
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {showForm && <EntryFormModal entry={editEntry} onSuccess={onFormSuccess} onClose={() => { setShowForm(false); setEditEntry(null); }} />}
      {viewEntry && <EntryDetailModal entry={viewEntry} onClose={() => setViewEntry(null)} />}
      {deleteId && (
        <ConfirmDialog
          message="Are you sure you want to delete this entry? This action can be reversed by the administrator."
          confirmLabel="Delete Entry" danger
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </>
  );
}

export default function EntriesPage() {
  return <ToastProvider><EntriesContent /></ToastProvider>;
}