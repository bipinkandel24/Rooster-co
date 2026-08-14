import React from "react";
import { Play, CheckCircle2, Circle, Clock } from "lucide-react";
import { getVideoUrl } from "../data/content";

export default function ModuleDetail({ mod, onBack, onToggle, onPlay }) {
  const Icon = mod.icon;

  // Treat a module as a plain info list if it's flagged as such,
  // OR if none of its items have a duration (i.e. they aren't videos).
  const isInfo =
    mod.type === "info" ||
    mod.id === "support" ||
    !mod.items.some((v) => v.duration);

  return (
    <div className="rc-scroll-area">
      <button onClick={onBack} className="rc-back-btn">← Back</button>
      <div className="rc-detail-heading">
        <div className="rc-module-icon" style={{ background: mod.color + "22" }}>
          <Icon size={19} color={mod.color} />
        </div>
        <h2 className="rc-detail-title">{mod.title}</h2>
      </div>

      {isInfo ? (
        <ul className="rc-info-list">
          {mod.items.map((v, idx) => (
            <li key={idx} className="rc-info-item">
              {v.label}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rc-video-list">
          {mod.items.map((v, idx) => (
            <div key={idx} className="rc-video-row">
              <button
                onClick={() => onPlay(getVideoUrl(mod.id, idx), v.label)}
                className="rc-video-thumb"
                style={{ background: mod.color + "33" }}
                aria-label={`Play ${v.label}`}
              >
                <Play size={16} color="#EFE7D8" fill="#EFE7D8" />
              </button>
              <div className="rc-video-info" onClick={() => onPlay(getVideoUrl(mod.id, idx), v.label)}>
                <div className="rc-video-title">{v.label}</div>
                <div className="rc-video-meta">
                  <Clock size={11} color="#9C9284" />
                  <span>{v.duration}</span>
                </div>
              </div>
              <button onClick={() => onToggle(mod.id, idx)} className="rc-check-btn" aria-label="Mark watched">
                {v.done ? <CheckCircle2 size={22} color="#7C8F52" /> : <Circle size={22} color="#5C5548" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}