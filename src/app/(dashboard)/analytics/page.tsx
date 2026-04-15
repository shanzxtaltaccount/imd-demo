"use client";

import { useState, useEffect } from "react";
import { CATEGORY_LABELS } from "@/lib/validations";
import { formatINR } from "@/lib/format";

interface AnalyticsData {
  summary: {
    todaySpend: number;
    todayCount: number;
    monthSpend: number;
    monthCount: number;
    totalSpend: number;
    totalEntries: number;
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
        {data.map((d) => {
          const pct = (d.total / max) * 100;
          return (
            <div
              key={d.date}
              className="spark-bar"
              style={{ height: `${Math.max(pct, 4)}%` }}
              title={`${d.date}: ${formatINR(d.total)}`}
            />
          );
        })}
      </div>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: 6,
        fontFamily: "var(--font-mono)",
        fontSize: "0.62rem",
        color: "var(--text-muted)",
      }}>
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
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
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

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((r) => {
        if (r.success) setData(r.data);
        else setError("Failed to load analytics.");
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const monthName = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <div className="subtitle">Spending overview · {monthName}</div>
        </div>
      </div>

      <div className="page-body">
        {loading && (
          <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
            Loading analytics…
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {data && (
          <>
            {/* Summary cards */}
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

            {/* Charts row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              {/* Daily spend sparkline */}
              <div className="chart-card">
                <div className="chart-title">Daily Spend — Last 30 Days</div>
                <SparklineChart data={data.dailySpend} />
              </div>

              {/* Top vendors */}
              <div className="chart-card">
                <div className="chart-title">Top Vendors — This Month</div>
                <HBarChart
                  items={data.topVendors.map((v) => ({ label: v.name, value: v.total }))}
                  max={Math.max(...data.topVendors.map((v) => v.total), 1)}
                />
              </div>
            </div>

            {/* Category spend */}
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
                        <span className="bar-label">
                          {CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] ?? c.category}
                        </span>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{ width: `${(c.total / maxVal) * 100}%`, background: "var(--navy-400)" }}
                          />
                        </div>
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
