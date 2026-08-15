import React, { useState } from "react";
import { Lock, Mail, KeyRound } from "lucide-react";

// ---- MODE SWITCH ---------------------------------------------------------
// false = passcode only (works right now, no backend needed)
// true  = real email OTP (requires the /api functions deployed on Vercel)
const USE_EMAIL_OTP = true;

// Used only when USE_EMAIL_OTP is false. Change this to whatever you want.
const FALLBACK_PASSCODE = "2468";
// -------------------------------------------------------------------------

export default function OwnerGate({ ownerEmail, onUnlock, title = "Ordering Portal" }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submitEmail = async () => {
    setErr("");
    if (email.trim().toLowerCase() !== ownerEmail.toLowerCase()) {
      setErr("That email isn't authorised.");
      return;
    }
    if (!USE_EMAIL_OTP) {
      setStep("code");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/send-otp", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        // The server explains rate limits and misconfiguration — show that
        // rather than a generic retry prompt the owner can't act on.
        setErr(d.error || "Couldn't send the code. Try again.");
        return;
      }
      setStep("code");
    } catch {
      setErr("Couldn't send the code. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    setErr("");
    if (!USE_EMAIL_OTP) {
      if (code.trim() === FALLBACK_PASSCODE) {
        sessionStorage.setItem("rc_owner", "1");
        onUnlock();
      } else {
        setErr("Wrong code.");
      }
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/verify-otp", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.ok) {
        sessionStorage.setItem("rc_owner", "1");
        onUnlock();
        return;
      }
      if (r.status === 429) {
        setErr(d.error || "Too many attempts. Request a new code.");
        setStep("email");
      } else if (d.reason === "expired") {
        setErr("That code expired. Request a new one.");
        setStep("email");
      } else if (typeof d.attemptsLeft === "number" && d.attemptsLeft > 0) {
        setErr(`Wrong code. ${d.attemptsLeft} attempt${d.attemptsLeft === 1 ? "" : "s"} left.`);
      } else {
        setErr("Wrong code.");
      }
      setCode("");
    } catch {
      setErr("Couldn't verify. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rc-scroll-area">
      <div className="rc-namegate">
        <div className="rc-gate-icon">
          <Lock size={22} color="#E3A94A" />
        </div>
        <div className="rc-namegate-title">{title}</div>
        <div className="rc-namegate-sub">
          {step === "email"
            ? "Owner access only. Enter your email."
            : USE_EMAIL_OTP
            ? `Enter the 6-digit code sent to ${email}`
            : "Enter your access code."}
        </div>

        {step === "email" ? (
          <>
            <div className="rc-input-wrap">
              <Mail size={15} color="#7C7568" />
              <input
                type="email"
                className="rc-name-input rc-input-flush"
                placeholder="owner@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitEmail()}
                autoComplete="email"
              />
            </div>
            {err && <div className="rc-gate-err">{err}</div>}
            <button
              onClick={submitEmail}
              disabled={busy || !email.trim()}
              className={`rc-submit-btn ${email.trim() ? "rc-submit-active" : ""}`}
            >
              {busy ? "Sending…" : "Continue"}
            </button>
          </>
        ) : (
          <>
            <div className="rc-input-wrap">
              <KeyRound size={15} color="#7C7568" />
              <input
                type="tel"
                inputMode="numeric"
                className="rc-name-input rc-input-flush"
                placeholder="Access code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCode()}
              />
            </div>
            {err && <div className="rc-gate-err">{err}</div>}
            <button
              onClick={submitCode}
              disabled={busy || !code.trim()}
              className={`rc-submit-btn ${code.trim() ? "rc-submit-active" : ""}`}
            >
              {busy ? "Checking…" : "Enter"}
            </button>
            <button onClick={() => { setStep("email"); setErr(""); setCode(""); }} className="rc-switch-btn" style={{ marginTop: 14 }}>
              ← Use a different email
            </button>
          </>
        )}
      </div>
    </div>
  );
}