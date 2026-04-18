"use client";

import { useState, useEffect } from "react";
import { CATEGORY_LABELS } from "@/lib/validations";
import { formatINR } from "@/lib/format";

interface AnalyticsData {
  summary: {
    todaySpend: number; todayCount: number;
    monthSpend: number; monthCount: number;
    totalSpend: number; totalEntries: number;
  };
  categorySpend: { category: string; total: number }[];
  topVendors: { name: string; total: number; count: number }[];
  dailySpend: { date: string; total: number; count: number }[];
}

function SparklineChart({ data }: { data: { date: string; total: number }[] }) {
  if (data.length === 0) return <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>No data for this period</div>;
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div>
      <div className="sparkline">
        {data.map((d) => (
          <div key={d.date} className="spark-bar"
            style={{ height: `${Math.max((d.total / max) * 100, 4)}%` }}
            title={`${d.date}: ${formatINR(d.total)}`} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-muted)" }}>
        {data.length > 0 && <span>{data[0].date.slice(5)}</span>}
        {data.length > 1 && <span>{data[data.length - 1].date.slice(5)}</span>}
      </div>
    </div>
  );
}

function HBarChart({ items, max }: { items: { label: string; value: number }[]; max: number }) {
  if (items.length === 0) return <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>No data this month</div>;
  return (
    <div className="bar-chart">
      {items.map((item) => (
        <div key={item.label} className="bar-row">
          <span className="bar-label" title={item.label}>{item.label}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(item.value / max) * 100}%` }} /></div>
          <span className="bar-value">{formatINR(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((r) => { if (r.success) setData(r.data); else setError("Failed to load analytics."); })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const monthName = now.toLocaleString("en-IN", { month: "long", year: "numeric" });
  const today = now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  function handleDownloadPDF() {
    if (!data) return;
    setPdfLoading(true);

    const vendorRows = data.topVendors.map(v =>
      `<tr><td>${v.name}</td><td class="mono right">${v.count}</td><td class="mono right">${formatINR(v.total)}</td></tr>`
    ).join("");

    const categoryRows = data.categorySpend.map(c =>
      `<tr><td>${CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] ?? c.category}</td><td class="mono right">${formatINR(c.total)}</td></tr>`
    ).join("");

    const dailyMax = Math.max(...data.dailySpend.map(d => d.total), 1);
    const sparkBars = data.dailySpend.map(d => {
      const pct = Math.max((d.total / dailyMax) * 60, 2);
      return `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:2px;margin-right:2px">
        <div style="width:6px;height:${pct}px;background:#c8a84b;border-radius:1px" title="${d.date}: ${formatINR(d.total)}"></div>
      </div>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>IMD Store Log — Analytics Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'IBM Plex Sans', sans-serif; font-size: 11px; color: #1a1a2e; background: white; padding: 32px; }
    .header { border-bottom: 2px solid #1a1a2e; padding-bottom: 16px; margin-bottom: 24px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .org { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: #666; font-family: 'IBM Plex Mono', monospace; }
    .title { font-size: 20px; font-weight: 600; margin: 4px 0 2px; }
    .subtitle { font-size: 10px; color: #555; font-family: 'IBM Plex Mono', monospace; }
    .date { font-size: 9px; color: #888; font-family: 'IBM Plex Mono', monospace; text-align: right; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .card { border: 1px solid #ddd; border-radius: 4px; padding: 14px; }
    .card.accent { background: #1a1a2e; color: white; border-color: #1a1a2e; }
    .card-label { font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; font-family: 'IBM Plex Mono', monospace; color: #888; margin-bottom: 6px; }
    .card.accent .card-label { color: #c8a84b; }
    .card-value { font-size: 18px; font-weight: 600; font-family: 'IBM Plex Mono', monospace; margin-bottom: 3px; }
    .card-sub { font-size: 9px; color: #aaa; }
    .card.accent .card-sub { color: #888; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; font-family: 'IBM Plex Mono', monospace; color: #888; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1a1a2e; color: white; }
    th { padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; font-family: 'IBM Plex Mono', monospace; }
    td { padding: 6px 8px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) td { background: #fafafa; }
    .mono { font-family: 'IBM Plex Mono', monospace; font-size: 10px; }
    .right { text-align: right; }
    .spark-container { display: flex; align-items: flex-end; height: 70px; padding: 4px 0; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; }
    .stamp { font-size: 8px; color: #aaa; font-family: 'IBM Plex Mono', monospace; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div>
        <div class="org">Government of India · Indian Meteorological Department · Pune Region</div>
        <div class="title">Analytics Report</div>
        <div class="subtitle">Store Log System — Spending Overview · ${monthName}</div>
      </div>
      <div class="date">Generated: ${today}</div>
    </div>
  </div>

  <div class="cards">
    <div class="card accent">
      <div class="card-label">Today's Spend</div>
      <div class="card-value">${formatINR(data.summary.todaySpend)}</div>
      <div class="card-sub">${data.summary.todayCount} entries today</div>
    </div>
    <div class="card">
      <div class="card-label">This Month</div>
      <div class="card-value">${formatINR(data.summary.monthSpend)}</div>
      <div class="card-sub">${data.summary.monthCount} entries in ${monthName}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Spend</div>
      <div class="card-value">${formatINR(data.summary.totalSpend)}</div>
      <div class="card-sub">All time</div>
    </div>
    <div class="card">
      <div class="card-label">Total Entries</div>
      <div class="card-value">${data.summary.totalEntries.toLocaleString("en-IN")}</div>
      <div class="card-sub">Records in log</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Daily Spend — Last 30 Days</div>
    <div class="spark-container">${sparkBars}</div>
  </div>

  <div class="two-col">
    <div class="section">
      <div class="section-title">Top Vendors — This Month</div>
      <table>
        <thead><tr><th>Vendor</th><th>Entries</th><th>Total</th></tr></thead>
        <tbody>${vendorRows || '<tr><td colspan="3" style="color:#aaa;text-align:center;padding:12px">No data this month</td></tr>'}</tbody>
      </table>
    </div>
    <div class="section">
      <div class="section-title">Category Spend — This Month</div>
      <table>
        <thead><tr><th>Category</th><th>Total</th></tr></thead>
        <tbody>${categoryRows || '<tr><td colspan="2" style="color:#aaa;text-align:center;padding:12px">No data this month</td></tr>'}</tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    <span class="stamp">RESTRICTED · INDIAN METEOROLOGICAL DEPARTMENT · PUNE REGION</span>
    <span class="stamp">System-generated report from IMD Store Log System</span>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) { alert("Please allow popups to download PDF."); setPdfLoading(false); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); setPdfLoading(false); };
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <div className="subtitle">Spending overview · {monthName}</div>
        </div>
        {data && (
          <button className="btn btn-secondary" onClick={handleDownloadPDF} disabled={pdfLoading}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {pdfLoading ? "Preparing…" : "Download Report"}
          </button>
        )}
      </div>

      <div className="page-body">
        {loading && <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>Loading analytics…</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {data && (
          <>
            <div className="analytics-grid">
              <div className="stat-card accent-card">
                <div className="stat-label">Today's Spend</div>
                <div className="stat-value">{formatINR(data.summary.todaySpend)}</div>
                <div className="stat-sub">{data.summary.todayCount} entries today</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">This Month</div>
                <div className="stat-value">{formatINR(data.summary.monthSpend)}</div>
                <div className="stat-sub">{data.summary.monthCount} entries in {monthName}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Spend</div>
                <div className="stat-value">{formatINR(data.summary.totalSpend)}</div>
                <div className="stat-sub">All time</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Entries</div>
                <div className="stat-value">{data.summary.totalEntries.toLocaleString("en-IN")}</div>
                <div className="stat-sub">Records in log</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div className="chart-card">
                <div className="chart-title">Daily Spend — Last 30 Days</div>
                <SparklineChart data={data.dailySpend} />
              </div>
              <div className="chart-card">
                <div className="chart-title">Top Vendors — This Month</div>
                <HBarChart items={data.topVendors.map((v) => ({ label: v.name, value: v.total }))}
                  max={Math.max(...data.topVendors.map((v) => v.total), 1)} />
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-title">Category Spend — This Month</div>
              {data.categorySpend.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>No data this month</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
                  {data.categorySpend.map((c) => {
                    const maxVal = Math.max(...data.categorySpend.map((x) => x.total), 1);
                    return (
                      <div key={c.category} className="bar-row">
                        <span className="bar-label">{CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] ?? c.category}</span>
                        <div className="bar-track"><div className="bar-fill" style={{ width: `${(c.total / maxVal) * 100}%`, background: "var(--navy-400)" }} /></div>
                        <span className="bar-value">{formatINR(c.total)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}