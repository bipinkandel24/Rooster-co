import React, { useState, useEffect } from "react";
import {
  Users, Phone, Mail, ChevronRight, LogOut, Shield, Calendar,
  Receipt, Boxes, TrendingUp, CalendarDays,
} from "lucide-react";
import InvoiceScanner from "./InvoiceScanner";
import StockTake from "./StockTake";
import WeeklyPnl from "./WeeklyPnl";
import Roster from "./Roster";

export default function ManagementPortal({ onBack, onLogout, onSessionExpired }) {
  const [staffId, setStaffId] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error
  const [showInvoices, setShowInvoices] = useState(false);
  const [showStock, setShowStock] = useState(false);
  const [showPnl, setShowPnl] = useState(false);
  const [showRoster, setShowRoster] = useState(false);

  // Staff records live on the server and are fetched against the session
  // cookie, so they never sit in the JS bundle for anyone to read.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch("/api/staff", { credentials: "same-origin" });
        if (cancelled) return;

        if (r.status === 401) {
          onSessionExpired?.();
          return;
        }
        if (!r.ok) throw new Error("staff request failed");

        const d = await r.json();
        setStaff(Array.isArray(d.staff) ? d.staff : []);
        setLoadState("ready");
      } catch {
        if (!cancelled) setLoadState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onSessionExpired]);

  const person = staff.find((s) => s.id === staffId);

  const fmtDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const telHref = (n) => "tel:" + String(n || "").replace(/\s/g, "");

  // ---------- Sub-sections ----------
  if (showInvoices) {
    return <InvoiceScanner onBack={() => setShowInvoices(false)} />;
  }

  if (showStock) {
    return <StockTake onBack={() => setShowStock(false)} />;
  }

  if (showPnl) {
    return <WeeklyPnl onBack={() => setShowPnl(false)} />;
  }

  if (showRoster) {
    return <Roster onBack={() => setShowRoster(false)} onSessionExpired={onSessionExpired} />;
  }

  // ---------- Staff detail ----------
  if (person) {
    const em = person.emergency || {};
    return (
      <div className="rc-scroll-area">
        <button onClick={() => setStaffId(null)} className="rc-back-btn">← All staff</button>

        <div className="rc-detail-heading">
          <div className="rc-avatar">{person.name.charAt(0).toUpperCase()}</div>
          <div>
            <h2 className="rc-detail-title">{person.name}</h2>
            <div className="rc-stock-unit">{person.role}</div>
          </div>
        </div>

        <div className="rc-checklist-heading">Contact</div>
        <div className="rc-stock-list">
          {person.phone ? (
            <a href={telHref(person.phone)} className="rc-contact-row">
              <Phone size={16} color="var(--gold)" />
              <div className="rc-stock-info">
                <div className="rc-stock-label">{person.phone}</div>
                <div className="rc-stock-unit">Tap to call</div>
              </div>
            </a>
          ) : null}
          {person.email ? (
            <a href={"mailto:" + person.email} className="rc-contact-row">
              <Mail size={16} color="var(--gold)" />
              <div className="rc-stock-info">
                <div className="rc-stock-label">{person.email}</div>
                <div className="rc-stock-unit">Tap to email</div>
              </div>
            </a>
          ) : null}
        </div>

        <div className="rc-checklist-heading" style={{ marginTop: 22 }}>Details</div>
        <div className="rc-stock-list">
          <div className="rc-stock-row">
            <Calendar size={15} color="var(--text-3)" />
            <div className="rc-stock-info">
              <div className="rc-stock-unit">Started</div>
              <div className="rc-stock-label">{fmtDate(person.startDate)}</div>
            </div>
          </div>
          {person.notes ? (
            <div className="rc-stock-row">
              <div className="rc-stock-info">
                <div className="rc-stock-unit">Notes</div>
                <div className="rc-stock-label">{person.notes}</div>
              </div>
            </div>
          ) : null}
        </div>

        {em.name ? (
          <div>
            <div className="rc-checklist-heading" style={{ marginTop: 22 }}>
              <Shield size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              Emergency Contact
            </div>
            <a href={telHref(em.phone)} className="rc-contact-row">
              <Phone size={16} color="var(--danger-soft)" />
              <div className="rc-stock-info">
                <div className="rc-stock-label">{em.name}</div>
                <div className="rc-stock-unit">{em.phone || "No number on file"}</div>
              </div>
            </a>
          </div>
        ) : null}
      </div>
    );
  }

  // ---------- Staff list ----------
  return (
    <div className="rc-scroll-area">
      <button onClick={onBack} className="rc-back-btn">← Back</button>

      <div className="rc-detail-heading">
        <div className="rc-module-icon" style={{ background: "var(--bg-card)" }}>
          <Users size={19} color="var(--teal)" />
        </div>
        <h2 className="rc-detail-title">Management</h2>
      </div>

      <div className="rc-stock-list" style={{ marginBottom: 22 }}>
        <button onClick={() => setShowInvoices(true)} className="rc-menu-item">
          <div className="rc-module-icon" style={{ background: "var(--bg-press)" }}>
            <Receipt size={19} color="var(--gold)" />
          </div>
          <div className="rc-stock-info">
            <div className="rc-stock-label">Invoices</div>
            <div className="rc-stock-unit">Scan and export weekly</div>
          </div>
          <ChevronRight size={17} color="var(--text-3)" />
        </button>

        <button onClick={() => setShowStock(true)} className="rc-menu-item">
          <div className="rc-module-icon" style={{ background: "var(--bg-press)" }}>
            <Boxes size={19} color="var(--gold)" />
          </div>
          <div className="rc-stock-info">
            <div className="rc-stock-label">Stocktake</div>
            <div className="rc-stock-unit">Weekly count, value and order list</div>
          </div>
          <ChevronRight size={17} color="var(--text-3)" />
        </button>

        <button onClick={() => setShowPnl(true)} className="rc-menu-item">
          <div className="rc-module-icon" style={{ background: "var(--bg-press)" }}>
            <TrendingUp size={19} color="var(--gold)" />
          </div>
          <div className="rc-stock-info">
            <div className="rc-stock-label">Weekly P&amp;L</div>
            <div className="rc-stock-unit">Sales, COGS, labour and profit</div>
          </div>
          <ChevronRight size={17} color="var(--text-3)" />
        </button>

        <button onClick={() => setShowRoster(true)} className="rc-menu-item">
          <div className="rc-module-icon" style={{ background: "var(--bg-press)" }}>
            <CalendarDays size={19} color="var(--gold)" />
          </div>
          <div className="rc-stock-info">
            <div className="rc-stock-label">Roster</div>
            <div className="rc-stock-unit">Weekly shifts, hours and sharing</div>
          </div>
          <ChevronRight size={17} color="var(--text-3)" />
        </button>
      </div>

      <div className="rc-checklist-heading">
        Staff
        {loadState === "ready" && <span className="rc-checklist-count">{staff.length}</span>}
      </div>

      {loadState === "loading" && (
        <div className="rc-stock-unit" style={{ padding: "8px 2px" }}>
          Loading staff…
        </div>
      )}

      {loadState === "error" && (
        <div className="rc-urgent-note">
          Couldn't load staff details. Check your connection and try again.
        </div>
      )}

      {loadState === "ready" && (
        <div className="rc-stock-list">
          {staff.map((s) => (
            <button key={s.id} onClick={() => setStaffId(s.id)} className="rc-supplier-row">
              <div className="rc-avatar rc-avatar-sm">{s.name.charAt(0).toUpperCase()}</div>
              <div className="rc-stock-info">
                <div className="rc-stock-label">{s.name}</div>
                <div className="rc-stock-unit">{s.role}</div>
              </div>
              <ChevronRight size={17} color="var(--text-3)" />
            </button>
          ))}
        </div>
      )}

      <button onClick={onLogout} className="rc-logout-btn">
        <LogOut size={15} />
        <span>Log out</span>
      </button>
    </div>
  );
}