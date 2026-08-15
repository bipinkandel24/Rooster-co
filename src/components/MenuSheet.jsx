import React from "react";
import { X, AlertTriangle, Thermometer, Users, Truck, ChevronRight, Sun, Moon } from "lucide-react";

export default function MenuSheet({ onClose, onIncident, onTemps, onMgmt, onOrders, theme, onToggleTheme }) {
  const ITEMS = [
    {
      id: "incident",
      label: "Report an Incident",
      sub: "Injury, near miss or hazard",
      Icon: AlertTriangle,
      color: "#C0392B",
      onClick: onIncident,
    },
    {
      id: "temps",
      label: "Temperature Log",
      sub: "Daily fridge and coolroom check",
      Icon: Thermometer,
      color: "#6E8A8A",
      onClick: onTemps,
    },
    {
      id: "orders",
      label: "Ordering Portal",
      sub: "Suppliers and stock orders",
      Icon: Truck,
      color: "#C8702A",
      onClick: onOrders,
    },
    {
      id: "mgmt",
      label: "Management",
      sub: "Staff details and contacts",
      Icon: Users,
      color: "#6E8A8A",
      onClick: onMgmt,
    },
  ];

  return (
    <div className="rc-menu-overlay" onClick={onClose}>
      <div className="rc-menu-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="rc-menu-header">
          <div className="rc-menu-title">Menu</div>
          <button onClick={onClose} className="rc-close-btn" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="rc-menu-list">
          {ITEMS.map((it) => (
            <button key={it.id} onClick={it.onClick} className="rc-menu-item">
              <div className="rc-module-icon" style={{ background: it.color + "22" }}>
                <it.Icon size={19} color={it.color} />
              </div>
              <div className="rc-stock-info">
                <div className="rc-stock-label">{it.label}</div>
                <div className="rc-stock-unit">{it.sub}</div>
              </div>
              <ChevronRight size={17} color="#7C7568" />
            </button>
          ))}
        </div>
        <button onClick={onToggleTheme} className="rc-theme-row">
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
          </button>
      </div>
    </div>
  );
}