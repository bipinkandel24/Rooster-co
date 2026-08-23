import React, { useState, useEffect, useCallback } from "react";
import { Lock, Mail, KeyRound, RotateCcw } from "lucide-react";

// Codes last 10 minutes server-side. Wait this long before offering a resend,
// so a double-tap doesn't burn one of the 5 sends allowed per 15 minutes.
const RESEND_COOLDOWN_S = 30;

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function OwnerGate({ ownerEmail, onUnlock, title = "Ordering Portal" }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [sentAt, setSentAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  // Only tick while the countdown is on screen.
  useEffect(() => {
    if (step !== "code") return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  const secondsLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : null;
  const expired = secondsLeft === 0;
  const resendIn = sentAt
    ? Math.max(0, Math.ceil((sentAt + RESEND_COOLDOWN_S * 1000 - now) / 1000))
    : 0;

  const requestCode = useCallback(
    async (isResend) => {
      setErr("");
      setNote("");
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
        setExpiresAt(typeof d.expiresAt === "number" ? d.expiresAt : null);
        setSentAt(Date.now());
        setNow(Date.now());
        setCode("");
        setStep("code");
        if (isResend) setNote("New code sent.");
      } catch {
        setErr("Couldn't send the code. Check your connection.");
      } finally {
        setBusy(false);
      }
    },
    [email]
  );

  const submitEmail = () => {
    if (email.trim().toLowerCase() !== ownerEmail.toLowerCase()) {
      setErr("That email isn't authorised.");
      return;
    }
    requestCode(false);
  };

  const submitCode = useCallback(
    async (value) => {
      const entered = (value ?? code).trim();
      if (entered.length === 0 || busy) return;

      setErr("");
      setNote("");
      setBusy(true);
      try {
        const r = await fetch("/api/verify-otp", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), code: entered }),
        });
        const d = await r.json().catch(() => ({}));
        if (d.ok) {
          onUnlock();
          return;
        }
        if (r.status === 429) {
          setErr(d.error || "Too many attempts. Request a new code.");
          setExpiresAt(null);
        } else if (d.reason === "expired") {
          setErr("That code has expired.");
          setExpiresAt(null);
        } else if (typeof d.attemptsLeft === "number" && d.attemptsLeft > 0) {
          setErr(`Wrong code. ${d.attemptsLeft} attempt${d.attemptsLeft === 1 ? "" : "s"} left.`);
        } else {
          setErr("Wrong code. Request a new one.");
          setExpiresAt(null);
        }
        setCode("");
      } catch {
        setErr("Couldn't verify. Check your connection.");
      } finally {
        setBusy(false);
      }
    },
    [busy, code, email, onUnlock]
  );

  // A 6-digit code is always the whole code — submit without a button press.
  const onCodeChange = (raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) submitCode(digits);
  };

  const startOver = () => {
    setStep("email");
    setErr("");
    setNote("");
    setCode("");
    setExpiresAt(null);
    setSentAt(null);
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
            : `Enter the 6-digit code sent to ${email}`}
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
            {err && <div className="rc-gate-err" role="alert">{err}</div>}
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
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
                className="rc-name-input rc-input-flush"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCode()}
                disabled={busy}
              />
            </div>

            {/* Tell the owner where they stand before they get it wrong. */}
            {!err && !expired && secondsLeft !== null && (
              <div className="rc-gate-hint">Code expires in {mmss(secondsLeft)}</div>
            )}
            {!err && expired && (
              <div className="rc-gate-hint">That code has expired — request a new one.</div>
            )}
            {note && <div className="rc-gate-hint rc-gate-hint-ok" role="status">{note}</div>}
            {err && <div className="rc-gate-err" role="alert">{err}</div>}

            <button
              onClick={() => submitCode()}
              disabled={busy || code.length === 0 || expired}
              className={`rc-submit-btn ${code.length > 0 && !expired ? "rc-submit-active" : ""}`}
            >
              {busy ? "Checking…" : "Enter"}
            </button>

            <button
              onClick={() => requestCode(true)}
              disabled={busy || resendIn > 0}
              className="rc-switch-btn"
              style={{ marginTop: 14 }}
            >
              <RotateCcw size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Send a new code"}
            </button>

            <button onClick={startOver} className="rc-switch-btn" style={{ marginTop: 10 }}>
              ← Use a different email
            </button>
          </>
        )}
      </div>
    </div>
  );
}
