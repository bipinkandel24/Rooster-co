import React, { useState } from "react";
import { ChefHat, ShieldAlert, ClipboardList, Truck, Users } from "lucide-react";

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
  const [ownerOk, setOwnerOk] = useState(() => sessionStorage.getItem("rc_owner") === "1");

  const allMods = tab === "kitchen" ? kitchenMods : tab === "safety" ? safetyMods : [];
  const setMods = tab === "kitchen" ? setKitchenMods : setSafetyMods;
  const openMod = allMods.find((m) => m.id === openId);

  const hidden = showOrders || showMgmt;

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
    setShowOrders(false);
    setShowMgmt(false);
  };

  const openMgmt = () => {
    setShowOrders(false);
    setShowMgmt(true);
  };

  const openOrders = () => {
    setShowMgmt(false);
    setShowOrders(true);
  };

  const ownerLogout = () => {
    sessionStorage.removeItem("rc_owner");
    setOwnerOk(false);
    setShowOrders(false);
    setShowMgmt(false);
  };

  return (
    <div className="rc-shell">
      <div className="rc-frame">
        {/* Brand header */}
        <div className="rc-brand">
          <div className="rc-brand-badge">
            <img src={logo} alt="Rooster & Co logo" />
          </div>
          <div className="rc-brand-name">Rooster &amp; Co</div>
          <div className="rc-brand-sub">Staff Training</div>

          {/* Corner shortcuts → Management + Ordering portals */}
          <div className="rc-corner-group">
            <button
              onClick={openMgmt}
              className="rc-corner-btn"
              aria-label="Management portal"
              title="Management portal"
            >
              <Users size={18} />
            </button>
            <button
              onClick={openOrders}
              className="rc-corner-btn"
              aria-label="Ordering portal"
              title="Ordering portal"
            >
              <Truck size={18} />
            </button>
          </div>
        </div>

        {/* OWNER-ONLY PORTALS */}
        {hidden && !ownerOk && (
          <OwnerGate
            ownerEmail={OWNER_EMAIL}
            onUnlock={() => setOwnerOk(true)}
            title={showMgmt ? "Management Portal" : "Ordering Portal"}
          />
        )}
        {hidden && ownerOk && (
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
                  Signed in as <strong style={{ color: "#EFE7D8" }}>{cleaningStaffName}</strong>
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
        {!hidden && <AssistantChat />}
      </div>
    </div>
  );
}