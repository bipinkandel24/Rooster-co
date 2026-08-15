import React, { useState } from "react";
import { ChefHat, ShieldAlert, ClipboardList, Menu, Sun, Moon } from "lucide-react";

import logo from "./assets/logo.png";
import "./index.css";

import Header from "./components/Header";
import ModuleRow from "./components/ModuleRow";
import ModuleDetail from "./components/ModuleDetail";
import VideoPlayer from "./components/VideoPlayer";
import Checklist from "./components/Checklist";
import NameGate from "./components/NameGate";
import OrderPortal from "./components/OrderPortal";
import OwnerGate from "./components/OwnerGate";
import ManagementPortal from "./components/ManagementPortal";
import AssistantChat from "./components/AssistantChat";
import IncidentReport from "./components/IncidentReport";
import TempLog from "./components/TempLog";
import MenuSheet from "./components/MenuSheet";

import {
  KITCHEN_MODULES,
  SAFETY_MODULES,
  FRONT_CHECKLIST,
  BACK_CHECKLIST,
} from "./data/content";

const OWNER_EMAIL = "bipin.kandel24@gmail.com";

const TABS = [
  { id: "kitchen", label: "Kitchen", icon: ChefHat },
  { id: "safety", label: "Safety", icon: ShieldAlert },
  { id: "cleaning", label: "Cleaning", icon: ClipboardList },
];

