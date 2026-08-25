import React, { useState, useEffect, useMemo } from "react";
import {
  Boxes, ChevronRight, ChevronLeft, Check, Download, Trash2, AlertTriangle,
  TrendingDown, Settings, Plus, Minus, X, History, Play, Copy,
} from "lucide-react";
import { GROUPS, loadItems, saveItems, resetItems } from "../data/stockItems";
import {
  loadSessions, saveSession, deleteSession, loadDraft, saveDraft, clearDraft,
  money, sessionValue, countedCount, buildVariance, fmtWhen,
} from "../data/stocktake";

export default function StockTake({ onBack }) {
  const [items, setItems] = useState(() => loadItems());
  const [sessions, setSessions] = useState(() => loadSessions());
  const [draft, setDraft] = useState(() => loadDraft());
  const [screen, setScreen] = useState("home"); // home | count | review | report | items
  const [groupIdx, setGroupIdx] = useState(0);
  const [reportId, setReportId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [copied, setCopied] = useState("");

  // Persist the draft whenever it changes
  useEffect(() => {
    if (draft) saveDraft(draft);
  }, [draft]);

  const groupsWithItems = useMemo(
    () => GROUPS.filter((g) => items.some((i) => i.supplier === g.id)),
    [items]
  );

  const groupLabel = (id) => GROUPS.find((g) => g.id === id)?.label || id;

  const startNew = () => {
    setDraft({ startedAt: new Date().toISOString(), by: "", counts: {} });
    setGroupIdx(0);
    setScreen("count");
  };

  const setCount = (itemId, value) =>
    setDraft((p) => ({ ...p, counts: { ...p.counts, [itemId]: value } }));

  const bump = (itemId, delta) =>
    setDraft((p) => {
      const cur = Number(p.counts[itemId]);
      const next = Math.max(0, (Number.isFinite(cur) ? cur : 0) + delta);
      return { ...p, counts: { ...p.counts, [itemId]: String(next) } };
    });

  const finish = () => {
    const cleaned = {};
    Object.entries(draft.counts).forEach(([k, v]) => {
      if (v !== "" && v !== null && v !== undefined && Number.isFinite(Number(v))) {
        cleaned[k] = Number(v);
      }
    });
    const entry = saveSession({
      by: draft.by || "Unknown",
      startedAt: draft.startedAt,
      counts: cleaned,
      itemsSnapshot: items.map(({ id, name, unit, cost, supplier, par }) => ({
        id, name, unit, cost, supplier, par,
      })),
    });
    if (entry) {
      setSessions((p) => [entry, ...p]);
      clearDraft();
      setDraft(null);
      setReportId(entry.id);
      setScreen("report");
    }
  };

  const removeSession = (id) => {
    setSessions(deleteSession(id));
    if (reportId === id) setScreen("home");
  };

  const copyList = (label, rows) => {
    const text = rows
      .map((r) => `${Math.ceil(r.par - r.closing)} ${r.unit} — ${r.name}`)
      .join("\n");
    try {
      navigator.clipboard?.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 2500);
    } catch {
      /* ignore */
    }
  };

  const exportSession = async (session) => {
    const XLSX = await import("xlsx");
    const snap = session.itemsSnapshot || items;
    const prev = sessions.find(
      (s) => s.id !== session.id && new Date(s.at) < new Date(session.at)
    );
    const rows = buildVariance(session, prev, snap);

    const sheet = rows.map((r) => ({
      Supplier: groupLabel(r.supplier),
      Item: r.name,
      Unit: r.unit,
      "Unit cost": r.cost ?? "",
      Opening: r.opening ?? "",
      Closing: r.closing ?? "",
      Used: r.used ?? "",
      "Value on hand": r.value ?? "",
      "Value used": r.usedValue ?? "",
      Par: r.par ?? "",
      "Below par": r.belowPar ? "YES" : "",
    }));
    sheet.push({
      Supplier: "", Item: "TOTAL", Unit: "", "Unit cost": "",
      Opening: "", Closing: "", Used: "",
      "Value on hand": rows.reduce((s, r) => s + (r.value || 0), 0),
      "Value used": rows.reduce((s, r) => s + (r.usedValue || 0), 0),
      Par: "", "Below par": "",
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), "Stocktake");
    XLSX.writeFile(
      wb,
      `rooster-stocktake-${new Date(session.at).toISOString().slice(0, 10)}.xlsx`
    );
  };

  // ---------------- Item editor ----------------
  if (screen === "items") {
    return (
      <div className="rc-scroll-area">
        <button
          onClick={() => { setItems(loadItems()); setScreen("home"); }}
          className="rc-back-btn"
        >
          ← Cancel
        </button>

        <div className="rc-detail-heading">
          <div className="rc-module-icon" style={{ background: "var(--bg-card)" }}>
            <Settings size={19} color="var(--gold)" />
          </div>
          <div>
            <h2 className="rc-detail-title">Stock items</h2>
            <div className="rc-stock-unit">Set what you count and what it costs</div>
          </div>
        </div>

        {groupsWithItems.map((g) => (
          <div key={g.id} style={{ marginBottom: 20 }}>
            <div className="rc-checklist-heading">{g.label}</div>
            <div className="rc-stock-list">
              {items.filter((i) => i.supplier === g.id).map((it) => (
                <div key={it.id} className="rc-stock-row">
                  <div className="rc-stock-info">
                    <div className="rc-stock-label">{it.name}</div>
                    <div className="rc-stock-unit">
                      per {it.unit} · {money(it.cost)} · par {it.par}
                    </div>
                  </div>
                  <button onClick={() => setEditing(it)} className="rc-icon-btn" aria-label="Edit">
                    <Settings size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={() => { saveItems(items); setScreen("home"); }}
          className="rc-submit-btn rc-submit-active"
        >
          <Check size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          Save changes
        </button>
        <button
          onClick={() => {
            if (window.confirm("Reset the item list to defaults?")) setItems(resetItems());
          }}
          className="rc-history-clear"
        >
          <Trash2 size={13} /> Reset to defaults
        </button>

        {editing && (
          <div className="rc-scan-modal" onClick={() => setEditing(null)}>
            <div className="rc-scan-modal-inner" onClick={(e) => e.stopPropagation()}>
              <div className="rc-chat-header">
                <div className="rc-chat-title">{editing.name}</div>
                <button onClick={() => setEditing(null)} className="rc-close-btn">
                  <X size={16} />
                </button>
              </div>
              <div style={{ padding: 16 }}>
                <div className="rc-field">
                  <label className="rc-field-label">Counted in</label>
                  <input
                    className="rc-field-input"
                    value={editing.unit}
                    onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                  />
                </div>
                <div className="rc-field-row">
                  <div className="rc-field">
                    <label className="rc-field-label">Cost per unit</label>
                    <input
                      className="rc-field-input" type="number" step="0.01"
                      value={editing.cost}
                      onChange={(e) => setEditing({ ...editing, cost: Number(e.target.value) })}
                    />
                  </div>
                  <div className="rc-field">
                    <label className="rc-field-label">Par level</label>
                    <input
                      className="rc-field-input" type="number"
                      value={editing.par}
                      onChange={(e) => setEditing({ ...editing, par: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setItems((p) => p.map((i) => (i.id === editing.id ? editing : i)));
                    setEditing(null);
                  }}
                  className="rc-submit-btn rc-submit-active"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------- Counting ----------------
  if (screen === "count" && draft) {
    const group = groupsWithItems[groupIdx];
    if (!group) {
      setScreen("home");
      return null;
    }
    const groupItems = items.filter((i) => i.supplier === group.id);
    const doneHere = countedCount(draft.counts, groupItems);
    const totalDone = countedCount(draft.counts, items);
    const last = sessions[0];

    return (
      <div className="rc-scroll-area">
        <button onClick={() => setScreen("home")} className="rc-back-btn">
          ← Pause (progress saved)
        </button>

        <div className="rc-detail-heading">
          <div>
            <h2 className="rc-detail-title">{group.label}</h2>
            <div className="rc-stock-unit">
              {doneHere}/{groupItems.length} counted · {totalDone}/{items.length} overall
            </div>
          </div>
        </div>

        <div className="rc-progress-bar">
          <div
            className="rc-progress-fill"
            style={{ width: `${items.length ? (totalDone / items.length) * 100 : 0}%` }}
          />
        </div>

        <div className="rc-stock-list">
          {groupItems.map((it) => {
            const val = draft.counts[it.id] ?? "";
            const n = Number(val);
            const filled = val !== "" && Number.isFinite(n);
            const low = filled && it.par && n < it.par;
            const prev = last?.counts?.[it.id];
            return (
              <div
                key={it.id}
                className={`rc-stock-row ${low ? "rc-temp-bad" : filled ? "rc-temp-ok" : ""}`}
              >
                <div className="rc-stock-info">
                  <div className="rc-stock-label">{it.name}</div>
                  <div className="rc-stock-unit">
                    {it.unit} · par {it.par}
                    {prev !== undefined ? ` · last ${prev}` : ""}
                    {filled ? ` · ${money(n * it.cost)}` : ""}
                  </div>
                </div>
                <div className="rc-temp-controls">
                  <button onClick={() => bump(it.id, -1)} className="rc-qty-btn" aria-label="Less">
                    <Minus size={15} />
                  </button>
                  <input
                    className="rc-temp-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="—"
                    value={val}
                    onChange={(e) => setCount(it.id, e.target.value.replace(/[^0-9.]/g, ""))}
                  />
                  <button onClick={() => bump(it.id, 1)} className="rc-qty-btn" aria-label="More">
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rc-crop-actions">
          <button
            onClick={() => setGroupIdx((i) => Math.max(0, i - 1))}
            disabled={groupIdx === 0}
            className="rc-icon-btn"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="rc-stock-unit" style={{ alignSelf: "center" }}>
            {groupIdx + 1} of {groupsWithItems.length}
          </span>
          <button
            onClick={() => setGroupIdx((i) => Math.min(groupsWithItems.length - 1, i + 1))}
            disabled={groupIdx === groupsWithItems.length - 1}
            className="rc-icon-btn"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {groupIdx === groupsWithItems.length - 1 ? (
          <button onClick={() => setScreen("review")} className="rc-submit-btn rc-submit-active">
            Review and finish
          </button>
        ) : (
          <button
            onClick={() => setGroupIdx((i) => i + 1)}
            className="rc-submit-btn rc-submit-active"
          >
            Next: {groupsWithItems[groupIdx + 1]?.label}
          </button>
        )}
      </div>
    );
  }

  // ---------------- Review before saving ----------------
  if (screen === "review" && draft) {
    const total = sessionValue(draft.counts, items);
    const counted = countedCount(draft.counts, items);
    const missing = items.filter((i) => {
      const v = draft.counts[i.id];
      return v === undefined || v === "";
    });

    return (
      <div className="rc-scroll-area">
        <button onClick={() => setScreen("count")} className="rc-back-btn">
          ← Back to counting
        </button>

        <div className="rc-detail-heading">
          <div>
            <h2 className="rc-detail-title">Review</h2>
            <div className="rc-stock-unit">{counted} of {items.length} items counted</div>
          </div>
        </div>

        <div className="rc-prep-summary">
          <div className="rc-prep-meta">
            <div className="rc-prep-pct">Total stock on hand</div>
            <div className="rc-prep-num" style={{ fontSize: 26 }}>{money(total)}</div>
          </div>
        </div>

        {missing.length > 0 && (
          <div className="rc-due-banner">
            <AlertTriangle size={15} color="var(--gold)" />
            <span>
              {missing.length} item{missing.length === 1 ? "" : "s"} not counted — they'll be
              left blank rather than counted as zero.
            </span>
          </div>
        )}

        <div className="rc-field">
          <label className="rc-field-label">Counted by</label>
          <input
            className="rc-field-input"
            value={draft.by}
            onChange={(e) => setDraft((p) => ({ ...p, by: e.target.value }))}
            placeholder="Your name"
          />
        </div>

        <button
          onClick={finish}
          disabled={counted === 0}
          className={`rc-submit-btn ${counted ? "rc-submit-active" : ""}`}
        >
          <Check size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          Finish stocktake
        </button>

        <button
          onClick={() => {
            if (window.confirm("Discard this stocktake? Counts will be lost.")) {
              clearDraft();
              setDraft(null);
              setScreen("home");
            }
          }}
          className="rc-history-clear"
        >
          <Trash2 size={13} /> Discard
        </button>
      </div>
    );
  }

  // ---------------- Report ----------------
  if (screen === "report" && reportId) {
    const session = sessions.find((s) => s.id === reportId);
    if (!session) {
      setScreen("home");
      return null;
    }
    const snap = session.itemsSnapshot || items;
    const prev = sessions.find(
      (s) => s.id !== session.id && new Date(s.at) < new Date(session.at)
    );
    const rows = buildVariance(session, prev, snap);
    const onHand = rows.reduce((s, r) => s + (r.value || 0), 0);
    const usedValue = rows.reduce((s, r) => s + (r.usedValue || 0), 0);
    const lowStock = rows.filter((r) => r.belowPar);
    const oddities = rows.filter((r) => r.negative);
    const topUsed = [...rows]
      .filter((r) => r.usedValue != null && r.usedValue > 0)
      .sort((a, b) => b.usedValue - a.usedValue)
      .slice(0, 8);

    const lowGroups = GROUPS.filter((g) => lowStock.some((r) => r.supplier === g.id));

    return (
      <div className="rc-scroll-area">
        <button onClick={() => setScreen("home")} className="rc-back-btn">← Back</button>

        <div className="rc-detail-heading">
          <div>
            <h2 className="rc-detail-title">Stocktake</h2>
            <div className="rc-stock-unit">
              {fmtWhen(session.at)} · counted by {session.by}
            </div>
          </div>
        </div>

        <div className="rc-prep-summary">
          <div className="rc-prep-meta">
            <div className="rc-prep-pct">Stock on hand</div>
            <div className="rc-prep-num" style={{ fontSize: 26 }}>{money(onHand)}</div>
          </div>
        </div>

        {prev ? (
          <div className="rc-prep-summary">
            <div className="rc-prep-meta">
              <div className="rc-prep-pct">Used since {fmtWhen(prev.at)}</div>
              <div className="rc-prep-num" style={{ fontSize: 22 }}>{money(usedValue)}</div>
              <div className="rc-stock-unit" style={{ marginTop: 6 }}>
                Excludes anything delivered in between — treat as a rough figure.
              </div>
            </div>
          </div>
        ) : (
          <div className="rc-due-banner">
            <AlertTriangle size={15} color="var(--gold)" />
            <span>First stocktake — usage figures start from the next one.</span>
          </div>
        )}

        {oddities.length > 0 && (
          <>
            <div className="rc-checklist-heading" style={{ marginTop: 20 }}>
              <AlertTriangle size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              Went up without a delivery
            </div>
            <div className="rc-stock-list">
              {oddities.map((r) => (
                <div key={r.id} className="rc-stock-row rc-temp-bad">
                  <div className="rc-stock-info">
                    <div className="rc-stock-label">{r.name}</div>
                    <div className="rc-stock-unit">
                      {r.opening} → {r.closing} {r.unit}. Miscount, or a delivery not recorded.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {lowStock.length > 0 && (
          <>
            <div className="rc-checklist-heading" style={{ marginTop: 20 }}>
              <TrendingDown size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              Order list
              <span className="rc-checklist-count">{lowStock.length}</span>
            </div>

            {lowGroups.map((g) => {
              const gRows = lowStock.filter((r) => r.supplier === g.id);
              return (
                <div key={g.id} style={{ marginBottom: 18 }}>
                  <div className="rc-stock-unit" style={{ marginBottom: 6, fontWeight: 600 }}>
                    {g.label}
                  </div>
                  <div className="rc-stock-list">
                    {gRows.map((r) => (
                      <div key={r.id} className="rc-stock-row">
                        <div className="rc-stock-info">
                          <div className="rc-stock-label">{r.name}</div>
                          <div className="rc-stock-unit">
                            {r.closing} on hand · par {r.par}
                          </div>
                        </div>
                        <div className="rc-qty-value">
                          {Math.ceil(r.par - r.closing)} {r.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => copyList(g.label, gRows)} className="rc-export-btn">
                    <Copy size={15} />
                    <span>{copied === g.label ? "Copied!" : `Copy ${g.label} list`}</span>
                  </button>
                </div>
              );
            })}
          </>
        )}

        {topUsed.length > 0 && (
          <>
            <div className="rc-checklist-heading" style={{ marginTop: 20 }}>
              Biggest spend this period
            </div>
            <div className="rc-stock-list">
              {topUsed.map((r) => (
                <div key={r.id} className="rc-stock-row">
                  <div className="rc-stock-info">
                    <div className="rc-stock-label">{r.name}</div>
                    <div className="rc-stock-unit">{r.used} {r.unit} used</div>
                  </div>
                  <div className="rc-qty-value">{money(r.usedValue)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <button onClick={() => exportSession(session)} className="rc-export-btn">
          <Download size={15} />
          <span>Export to Excel</span>
        </button>
      </div>
    );
  }

  // ---------------- Home ----------------
  const lastSession = sessions[0];
  const draftDone = draft ? countedCount(draft.counts, items) : 0;

  return (
    <div className="rc-scroll-area">
      <button onClick={onBack} className="rc-back-btn">← Back</button>

      <div className="rc-detail-heading">
        <div className="rc-module-icon" style={{ background: "var(--bg-card)" }}>
          <Boxes size={19} color="var(--gold)" />
        </div>
        <div>
          <h2 className="rc-detail-title">Stocktake</h2>
          <div className="rc-stock-unit">
            {lastSession ? `Last done ${fmtWhen(lastSession.at)}` : "No stocktake yet"}
          </div>
        </div>
      </div>

      {draft ? (
        <>
          <div className="rc-due-banner">
            <AlertTriangle size={15} color="var(--gold)" />
            <span>Stocktake in progress — {draftDone} of {items.length} counted.</span>
          </div>
          <button onClick={() => setScreen("count")} className="rc-scan-btn">
            <Play size={18} />
            <span>Continue counting</span>
          </button>
          <button
            onClick={() => {
              if (window.confirm("Discard the stocktake in progress?")) {
                clearDraft();
                setDraft(null);
              }
            }}
            className="rc-history-clear"
          >
            <Trash2 size={13} /> Discard it
          </button>
        </>
      ) : (
        <button onClick={startNew} className="rc-scan-btn">
          <Boxes size={20} />
          <span>Start a stocktake</span>
        </button>
      )}

      <button onClick={() => setScreen("items")} className="rc-history-toggle">
        <Settings size={15} color="var(--text-2)" />
        <span>Items, costs and par levels ({items.length})</span>
        <ChevronRight size={16} color="var(--text-3)" />
      </button>

      {sessions.length > 0 && (
        <>
          <div className="rc-checklist-heading" style={{ marginTop: 20 }}>
            <History size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Past stocktakes
            <span className="rc-checklist-count">{sessions.length}</span>
          </div>
          <div className="rc-stock-list">
            {sessions.map((s) => {
              const snap = s.itemsSnapshot || items;
              const val = sessionValue(s.counts, snap);
              return (
                <div key={s.id} className="rc-stock-row">
                  <button
                    onClick={() => { setReportId(s.id); setScreen("report"); }}
                    className="rc-stock-info"
                    style={{
                      background: "none", border: "none", textAlign: "left",
                      padding: 0, color: "inherit", cursor: "pointer",
                    }}
                  >
                    <div className="rc-stock-label">{fmtWhen(s.at)}</div>
                    <div className="rc-stock-unit">
                      {money(val)} · {Object.keys(s.counts).length} items · {s.by}
                    </div>
                  </button>
                  <button onClick={() => removeSession(s.id)} className="rc-icon-btn" aria-label="Delete">
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}