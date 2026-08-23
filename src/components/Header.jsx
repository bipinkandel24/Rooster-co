import React from "react";

export default function Header({ eyebrow, title, Icon }) {
  return (
    <div className="rc-header">
      <div className="rc-header-eyebrow">
        <Icon size={16} color="#D9662C" />
        <span>{eyebrow}</span>
      </div>
      <h1 className="rc-header-title">{title}</h1>
    </div>
  );
}
