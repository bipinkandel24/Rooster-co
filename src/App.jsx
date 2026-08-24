import React, { useState, useEffect, useCallback } from "react";
import { ChefHat, ShieldAlert, ClipboardList, Menu, Sun, Moon } from "lucide-react";

import logo from "./assets/logo.png";
import "./index.css";

import Header from "./components/Header";
import ModuleRow from "./components/ModuleRow";
import ModuleDetail from "./components/ModuleDetail";
import VideoPlayer from "./components/VideoPlayer";
import CleaningSection from "./components/CleaningSection";
import DailyPrep from "./components/DailyPrep";
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
import { DAILY_PREP_IDS } from "./data/dailyPrep";

const OWNER_EMAIL = "roostermanager8@gmail.com";

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
  const [showPrep, setShowPrep] = useState(false);

  // Cleaning: two independent areas, each with its own name + progress
  const [cleaningArea, setCleaningArea] = useState(null);
  const [cleanNames, setCleanNames] = useState({ foh: null, back: null });
  const [cleanChecked, setCleanChecked] = useState({
    foh: Array(FRONT_CHECKLIST.length).fill(false),
    back: Array(BACK_CHECKLIST.length).fill(false),
  });

  const [showOrders, setShowOrders] = useState(false);
  const [showMgmt, setShowMgmt] = useState(false);
  const [showIncident, setShowIncident] = useState(false);
  const [showTemps, setShowTemps] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Owner status is whatever the server says about the session cookie — the
  // client can't grant it to itself. null = still checking.
  const [ownerOk, setOwnerOk] = useState(null);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("rc_theme") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/session", { credentials: "same-origin" });
        const d = await r.json();
        if (!cancelled) setOwnerOk(Boolean(d.signedIn));
      } catch {
        if (!cancelled) setOwnerOk(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allMods = tab === "kitchen" ? kitchenMods : tab === "safety" ? safetyMods : [];
  const setMods = tab === "kitchen" ? setKitchenMods : setSafetyMods;
  const openMod = allMods.find((m) => m.id === openId);

  // Daily prep pulls its modules out of the normal kitchen list
  const prepMods = kitchenMods.filter((m) => DAILY_PREP_IDS.includes(m.id));
  const otherKitchenMods = kitchenMods.filter((m) => !DAILY_PREP_IDS.includes(m.id));

  const ownerArea = showOrders || showMgmt;
  const hidden = ownerArea || showIncident || showTemps || showPrep;

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
    setShowPrep(false);
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

  // ---- Cleaning handlers ----
  const setCleanName = (area, name) => {
    setCleanNames((p) => ({ ...p, [area]: name }));
    if (name === null) {
      // Signing out of an area clears that area's ticks so the next
      // person starts fresh rather than inheriting someone else's progress.
      setCleanChecked((p) => ({
        ...p,
        [area]: Array(p[area].length).fill(false),
      }));
    }
  };

  const toggleClean = (area, i) =>
    setCleanChecked((p) => ({
      ...p,
      [area]: p[area].map((v, idx) => (idx === i ? !v : v)),
    }));

  const goTab = (t) => {
    setTab(t);
    setOpenId(null);
    setCleaningArea(null);
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

  const ownerLogout = useCallback(async () => {
    try {
      await fetch("/api/session", { method: "DELETE", credentials: "same-origin" });
    } catch {
      /* clearing local state below is still worth doing */
    }
    setOwnerOk(false);
    setShowOrders(false);
    setShowMgmt(false);
  }, []);

  // Called when an owner-only request comes back 401 (session expired).
  const sessionExpired = useCallback(() => setOwnerOk(false), []);

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

        {/* DAILY PREP — flattened checklist, videos behind a code */}
        {showPrep && (
          <DailyPrep
            mods={prepMods}
            onBack={() => setShowPrep(false)}
            onPlay={(src, label) => setPlayingVideo({ src, label })}
          />
        )}

        {/* INCIDENT REPORT — open to all staff, no login */}
        {showIncident && <IncidentReport onBack={() => setShowIncident(false)} />}

        {/* TEMPERATURE LOG — open to all staff, no login */}
        {showTemps && <TempLog onBack={() => setShowTemps(false)} />}

        {/* OWNER-ONLY PORTALS */}
        {ownerArea && ownerOk === null && (
          <div className="rc-scroll-area">
            <div className="rc-namegate">
              <div className="rc-namegate-sub">Checking your session…</div>
            </div>
          </div>
        )}
        {ownerArea && ownerOk === false && (
          <OwnerGate
            ownerEmail={OWNER_EMAIL}
            onUnlock={() => setOwnerOk(true)}
            title={showMgmt ? "Management Portal" : "Ordering Portal"}
          />
        )}
        {ownerArea && ownerOk === true && (
          showMgmt ? (
            <ManagementPortal
              onBack={() => setShowMgmt(false)}
              onLogout={ownerLogout}
              onSessionExpired={sessionExpired}
            />
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
              <button onClick={() => setShowPrep(true)} className="rc-prep-card">
                <div className="rc-prep-card-title">Daily Prep</div>
                <div className="rc-prep-card-sub">
                  Hot food, salads, sauces — everything before service
                </div>
              </button>

              {otherKitchenMods.map((m) => (
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
        {!hidden && tab === "cleaning" && (
          <>
            <Header eyebrow="Every Night" title="Cleaning" Icon={ClipboardList} />
            <CleaningSection
              area={cleaningArea}
              onOpenArea={setCleaningArea}
              onBackToAreas={() => setCleaningArea(null)}
              names={cleanNames}
              onSetName={setCleanName}
              checked={cleanChecked}
              onToggle={toggleClean}
              lists={{ foh: FRONT_CHECKLIST, back: BACK_CHECKLIST }}
              ownerEmail={OWNER_EMAIL}
            />
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