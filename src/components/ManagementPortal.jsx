import React, { useState } from "react";
import { Users, Phone, Mail, ChevronRight, LogOut, Shield, Calendar } from "lucide-react";
import { STAFF } from "../data/staff";

export default function ManagementPortal({ onBack, onLogout }) {
  const [staffId, setStaffId] = useState(null);
  const person = STAFF.find((s) => s.id === staffId);

  const fmtDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const telHref = (n) => "tel:" + String(n || "").replace(/\s/g, "");

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
              <Phone size={16} color="#E3A94A" />
              <div className="rc-stock-info">
                <div className="rc-stock-label">{person.phone}</div>
                <div className="rc-stock-unit">Tap to call</div>
              </div>
            </a>
          ) : null}
          {person.email ? (
            <a href={"mailto:" + person.email} className="rc-contact-row">
              <Mail size={16} color="#E3A94A" />
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
            <Calendar size={15} color="#7C7568" />
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
              <Phone size={16} color="#C97B62" />
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
        <div className="rc-module-icon" style={{ background: "#6E8A8A22" }}>
          <Users size={19} color="#6E8A8A" />
        </div>
        <h2 className="rc-detail-title">Management</h2>
      </div>

      <div className="rc-checklist-heading">
        Staff
        <span className="rc-checklist-count">{STAFF.length}</span>
      </div>
      <div className="rc-stock-list">
        {STAFF.map((s) => (
          <button key={s.id} onClick={() => setStaffId(s.id)} className="rc-supplier-row">
            <div className="rc-avatar rc-avatar-sm">{s.name.charAt(0).toUpperCase()}</div>
            <div className="rc-stock-info">
              <div className="rc-stock-label">{s.name}</div>
              <div className="rc-stock-unit">{s.role}</div>
            </div>
            <ChevronRight size={17} color="#7C7568" />
          </button>
        ))}
      </div>

      <button onClick={onLogout} className="rc-logout-btn">
        <LogOut size={15} />
        <span>Log out</span>
      </button>
    </div>
  );
}