import React, { useMemo } from "react";
import {
  Sunrise, ChefHat, Thermometer, Truck, AlertTriangle, CheckCircle2, ChevronRight,
} from "lucide-react";
import {
  todayLabel, greeting, morningStatus, prepStatus, tempStatus, orderStatus, alerts,
} from "../data/todayStatus";

function Row({ Icon, label, detail, pct, tone, onClick }) {
  return (
    <button onClick={onClick} className={`rc-today-row ${tone ? `rc-today-${tone}` : ""}`}>
      <Icon size={17} className="rc-today-icon" />
      <div className="rc-today-body">
        <div className="rc-today-label">{label}</div>
        <div className="rc-today-detail">{detail}</div>
        {pct != null && (
          <div className="rc-today-bar">
            <div
              className="rc-today-bar-fill"
              style={{
                width: `${pct}%`,
                background: pct === 100 ? "var(--ok-border)" : "var(--accent)",
              }}
            />
          </div>
        )}
      </div>
      <ChevronRight size={16} className="rc-today-chev" />
    </button>
  );
}

export default function TodayCard({ prepMods, onMorning, onPrep, onTemps, onOrders }) {
  const morning = useMemo(() => morningStatus(), []);
  const prep = useMemo(() => prepStatus(prepMods), [prepMods]);
  const temps = useMemo(() => tempStatus(), []);
  const orders = useMemo(() => orderStatus(), []);
  const alertList = useMemo(() => alerts(prepMods), [prepMods]);

  const allGood =
    morning.complete && prep.complete && temps.done && temps.issues.length === 0;

  return (
    <div className="rc-today">
      <div className="rc-today-head">
        <div>
          <div className="rc-today-greeting">{greeting()}</div>
          <div className="rc-today-date">{todayLabel()}</div>
        </div>
        {allGood && (
          <div className="rc-today-tick">
            <CheckCircle2 size={20} color="var(--ok-border)" />
          </div>
        )}
      </div>

      {alertList.map((a, i) => (
        <div key={i} className={a.tone === "bad" ? "rc-urgent-note" : "rc-due-banner"} style={{ marginBottom: 10 }}>
          {a.tone === "warn" && <AlertTriangle size={15} color="var(--gold)" />}
          <span>{a.text}</span>
        </div>
      ))}

      <div className="rc-today-rows">
        <Row
          Icon={Sunrise}
          label="Morning setup"
          detail={
            morning.complete
              ? "All done — ready for service"
              : `${morning.done} of ${morning.total} done${morning.late ? " · running late" : ""}`
          }
          pct={morning.pct}
          tone={morning.complete ? "ok" : morning.late ? "bad" : null}
          onClick={onMorning}
        />

        <Row
          Icon={ChefHat}
          label="Daily prep"
          detail={
            prep.complete
              ? "All prep finished"
              : `${prep.done} of ${prep.total} done`
          }
          pct={prep.pct}
          tone={prep.complete ? "ok" : null}
          onClick={onPrep}
        />

        <Row
          Icon={Thermometer}
          label="Fridge temps"
          detail={
            !temps.done
              ? "Not logged today"
              : temps.issues.length
              ? `${temps.issues.join(", ")} out of range`
              : `Logged by ${temps.by || "staff"} — all in range`
          }
          tone={!temps.done ? "warn" : temps.issues.length ? "bad" : "ok"}
          onClick={onTemps}
        />

        {orders.length > 0 && (
          <Row
            Icon={Truck}
            label="Order today"
            detail={orders.map((o) => o.name).join(", ")}
            tone="warn"
            onClick={onOrders}
          />
        )}
      </div>
    </div>
  );
}