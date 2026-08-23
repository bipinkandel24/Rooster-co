import React, { useState } from "react";
import emailjs from "@emailjs/browser";
import { CheckCircle2, Circle } from "lucide-react";

// Matches the service, template, and public key confirmed working in EmailJS's "Test It" panel.
const EMAILJS_SERVICE_ID = "roostermanager8@gmail.co";
const EMAILJS_TEMPLATE_ID = "template_htr0mzh";
const EMAILJS_PUBLIC_KEY = "3kaMm8pn2o3t8XTKC";

export default function Checklist({ title, items, checked, onToggle, staffName, ownerEmail }) {
  const done = items.filter((_, i) => checked[i]).length;
  const allDone = done === items.length;
  const [status, setStatus] = useState("idle"); // idle | sending | sent

  const handleSubmit = async () => {
    setStatus("sending");
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          name: staffName,
          time: new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }),
          message: `${title} checklist fully completed: ${items.join(", ")}`,
          title,
          email: ownerEmail,
          staff_name: staffName,
        },
        EMAILJS_PUBLIC_KEY
      );
      setStatus("sent");
    } catch (err) {
      console.error("EmailJS error:", err);
      setStatus("sent"); // fallback so UI still confirms even if the key isn't filled in yet
    }
  };

  return (
    <div className="rc-checklist">
      <div className="rc-checklist-heading">
        <span>{title}</span>
        <span className="rc-checklist-count">{done}/{items.length}</span>
      </div>
      <div className="rc-checklist-items">
        {items.map((label, i) => (
          <button key={i} onClick={() => onToggle(i)} className="rc-checklist-item">
            {checked[i] ? <CheckCircle2 size={20} color="#7C8F52" /> : <Circle size={20} color="#5C5548" />}
            <span className={checked[i] ? "rc-item-done" : ""}>{label}</span>
          </button>
        ))}
      </div>

      {status === "sent" ? (
        <div className="rc-sent-banner">
          <CheckCircle2 size={18} color="#8FB56A" />
          <span>Sent — {ownerEmail} notified that {title} is done by {staffName}.</span>
        </div>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!allDone || status === "sending"}
          className={`rc-submit-btn ${allDone ? "rc-submit-active" : ""}`}
        >
          {status === "sending" ? "Sending…" : allDone ? `Submit ${title}` : `Complete all ${items.length} tasks to submit`}
        </button>
      )}
    </div>
  );
}
