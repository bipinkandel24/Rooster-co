import React, { useState } from "react";
import { Truck, Minus, Plus, Send, CheckCircle2, AlertCircle, Wrench, ChevronRight, LogOut, MessageSquare } from "lucide-react";
import { SUPPLIERS, SERVICES, dueToday } from "../data/suppliers";

export default function OrderPortal({ onBack, onLogout, ownerEmail }) {
  const [supplierId, setSupplierId] = useState(null);
  const [qty, setQty] = useState({});
  const [extra, setExtra] = useState("");
  const [sent, setSent] = useState(false);

  const due = dueToday();
  const supplier = SUPPLIERS.find((s) => s.id === supplierId);

  const change = (key, delta) =>
    setQty((p) => ({ ...p, [key]: Math.max(0, (p[key] || 0) + delta) }));

  // Items can be plain strings or { name, unit } objects
  const norm = (i) => (typeof i === "string" ? { name: i, unit: "" } : i);

  const openSupplier = (id) => {
    setSupplierId(id);
    setQty({});
    setExtra("");
    setSent(false);
  };

  // ---------- Supplier list ----------
  if (!supplier) {
    return (
      <div className="rc-scroll-area">
        <button onClick={onBack} className="rc-back-btn">← Back</button>

        <div className="rc-detail-heading">
          <div className="rc-module-icon" style={{ background: "#C8702A22" }}>
            <Truck size={19} color="#C8702A" />
          </div>
          <h2 className="rc-detail-title">Ordering Portal</h2>
        </div>

        {due.length > 0 && (
          <div className="rc-due-banner">
            <AlertCircle size={15} color="#E3A94A" />
            <span>
              Due today: {due.map((id) => SUPPLIERS.find((s) => s.id === id)?.name).filter(Boolean).join(", ")}
            </span>
          </div>
        )}

        <div className="rc-checklist-heading">Suppliers</div>
        <div className="rc-stock-list">
          {SUPPLIERS.map((s) => (
            <button key={s.id} onClick={() => openSupplier(s.id)} className="rc-supplier-row">
              <div className="rc-stock-info">
                <div className="rc-stock-label">
                  {s.name}
                  {due.includes(s.id) && <span className="rc-due-dot" />}
                </div>
                <div className="rc-stock-unit">
                  {s.delivery}{s.cutoff ? ` · ${s.cutoff}` : ""}
                </div>
              </div>
              <ChevronRight size={17} color="#7C7568" />
            </button>
          ))}
        </div>

        <div className="rc-checklist-heading" style={{ marginTop: 24 }}>
          <Wrench size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          Services & Maintenance
        </div>
        <div className="rc-stock-list">
          {SERVICES.map((s) => (
            <div key={s.id} className="rc-stock-row">
              <div className="rc-stock-info">
                <div className="rc-stock-label">{s.name}</div>
                <div className="rc-stock-unit">{s.freq}</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onLogout} className="rc-logout-btn">
          <LogOut size={15} />
          <span>Log out of ordering portal</span>
        </button>
      </div>
    );
  }

  // ---------- Single supplier order sheet ----------
  const items = supplier.items.map(norm);
  const ordered = items.filter((i) => (qty[i.name] || 0) > 0);
  const canSend = ordered.length > 0 || extra.trim().length > 0;
  const isSms = supplier.sendVia === "sms";

  const send = () => {
    const now = new Date();

    // Delivery = next day after ordering
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    const deliveryShort = next.toLocaleDateString("en-AU");
    const deliveryLong = next.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const lines = ordered
      .map((i) => `${qty[i.name]}${i.unit ? " " + i.unit : " x"} — ${i.name}`)
      .join("\n");

    if (isSms) {
      const text =
        (supplier.greeting ? `${supplier.greeting}\n` : "") +
        `Rooster & Co order — Could you please deliver this list for tomorrow morning (${deliveryLong}):\n\n` +
        (lines || "(no listed items)") +
        (extra.trim() ? `\n\n${extra.trim()}` : "") +
        `\n\nThank you!`;

      const num = (supplier.phone || "").replace(/\s/g, "");
      // iOS uses &body=, Android uses ?body= — this form works on both
      window.location.href = `sms:${num}${/iPhone|iPad|Mac/.test(navigator.userAgent) ? "&" : "?"}body=${encodeURIComponent(text)}`;
      setSent(true);
      return;
    }

    const subject = encodeURIComponent(`Rooster and Co Order for ${deliveryShort}`);

    const body = encodeURIComponent(
      (supplier.greeting ? `${supplier.greeting}\n\n` : "") +
        `Order for Rooster and Co\n` +
        `Could you please deliver this list for tomorrow (${deliveryLong})?\n\n` +
        (lines || "(no listed items)") +
        (extra.trim() ? `\n\nExtra notes:\n${extra.trim()}` : "") +
        `\n\n— Rooster & Co`
    );

    const to = supplier.email || ownerEmail;
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <div className="rc-scroll-area">
      <button onClick={() => setSupplierId(null)} className="rc-back-btn">← All suppliers</button>

      <div className="rc-detail-heading">
        <div className="rc-module-icon" style={{ background: "#C8702A22" }}>
          <Truck size={19} color="#C8702A" />
        </div>
        <div>
          <h2 className="rc-detail-title">{supplier.name}</h2>
          <div className="rc-stock-unit">
            {supplier.delivery}{supplier.cutoff ? ` · ${supplier.cutoff}` : ""}
          </div>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="rc-stock-list">
          {items.map((item) => (
            <div key={item.name} className={`rc-stock-row ${qty[item.name] > 0 ? "rc-stock-active" : ""}`}>
              <div className="rc-stock-info">
                <div className="rc-stock-label">{item.name}</div>
                {item.unit && <div className="rc-stock-unit">in {item.unit}</div>}
              </div>
              <div className="rc-stock-controls">
                <button onClick={() => change(item.name, -1)} className="rc-qty-btn" aria-label="Less">
                  <Minus size={15} />
                </button>
                <span className="rc-qty-value">{qty[item.name] || 0}</span>
                <button onClick={() => change(item.name, 1)} className="rc-qty-btn" aria-label="More">
                  <Plus size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rc-stock-unit" style={{ marginBottom: 14 }}>
          No standing list yet — type what you need below.
        </div>
      )}

      <div className="rc-checklist-heading" style={{ marginTop: 18 }}>Extra items / notes</div>
      <textarea
        className="rc-notes-input"
        rows={3}
        placeholder="Anything not on the list…"
        value={extra}
        onChange={(e) => setExtra(e.target.value)}
      />

      {sent ? (
        <div className="rc-sent-banner">
          <CheckCircle2 size={16} color="#C9D9B8" />
          <span>
            {isSms
              ? "Message opened — press send in your Messages app."
              : "Email opened — press send in your mail app."}
          </span>
        </div>
      ) : (
        <button
          onClick={send}
          disabled={!canSend}
          className={`rc-submit-btn ${canSend ? "rc-submit-active" : ""}`}
        >
          {isSms ? (
            <MessageSquare size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          ) : (
            <Send size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          )}
          {isSms ? "Text Order" : "Send Order"}{ordered.length > 0 ? ` (${ordered.length})` : ""}
        </button>
      )}
    </div>
  );
}