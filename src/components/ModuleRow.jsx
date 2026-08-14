import React from "react";
import { ChevronRight } from "lucide-react";

export default function ModuleRow({ mod, onOpen }) {
  const Icon = mod.icon;
  const done = mod.items.filter((i) => i.done).length;
  return (
    <button onClick={() => onOpen(mod)} className="rc-module-row">
      <div className="rc-module-icon" style={{ background: mod.color + "22" }}>
        <Icon size={20} color={mod.color} />
      </div>
      <div className="rc-module-info">
        <div className="rc-module-title">{mod.title}</div>
        <div className="rc-module-sub">
          {done}/{mod.items.length} watched{mod.items.length > 1 ? ` · ${mod.items.length} videos` : ""}
        </div>
      </div>
      <ChevronRight size={18} color="#5C5548" />
    </button>
  );
}