export default function App() {
  const [tab, setTab] = useState("kitchen");
  const [kitchenMods, setKitchenMods] = useState(KITCHEN_MODULES);
  const [safetyMods, setSafetyMods] = useState(SAFETY_MODULES);
  const [openId, setOpenId] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [frontChecked, setFrontChecked] = useState(Array(FRONT_CHECKLIST.length).fill(false));
  const [backChecked, setBackChecked] = useState(Array(BACK_CHECKLIST.length).fill(false));
  const [cleaningStaffName, setCleaningStaffName] = useState(null);
  const [showOrders, setShowOrders] = useState(false);
  const [showMgmt, setShowMgmt] = useState(false);
  const [showIncident, setShowIncident] = useState(false);
  const [showTemps, setShowTemps] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ownerOk, setOwnerOk] = useState(() => sessionStorage.getItem("rc_owner") === "1");
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("rc_theme") || "dark";
    } catch {
      return "dark";
    }
  });

  const allMods = tab === "kitchen" ? kitchenMods : tab === "safety" ? safetyMods : [];
  const setMods = tab === "kitchen" ? setKitchenMods : setSafetyMods;
  const openMod = allMods.find((m) => m.id === openId);

  const ownerArea = showOrders || showMgmt;
  const hidden = ownerArea || showIncident || showTemps;

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("rc_theme", next);
    } catch {
      /* ignore */
    }
  };

  const closeAll = () => {
    setMenuOpen(false);
    setShowOrders(false);
    setShowMgmt(false);
    setShowIncident(false);
    setShowTemps(false);
  };

  const toggleItem = (modId, idx) => {
    setMods((prev) =>
      prev.map((m) =>
        m.id !== modId
          ? m
          : { ...m, items: m.items.map((v, i) => (i === idx ? { ...v, done: !v.done } : v)) }
      )
    );
  };

  const goTab = (t) => {
    setTab(t);
    setOpenId(null);
    closeAll();
  };

  const openMgmt = () => {
    closeAll();
    setShowMgmt(true);
  };

  const openOrders = () => {
    closeAll();
    setShowOrders(true);
  };

  const openIncident = () => {
    closeAll();
    setShowIncident(true);
  };

  const openTemps = () => {
    closeAll();
    setShowTemps(true);
  };

  const ownerLogout = () => {
    sessionStorage.removeItem("rc_owner");
    setOwnerOk(false);
    setShowOrders(false);
    setShowMgmt(false);
  };

  return (
    <div className={`rc-shell ${theme === "light" ? "light" : ""}`}>
      <div className="rc-frame">
        {/* Brand header */}
        <div className="rc-brand">
          <button
            onClick={toggleTheme}
            className="rc-corner-btn rc-corner-left"
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={theme === "light" ? "Dark mode" : "Light mode"}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <div className="rc-brand-badge">
            <img src={logo} alt="Rooster & Co logo" />
          </div>
          <div className="rc-brand-name">Rooster &amp; Co</div>
          <div className="rc-brand-sub">Staff Training</div>

          <button
            onClick={() => setMenuOpen(true)}
            className="rc-corner-btn"
            aria-label="Open menu"
            title="Menu"
          >
            <Menu size={19} />
          </button>
        </div>

        {/* INCIDENT REPORT — open to all staff, no login */}
        {showIncident && <IncidentReport onBack={() => setShowIncident(false)} />}

        {/* TEMPERATURE LOG — open to all staff, no login */}
        {showTemps && <TempLog onBack={() => setShowTemps(false)} />}

        {/* OWNER-ONLY PORTALS */}
        {ownerArea && !ownerOk && (
          <OwnerGate
            ownerEmail={OWNER_EMAIL}
            onUnlock={() => setOwnerOk(true)}
            title={showMgmt ? "Management Portal" : "Ordering Portal"}
          />
        )}
        {ownerArea && ownerOk && (
          showMgmt ? (
            <ManagementPortal onBack={() => setShowMgmt(false)} onLogout={ownerLogout} />
          ) : (
            <OrderPortal
              onBack={() => setShowOrders(false)}
              onLogout={ownerLogout}
              ownerEmail={OWNER_EMAIL}
            />
          )
        )}

        {/* KITCHEN TAB */}
        {!hidden && tab === "kitchen" && !openMod && (
          <>
            <Header eyebrow="Home" title="Kitchen" Icon={ChefHat} />
            <div className="rc-scroll-area">
              {kitchenMods.map((m) => (
                <ModuleRow key={m.id} mod={m} onOpen={(mod) => setOpenId(mod.id)} />
              ))}
            </div>
          </>
        )}
        {!hidden && tab === "kitchen" && openMod && (
          <ModuleDetail
            mod={openMod}
            onBack={() => setOpenId(null)}
            onToggle={toggleItem}
            onPlay={(src, label) => setPlayingVideo({ src, label })}
          />
        )}

        {/* SAFETY TAB */}
        {!hidden && tab === "safety" && !openMod && (
          <>
            <Header eyebrow="Required" title="Safety" Icon={ShieldAlert} />
            <div className="rc-scroll-area">
              {safetyMods.map((m) => (
                <ModuleRow key={m.id} mod={m} onOpen={(mod) => setOpenId(mod.id)} />
              ))}
            </div>
          </>
        )}
        {!hidden && tab === "safety" && openMod && (
          <ModuleDetail
            mod={openMod}
            onBack={() => setOpenId(null)}
            onToggle={toggleItem}
            onPlay={(src, label) => setPlayingVideo({ src, label })}
          />
        )}

        {/* CLEANING TAB */}
        {!hidden && tab === "cleaning" && !cleaningStaffName && (
          <>
            <Header eyebrow="Every Night" title="Cleaning" Icon={ClipboardList} />
            <div className="rc-scroll-area">
              <NameGate onContinue={(name) => setCleaningStaffName(name)} />
            </div>
          </>
        )}
        {!hidden && tab === "cleaning" && cleaningStaffName && (
          <>
            <Header eyebrow="Every Night" title="Cleaning" Icon={ClipboardList} />
            <div className="rc-scroll-area">
              <div className="rc-signed-in-row">
                <span>
                  Signed in as <strong style={{ color: "var(--text)" }}>{cleaningStaffName}</strong>
                </span>
                <button onClick={() => setCleaningStaffName(null)} className="rc-switch-btn">
                  Not you?
                </button>
              </div>
              <Checklist
                title="Front of House"
                items={FRONT_CHECKLIST}
                checked={frontChecked}
                onToggle={(i) => setFrontChecked((p) => p.map((v, idx) => (idx === i ? !v : v)))}
                staffName={cleaningStaffName}
                ownerEmail={OWNER_EMAIL}
              />
              <Checklist
                title="Back Kitchen"
                items={BACK_CHECKLIST}
                checked={backChecked}
                onToggle={(i) => setBackChecked((p) => p.map((v, idx) => (idx === i ? !v : v)))}
                staffName={cleaningStaffName}
                ownerEmail={OWNER_EMAIL}
              />
            </div>
          </>
        )}

        {/* BOTTOM NAV */}
        <div className="rc-bottom-nav">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id && !hidden;
            return (
              <button
                key={t.id}
                onClick={() => goTab(t.id)}
                className={`rc-nav-btn ${active ? "rc-nav-active" : ""}`}
              >
                <Icon size={20} />
                <span className="rc-nav-label">{t.label}</span>
              </button>
            );
          })}
        </div>

        {playingVideo && (
          <VideoPlayer
            src={playingVideo.src}
            label={playingVideo.label}
            onClose={() => setPlayingVideo(null)}
          />
        )}

        {menuOpen && (
          <MenuSheet
            onClose={() => setMenuOpen(false)}
            onIncident={openIncident}
            onTemps={openTemps}
            onMgmt={openMgmt}
            onOrders={openOrders}
          />
        )}

        {!hidden && <AssistantChat />}
      </div>
    </div>
  );
}