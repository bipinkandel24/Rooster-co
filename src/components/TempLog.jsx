import React, { useState } from "react";
import { Thermometer, CheckCircle2, AlertTriangle, History, Download, Save } from "lucide-react";
import { UNITS, loadLog, saveEntry, checkedToday, inRange, toCSV, fmtWhen } from "../data/tempLog";

export default function TempLog({ onBack }) {
  const [temps, setTemps] = useState({});
  const [staffName, setStaffName] = useState("");
  const [note, setNote] = useState("");
  const [log, setLog] = useState(() => loadLog());
  const [saved, setSaved] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const doneToday = checkedToday();
  const filled = UNITS.filter((u) => {
    const v = String(temps[u.id] ?? "").trim();
    return v !== "" && v !== "-";
  });
  const canSave = filled.length > 0 && staffName.trim() !== "";
  const outOfRange = filled.filter((u) => inRange(u, temps[u.id]) === false);

  const toggleSign = (unitId) => {
    setTemps((p) => {
      const raw = String(p[unitId] ?? "").trim();
      if (raw === "" || raw === "-") return { ...p, [unitId]: raw === "-" ? "" : "-" };
      const flipped = raw.startsWith("-") ? raw.slice(1) : "-" + raw;
      return { ...p, [unitId]: flipped };
    });
  };

  const save = () => {
    const readings = filled.map((u) => ({
      unitId: u.id,
      label: u.label,
      temp: String(temps[u.id]).trim(),
      ok: inRange(u, temps[u.id]) === true,
    }));
    const entry = saveEntry({ readings, staffName: staffName.trim(), note });
    if (entry) {
      setLog((l) => [entry, ...l]);
      setSaved(true);
    }
  };

  const exportCSV = () => {
    const blob = new Blob([toCSV(log)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rooster-temp-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setTemps({});
    setNote("");
    setSaved(false);
  };

  // ---------- Saved confirmation ----------
  if (saved) {
    return (
      <div className="rc-scroll-area">
        <div className="rc-namegate">
          <div
            className="rc-gate-icon"
            style={{ background: outOfRange.length ? "var(--alert-bg)" : "var(--ok-bg)" }}
          >
            {outOfRange.length ? (
              <AlertTriangle size={24} color="var(--danger-soft)" />
            ) : (
              <CheckCircle2 size={24} color="var(--ok-border)" />
            )}
          </div>
          <div className="rc-namegate-title">
            {outOfRange.length ? "Logged — action needed" : "Temperatures logged"}
          </div>
          <div className="rc-namegate-sub" style={{ maxWidth: 300 }}>
            {outOfRange.length
              ? `${outOfRange.map((u) => u.label).join(", ")} out of range. Tell your supervisor now and check the stock inside.`
              : "All readings within range. Nice work."}
          </div>
          <button onClick={reset} className="rc-submit-btn rc-submit-active">
            New check
          </button>
          <button onClick={onBack} className="rc-switch-btn" style={{ marginTop: 14 }}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rc-scroll-area">
      <button onClick={onBack} className="rc-back-btn">← Back</button>

      <div className="rc-detail-heading">
        <div className="rc-module-icon" style={{ background: "var(--bg-card)" }}>
          <Thermometer size={19} color="var(--teal)" />
        </div>
        <div>
          <h2 className="rc-detail-title">Temperature Log</h2>
          <div className="rc-stock-unit">
            {doneToday ? "Already checked today" : "Not yet checked today"}
          </div>
        </div>
      </div>

      {!doneToday && (
        <div className="rc-due-banner">
          <AlertTriangle size={15} color="var(--gold)" />
          <span>Daily check not done yet. Record temps at the start of service.</span>
        </div>
      )}

      <div className="rc-checklist-heading">Readings (°C)</div>
      <div className="rc-stock-list">
        {UNITS.map((u) => {
          const val = temps[u.id] ?? "";
          const ok = inRange(u, val);
          const isNeg = String(val).startsWith("-");
          return (
            <div
              key={u.id}
              className={`rc-stock-row ${ok === false ? "rc-temp-bad" : ok === true ? "rc-temp-ok" : ""}`}
            >
              <div className="rc-stock-info">
                <div className="rc-stock-label">{u.label}</div>
                <div className="rc-stock-unit">
                  Target {u.min}°C to {u.max}°C
                </div>
              </div>

              <div className="rc-temp-controls">
                <button
                  onClick={() => toggleSign(u.id)}
                  className={`rc-sign-btn ${isNeg ? "rc-sign-on" : ""}`}
                  aria-label="Toggle minus"
                  title="Minus"
                >
                  −
                </button>
                <input
                  className="rc-temp-input"
                  type="text"
                  inputMode="decimal"
                  pattern="-?[0-9]*[.,]?[0-9]*"
                  placeholder="—"
                  value={val}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.\-]/g, "");
                    setTemps((p) => ({ ...p, [u.id]: v }));
                  }}
                  onFocus={() => {
                    // Pre-fill the minus for freezer-type units
                    if (u.max < 0 && String(temps[u.id] ?? "") === "") {
                      setTemps((p) => ({ ...p, [u.id]: "-" }));
                    }
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {outOfRange.length > 0 && (
        <div className="rc-urgent-note">
          <strong>{outOfRange.map((u) => u.label).join(", ")}</strong> out of safe range.
          Tell your supervisor and check the stock inside before serving it.
        </div>
      )}

      <div className="rc-field" style={{ marginTop: 18 }}>
        <label className="rc-field-label">Checked by *</label>
        <input
          className="rc-field-input"
          value={staffName}
          onChange={(e) => setStaffName(e.target.value)}
          placeholder="Your name"
        />
      </div>

      <div className="rc-field">
        <label className="rc-field-label">Notes (optional)</label>
        <textarea
          className="rc-field-input"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. door left open, defrost cycle running"
        />
      </div>

      <button
        onClick={save}
        disabled={!canSave}
        className={`rc-submit-btn ${canSave ? "rc-submit-active" : ""}`}
      >
        <Save size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
        Save reading{filled.length > 0 ? ` (${filled.length})` : ""}
      </button>

      {log.length > 0 && (
        <>
          <button
            onClick={() => setShowLog((v) => !v)}
            className="rc-history-toggle"
            style={{ marginTop: 20 }}
          >
            <History size={15} color="var(--text-2)" />
            <span>Past checks ({log.length})</span>
          </button>

          {showLog && (
            <div className="rc-stock-list">
              {log.slice(0, 20).map((e) => (
                <div key={e.id} className="rc-stock-row rc-history-row">
                  <div className="rc-stock-info">
                    <div className="rc-stock-label">{fmtWhen(e.at)}</div>
                    <div className="rc-stock-unit">Checked by {e.staffName}</div>
                    <div className="rc-history-items">
                      {e.readings.map((r) => (
                        <span key={r.unitId} className={r.ok ? "" : "rc-temp-flag"}>
                          {r.label} {r.temp}°{r.ok ? "" : " ⚠"} ·{" "}
                        </span>
                      ))}
                    </div>
                    {e.note && <div className="rc-history-items">Note: {e.note}</div>}
                  </div>
                </div>
              ))}
              <button onClick={exportCSV} className="rc-history-clear">
                <Download size={13} /> Export as CSV
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}