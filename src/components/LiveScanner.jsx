import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Zap, ZapOff, Camera, Image as ImageIcon, RotateCcw } from "lucide-react";
import { detectDocument } from "../utils/detectEdges";
import { warpToRect } from "../utils/perspective";
import { enhanceCanvas } from "../utils/scanFilter";

const STEADY_FRAMES = 8;      // consecutive good frames before capture
const MOVE_TOLERANCE = 0.035; // how much drift still counts as "held still"

export default function LiveScanner({ onCapture, onCancel, onPickFile }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);   // hidden working canvas
  const overlayRef = useRef(null);
  const rafRef = useRef(0);
  const streamRef = useRef(null);
  const lastQuad = useRef(null);
  const steadyCount = useRef(0);
  const capturedRef = useRef(false);

  const [status, setStatus] = useState("starting"); // starting | hunting | found | steady | error
  const [torch, setTorch] = useState(false);
  const [torchable, setTorchable] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [manualOnly, setManualOnly] = useState(false);

  // ---- camera ----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.();
        setTorchable(Boolean(caps?.torch));
        setStatus("hunting");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch }] });
      setTorch((t) => !t);
    } catch {
      /* not supported */
    }
  };

  // ---- capture ---------------------------------------------------------
  const grabFrame = useCallback((scale = 1) => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d", { willReadFrequently: true }).drawImage(v, 0, 0, c.width, c.height);
    return c;
  }, []);

  const capture = useCallback(
    (quad) => {
      if (capturedRef.current) return;
      capturedRef.current = true;
      cancelAnimationFrame(rafRef.current);

      const full = grabFrame(1);
      if (!full) {
        capturedRef.current = false;
        return;
      }

      let out = full;
      if (quad) {
        const warped = warpToRect(full, quad);
        if (warped) out = warped;
      }
      const { dataUrl } = enhanceCanvas(out);

      streamRef.current?.getTracks().forEach((t) => t.stop());
      onCapture(dataUrl);
    },
    [grabFrame, onCapture]
  );

  const shootNow = () => {
    capture(lastQuad.current);
  };

  // ---- detection loop --------------------------------------------------
  useEffect(() => {
    if (status === "starting" || status === "error") return;

    let running = true;
    let frame = 0;

    const tick = () => {
      if (!running || capturedRef.current) return;
      frame++;

      // Detect every 3rd frame — plenty responsive, much lighter on battery
      if (frame % 3 === 0) {
        const small = grabFrame(0.35);
        if (small) {
          const quad = detectDocument(small);
          const overlay = overlayRef.current;

          if (quad) {
            // Scale back up to video coordinates
            const v = videoRef.current;
            const sx = v.videoWidth / small.width;
            const sy = v.videoHeight / small.height;
            const scaled = quad.map((p) => ({ x: p.x * sx, y: p.y * sy }));

            // Steady if it hasn't drifted much since the last hit
            const prev = lastQuad.current;
            let steady = false;
            if (prev) {
              const drift =
                prev.reduce(
                  (s, p, i) => s + Math.hypot(p.x - scaled[i].x, p.y - scaled[i].y),
                  0
                ) / 4;
              steady = drift / v.videoWidth < MOVE_TOLERANCE;
            }

            lastQuad.current = scaled;
            steadyCount.current = steady ? steadyCount.current + 1 : 0;

            drawOverlay(overlay, scaled, videoRef.current, steadyCount.current);

            if (!manualOnly && steadyCount.current >= STEADY_FRAMES) {
              setStatus("steady");
              capture(scaled);
              return;
            }
            setStatus(steadyCount.current > 2 ? "steady" : "found");
            setCountdown(Math.max(0, STEADY_FRAMES - steadyCount.current));
          } else {
            lastQuad.current = null;
            steadyCount.current = 0;
            drawOverlay(overlay, null, videoRef.current, 0);
            setStatus("hunting");
            setCountdown(0);
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [status === "starting", status === "error", grabFrame, capture, manualOnly]);

  // ---- overlay drawing -------------------------------------------------
  function drawOverlay(canvas, quad, video, steady) {
    if (!canvas || !video?.videoWidth) return;
    const rect = video.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!quad) return;

    // Video is object-fit: cover — work out the visible crop
    const vAspect = video.videoWidth / video.videoHeight;
    const cAspect = canvas.width / canvas.height;
    let scale, offX = 0, offY = 0;
    if (vAspect > cAspect) {
      scale = canvas.height / video.videoHeight;
      offX = (canvas.width - video.videoWidth * scale) / 2;
    } else {
      scale = canvas.width / video.videoWidth;
      offY = (canvas.height - video.videoHeight * scale) / 2;
    }

    const pts = quad.map((p) => ({ x: p.x * scale + offX, y: p.y * scale + offY }));
    const locked = steady >= STEADY_FRAMES - 3;
    const colour = locked ? "#7FBF5F" : "#D9662C";

    ctx.save();
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = locked ? "rgba(127,191,95,0.16)" : "rgba(217,102,44,0.12)";
    ctx.fill();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Corner ticks
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    pts.forEach((p, i) => {
      const next = pts[(i + 1) % 4];
      const prev = pts[(i + 3) % 4];
      [next, prev].forEach((n) => {
        const dx = n.x - p.x;
        const dy = n.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const t = Math.min(26, len * 0.25) / len;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + dx * t, p.y + dy * t);
        ctx.stroke();
      });
    });
    ctx.restore();
  }

  // ---- fallback --------------------------------------------------------
  if (status === "error") {
    return (
      <div className="rc-scroll-area">
        <button onClick={onCancel} className="rc-back-btn">← Back</button>
        <div className="rc-namegate">
          <div className="rc-namegate-title">Camera unavailable</div>
          <div className="rc-namegate-sub" style={{ maxWidth: 300 }}>
            The browser couldn't open the camera. Check the permission in your
            browser settings, or pick a photo instead.
          </div>
          <button onClick={onPickFile} className="rc-submit-btn rc-submit-active">
            <ImageIcon size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Choose a photo
          </button>
        </div>
      </div>
    );
  }

  const hint =
    status === "starting"
      ? "Starting camera…"
      : status === "hunting"
      ? "Point at the invoice — fit the whole page in frame"
      : status === "steady"
      ? "Hold still…"
      : "Edges found — hold steady";

  return (
    <div className="rc-live">
      <div className="rc-live-video-wrap">
        <video ref={videoRef} playsInline muted className="rc-live-video" />
        <canvas ref={overlayRef} className="rc-live-overlay" />

        <button onClick={onCancel} className="rc-live-close" aria-label="Cancel">
          <X size={20} />
        </button>

        {torchable && (
          <button onClick={toggleTorch} className="rc-live-torch" aria-label="Torch">
            {torch ? <Zap size={19} /> : <ZapOff size={19} />}
          </button>
        )}

        <div className={`rc-live-hint ${status === "steady" ? "rc-live-hint-on" : ""}`}>
          {hint}
          {!manualOnly && countdown > 0 && countdown < STEADY_FRAMES && (
            <span className="rc-live-dots">
              {Array.from({ length: STEADY_FRAMES }).map((_, i) => (
                <i key={i} className={i < STEADY_FRAMES - countdown ? "on" : ""} />
              ))}
            </span>
          )}
        </div>
      </div>

      <div className="rc-live-bar">
        <button onClick={onPickFile} className="rc-live-side" aria-label="Choose photo">
          <ImageIcon size={20} />
        </button>

        <button onClick={shootNow} className="rc-live-shutter" aria-label="Capture">
          <Camera size={22} />
        </button>

        <button
          onClick={() => setManualOnly((m) => !m)}
          className={`rc-live-side ${manualOnly ? "rc-live-side-on" : ""}`}
          aria-label="Toggle auto capture"
          title={manualOnly ? "Auto capture off" : "Auto capture on"}
        >
          <RotateCcw size={20} />
        </button>
      </div>

      <div className="rc-live-caption">
        {manualOnly ? "Auto capture off — tap the button" : "Captures automatically when steady"}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}