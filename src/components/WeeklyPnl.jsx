import React, { useState, useMemo } from "react";
import {
  TrendingUp, ChevronRight, ChevronLeft, Download, Trash2, RefreshCw,
  AlertTriangle, Check, History,
} from "lucide-react";
import {
  BUCKETS, loadWeeks, saveWeek, deleteWeek, mondayOf, weekLabel,
  stockForWeek, purchasesForWeek, calculate, money, money2, pct1,
} from "../data/pnl";

const blankWeek = (weekStart) => ({
  weekStart,
  tradingDays: 7,
  notes: "",
  sales: "",
  opening: "",
  closing: "",
  purchases: Object.fromEntries(BUCKETS.map((b) => [b.id, ""])),
  labour: "",
  fixed: "",
});

export default function WeeklyPnl({ onBack }) {
  const [weeks, setWeeks] = useState(() => loadWeeks());
  const [current, setCurrent] = useState(() => {
    const thisWeek = mondayOf().toLocaleDateString("en-CA");
    return loadWeeks().find((w) => w.weekStart === thisWeek) || blankWeek(thisWeek);
  });
  const [screen, setScreen] = useState("edit"); // edit | history
  const [pulled, setPulled] = useState("");
  const [saved, setSaved] = useState("");       // "" | "yes" | "no"
  const [dirty, setDirty] = useState(false);

  const calc = useMemo(() => calculate(current), [current]);
  const labourPct = calc.sales > 0 ? (calc.labour / calc.sales) * 100 : 0;

  const set = (k, v) => {
    setCurrent((p) => ({ ...p, [k]: v }));
    setDirty(true);
    setSaved("");
  };
  const setPurchase = (id, v) => {
    setCurrent((p) => ({ ...p, purchases: { ...p.purchases, [id]: v } }));
    setDirty(true);
    setSaved("");
  };

  const shiftWeek = (dir) => {
    if (dirty && !window.confirm("You have unsaved changes. Leave this week anyway?")) return;
    const d = new Date(current.weekStart);
    d.setDate(d.getDate() + dir * 7);
    const key = d.toLocaleDateString("en-CA");
    setCurrent(weeks.find((w) => w.weekStart === key) || blankWeek(key));
    setPulled("");
    setSaved("");
    setDirty(false);
  };

  // Pull stock + purchases straight from the app's own records
  const autofill = () => {
    const stock = stockForWeek(current.weekStart);
    const { totals, matched } = purchasesForWeek(current.weekStart);

    setCurrent((p) => ({
      ...p,
      opening: stock.opening != null ? stock.opening.toFixed(2) : p.opening,
      closing: stock.closing != null ? stock.closing.toFixed(2) : p.closing,
      purchases: Object.fromEntries(
        BUCKETS.map((b) => [b.id, totals[b.id] ? totals[b.id].toFixed(2) : p.purchases[b.id]])
      ),
    }));
    setDirty(true);
    setSaved("");

    const bits = [];
    if (stock.opening != null) bits.push("opening stock");
    if (stock.closing != null) bits.push("closing stock");
    if (matched.length) bits.push(`${matched.length} invoice${matched.length === 1 ? "" : "s"}`);
    setPulled(bits.length ? `Filled in ${bits.join(", ")}.` : "Nothing found for this week.");
    setTimeout(() => setPulled(""), 6000);
  };

  const save = () => {
    const next = saveWeek(current);
    setWeeks(next);

    // Confirm the week actually landed in storage rather than assuming
    const ok = next.some((w) => w.weekStart === current.weekStart);
    setSaved(ok ? "yes" : "no");
    if (ok) setDirty(false);
    setTimeout(() => setSaved(""), 3500);
  };

  const exportWeek = async () => {
    const XLSX = await import("xlsx");
    const c = calc;
    const rows = [
      ["WEEKLY P&L SNAPSHOT", ""],
      ["Week Start (Mon)", current.weekStart],
      ["Week End (Sun)", new Date(new Date(current.weekStart).getTime() + 6 * 864e5).toLocaleDateString("en-CA")],
      ["Trading Days", current.tradingDays],
      ["Notes", current.notes],
      ["", ""],
      ["SALES", ""],
      ["Total Weekly Sales", c.sales],
      ["", ""],
      ["COST OF GOODS SOLD (COGS)", ""],
      ["Opening Stock", c.opening],
      ...BUCKETS.map((b) => [`Purchases – ${b.label}`, Number(current.purchases[b.id]) || 0]),
      ["Total Purchases", c.purchases],
      ["Closing Stock", c.closing],
      ["WEEKLY COGS", c.cogs],
      ["COGS %", c.cogsPct / 100],
      ["", ""],
      ["GROSS PROFIT", ""],
      ["Gross Profit", c.gross],
      ["Gross Margin %", c.grossPct / 100],
      ["", ""],
      ["LABOUR", ""],
      ["Total Labour", c.labour],
      ["Labour %", labourPct / 100],
      ["", ""],
      ["WEEKLY FIXED COST (OPTIONAL)", ""],
      ["Weekly Fixed Cost Allowance", c.fixed],
      ["", ""],
      ["WEEKLY PROFIT", ""],
      ["Operating Profit (Sales-COGS-Labour)", c.operating],
      ["Estimated Net Profit (after fixed cost)", c.net],
      ["Net Profit %", c.netPct / 100],
      ["", ""],
      ["KEY KPI", ""],
      ["Prime Cost % (COGS + Labour)", c.primeCostPct / 100],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 38 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weekly P&L");
    XLSX.writeFile(wb, `rooster-pnl-${current.weekStart}.xlsx`);
  };

  const exportAll = async () => {
    const XLSX = await import("xlsx");
    const rows = weeks.map((w) => {
      const c = calculate(w);
      return {
        "Week start": w.weekStart,
        Sales: c.sales,
        "Opening stock": c.opening,
        Purchases: c.purchases,
        "Closing stock": c.closing,
        COGS: c.cogs,
        "COGS %": Number(c.cogsPct.toFixed(1)),
        "Gross profit": c.gross,
        "Gross %": Number(c.grossPct.toFixed(1)),
        Labour: c.labour,
        "Labour %": c.sales ? Number(((c.labour / c.sales) * 100).toFixed(1)) : 0,
        "Prime cost %": Number(c.primeCostPct.toFixed(1)),
        "Operating profit": c.operating,
        "Net profit": c.net,
        "Net %": Number(c.netPct.toFixed(1)),
      };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Weeks");
    XLSX.writeFile(wb, `rooster-pnl-all-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const tone = (v, good, ok) => (v === 0 ? "" : v <= good ? "rc-temp-ok" : v <= ok ? "" : "rc-temp-bad");

  // ---------------- History ----------------
  if (screen === "history") {
    return (
      <div className="rc-scroll-area">
        <button onClick={() => setScreen("edit")} className="rc-back-btn">← Back</button>

        <div className="rc-detail-heading">
          <div>
            <h2 className="rc-detail-title">Past weeks</h2>
            <div className="rc-stock-unit">{weeks.length} saved</div>
          </div>
        </div>

        <div className="rc-stock-list">
          {weeks.map((w) => {
            const c = calculate(w);
            return (
              <div key={w.weekStart} className="rc-stock-row">
                <button
                  onClick={() => { setCurrent(w); setDirty(false); setScreen("edit"); }}
                  className="rc-stock-info"
                  style={{ background: "none", border: "none", textAlign: "left", padding: 0, color: "inherit", cursor: "pointer" }}
                >
                  <div className="rc-stock-label">{weekLabel(w.weekStart)}</div>
                  <div className="rc-stock-unit">
                    {money(c.sales)} sales · GP {pct1(c.grossPct)} · net {money(c.net)}
                  </div>
                </button>
                <button
                  onClick={() => setWeeks(deleteWeek(w.weekStart))}
                  className="rc-icon-btn"
                  aria-label="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>

        {weeks.length > 1 && (
          <button onClick={exportAll} className="rc-export-btn">
            <Download size={15} />
            <span>Export all weeks to Excel</span>
          </button>
        )}
      </div>
    );
  }

  // ---------------- Editor ----------------
  return (
    <div className="rc-scroll-area">
      <button
        onClick={() => {
          if (dirty && !window.confirm("You have unsaved changes. Leave anyway?")) return;
          onBack();
        }}
        className="rc-back-btn"
      >
        ← Back
      </button>

      <div className="rc-detail-heading">
        <div className="rc-module-icon" style={{ background: "var(--bg-card)" }}>
          <TrendingUp size={19} color="var(--gold)" />
        </div>
        <div>
          <h2 className="rc-detail-title">Weekly P&amp;L</h2>
          <div className="rc-stock-unit">
            {weekLabel(current.weekStart)}
            {dirty ? " · unsaved" : ""}
          </div>
        </div>
      </div>

      <div className="rc-crop-actions" style={{ marginBottom: 16 }}>
        <button onClick={() => shiftWeek(-1)} className="rc-icon-btn"><ChevronLeft size={16} /></button>
        <span className="rc-stock-unit" style={{ alignSelf: "center", flex: 1, textAlign: "center" }}>
          {weekLabel(current.weekStart)}
        </span>
        <button onClick={() => shiftWeek(1)} className="rc-icon-btn"><ChevronRight size={16} /></button>
      </div>

      {/* Headline */}
      <div className="rc-prep-summary">
        <div className="rc-prep-meta">
          <div className="rc-prep-pct">Estimated net profit</div>
          <div className="rc-prep-num" style={{ fontSize: 28 }}>{money(calc.net)}</div>
          <div className="rc-stock-unit" style={{ marginTop: 4 }}>
            {calc.sales > 0 ? `${pct1(calc.netPct)} of sales` : "Enter sales to see percentages"}
          </div>
        </div>
      </div>

      <button onClick={autofill} className="rc-scan-btn">
        <RefreshCw size={18} />
        <span>Pull stock &amp; invoices for this week</span>
      </button>

      {pulled && (
        <div className="rc-sent-banner" style={{ marginBottom: 18 }}>
          <Check size={16} color="var(--ok-text)" />
          <span>{pulled}</span>
        </div>
      )}

      {/* Sales */}
      <div className="rc-checklist-heading">Sales</div>
      <div className="rc-field">
        <label className="rc-field-label">Total weekly sales</label>
        <input
          className="rc-field-input" type="number" step="0.01" inputMode="decimal"
          value={current.sales}
          onChange={(e) => set("sales", e.target.value)}
          placeholder="0.00"
        />
      </div>

      {/* COGS */}
      <div className="rc-checklist-heading" style={{ marginTop: 18 }}>Cost of goods sold</div>

      <div className="rc-field-row">
        <div className="rc-field">
          <label className="rc-field-label">Opening stock</label>
          <input
            className="rc-field-input" type="number" step="0.01" inputMode="decimal"
            value={current.opening}
            onChange={(e) => set("opening", e.target.value)}
          />
        </div>
        <div className="rc-field">
          <label className="rc-field-label">Closing stock</label>
          <input
            className="rc-field-input" type="number" step="0.01" inputMode="decimal"
            value={current.closing}
            onChange={(e) => set("closing", e.target.value)}
          />
        </div>
      </div>

      <div className="rc-stock-list">
        {BUCKETS.map((b) => (
          <div key={b.id} className="rc-stock-row">
            <div className="rc-stock-info">
              <div className="rc-stock-label">{b.label}</div>
            </div>
            <input
              className="rc-temp-input" style={{ width: 96 }}
              type="number" step="0.01" inputMode="decimal"
              placeholder="0"
              value={current.purchases[b.id] ?? ""}
              onChange={(e) => setPurchase(b.id, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className={`rc-stock-row ${tone(calc.cogsPct, 32, 38)}`} style={{ marginBottom: 18 }}>
        <div className="rc-stock-info">
          <div className="rc-stock-label">Weekly COGS</div>
          <div className="rc-stock-unit">
            {money2(calc.opening)} + {money2(calc.purchases)} − {money2(calc.closing)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="rc-qty-value">{money(calc.cogs)}</div>
          <div className="rc-stock-unit">{pct1(calc.cogsPct)}</div>
        </div>
      </div>

      {/* Labour */}
      <div className="rc-checklist-heading">Labour</div>
      <div className="rc-field">
        <label className="rc-field-label">Total labour (incl. super &amp; on-costs)</label>
        <input
          className="rc-field-input" type="number" step="0.01" inputMode="decimal"
          value={current.labour}
          onChange={(e) => set("labour", e.target.value)}
        />
      </div>

      <div className="rc-field">
        <label className="rc-field-label">Weekly fixed cost allowance (optional)</label>
        <input
          className="rc-field-input" type="number" step="0.01" inputMode="decimal"
          value={current.fixed}
          onChange={(e) => set("fixed", e.target.value)}
          placeholder="Rent, utilities, insurance ÷ weeks"
        />
      </div>

      {/* Results */}
      <div className="rc-checklist-heading" style={{ marginTop: 18 }}>Result</div>
      <div className="rc-stock-list">
        <div className="rc-stock-row">
          <div className="rc-stock-info"><div className="rc-stock-label">Gross profit</div></div>
          <div style={{ textAlign: "right" }}>
            <div className="rc-qty-value">{money(calc.gross)}</div>
            <div className="rc-stock-unit">{pct1(calc.grossPct)}</div>
          </div>
        </div>
        <div className="rc-stock-row">
          <div className="rc-stock-info"><div className="rc-stock-label">Labour</div></div>
          <div style={{ textAlign: "right" }}>
            <div className="rc-qty-value">{money(calc.labour)}</div>
            <div className="rc-stock-unit">{pct1(labourPct)}</div>
          </div>
        </div>
        <div className={`rc-stock-row ${tone(calc.primeCostPct, 60, 68)}`}>
          <div className="rc-stock-info">
            <div className="rc-stock-label">Prime cost</div>
            <div className="rc-stock-unit">COGS + labour · aim under 60%</div>
          </div>
          <div className="rc-qty-value">{pct1(calc.primeCostPct)}</div>
        </div>
        <div className="rc-stock-row">
          <div className="rc-stock-info"><div className="rc-stock-label">Operating profit</div></div>
          <div className="rc-qty-value">{money(calc.operating)}</div>
        </div>
        <div className="rc-stock-row rc-stock-active">
          <div className="rc-stock-info">
            <div className="rc-stock-label">Net profit</div>
            <div className="rc-stock-unit">after fixed costs</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="rc-qty-value">{money(calc.net)}</div>
            <div className="rc-stock-unit">{pct1(calc.netPct)}</div>
          </div>
        </div>
      </div>

      {calc.sales > 0 && calc.cogsPct > 38 && (
        <div className="rc-urgent-note">
          COGS at {pct1(calc.cogsPct)} is high for a QSR. Check for waste, portioning,
          a missed stocktake, or invoices dated outside this week.
        </div>
      )}

      <div className="rc-field" style={{ marginTop: 14 }}>
        <label className="rc-field-label">Notes</label>
        <textarea
          className="rc-field-input" rows={2}
          value={current.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Public holiday, closed Monday, big function…"
        />
      </div>

      {saved === "no" && (
        <div className="rc-urgent-note">
          Couldn't save — device storage may be full. Export what you need, then clear
          old invoices or stocktakes to free space.
        </div>
      )}

      <button onClick={save} className="rc-submit-btn rc-submit-active">
        <Check size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
        {saved === "yes" ? "Saved ✓" : saved === "no" ? "Save failed" : "Save this week"}
      </button>

      {saved === "yes" && (
        <div className="rc-sent-banner" style={{ marginTop: 10 }}>
          <Check size={16} color="var(--ok-text)" />
          <span>{weekLabel(current.weekStart)} saved.</span>
        </div>
      )}

      <button onClick={exportWeek} className="rc-export-btn">
        <Download size={15} />
        <span>Export this week to Excel</span>
      </button>

      {weeks.length > 0 && (
        <button onClick={() => setScreen("history")} className="rc-history-toggle" style={{ marginTop: 14 }}>
          <History size={15} color="var(--text-2)" />
          <span>Past weeks ({weeks.length})</span>
          <ChevronRight size={16} color="var(--text-3)" />
        </button>
      )}
    </div>
  );
}