import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Zap, ZapOff, Camera, Image as ImageIcon } from "lucide-react";
import { detectDocument } from "../utils/detectEdges";
import { warpToRect } from "../utils/perspective";
import { enhanceCanvas } from "../utils/scanFilter";

const MOVE_TOLERANCE = 0.018; // drift below this counts as holding still
const MIN_COVERAGE = 0.25;    // page must fill at least this much of the frame
const SHARP_MIN = 120;        // Laplacian variance below this is too soft

// Rough sharpness score — blurry frames score low.
function sharpness(canvas) {
  const w = Math.min(220, canvas.width);
  const scale = w / canvas.width;
  const h = Math.max(2, Math.round(canvas.height * scale));

  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;

  const g = new Float32Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    g[p] = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
  }

  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

function quadArea(q) {
  return (
    Math.abs(
      q[0].x * q[1].y - q[1].x * q[0].y +
      (q[1].x * q[2].y - q[2].x * q[1].y) +
      (q[2].x * q[3].y - q[3].x * q[2].y) +
      (q[3].x * q[0].y - q[0].x * q[3].y)
    ) / 2
  );
}

export default function LiveScanner({ onCapture, onCancel, onPickFile }) {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const rafRef = useRef(0);
  const streamRef = useRef(null);
  const lastQuad = useRef(null);
  const steadyRef = useRef(0);
  const capturedRef = useRef(false);

  const [status, setStatus] = useState("starting"); // starting | hunting | close | blurry | ready | error
  const [torch, setTorch] = useState(false);
  const [torchable, setTorchable] = useState(false);

  // ---- camera ----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 3840 },
            height: { ideal: 2160 },
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
        const caps = track.getCapabilities?.() || {};
        setTorchable(Boolean(caps.torch));

        try {
          if (caps.focusMode?.includes("continuous")) {
            await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
          }
        } catch {
          /* not supported */
        }

        // Let the sensor settle before we start judging frames
        setTimeout(() => {
          if (!cancelled) setStatus("hunting");
        }, 900);
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

  // ---- frame grab ------------------------------------------------------
  const grabFrame = useCallback((scale = 1) => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d", { willReadFrequently: true }).drawImage(v, 0, 0, c.width, c.height);
    return c;
  }, []);

  // ---- capture (manual) ------------------------------------------------
  const shootNow = useCallback(() => {
    if (capturedRef.current) return;
    capturedRef.current = true;
    cancelAnimationFrame(rafRef.current);

    const full = grabFrame(1);
    if (!full) {
      capturedRef.current = false;
      return;
    }

    let out = full;
    const quad = lastQuad.current;
    if (quad) {
      const warped = warpToRect(full, quad, 2600);
      if (warped) out = warped;
    }
    const { dataUrl } = enhanceCanvas(out);

    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(dataUrl);
  }, [grabFrame, onCapture]);

  // ---- overlay ---------------------------------------------------------
  const drawOverlay = useCallback((quad, ready) => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video?.videoWidth) return;

    const rect = video.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!quad) return;

    // Video uses object-fit: cover — map source pixels to displayed pixels
    const vAspect = video.videoWidth / video.videoHeight;
    const cAspect = canvas.width / canvas.height;
    let scale;
    let offX = 0;
    let offY = 0;
    if (vAspect > cAspect) {
      scale = canvas.height / video.videoHeight;
      offX = (canvas.width - video.videoWidth * scale) / 2;
    } else {
      scale = canvas.width / video.videoWidth;
      offY = (canvas.height - video.videoHeight * scale) / 2;
    }

    const pts = quad.map((p) => ({ x: p.x * scale + offX, y: p.y * scale + offY }));
    const colour = ready ? "#7FBF5F" : "#D9662C";

    ctx.save();
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = ready ? "rgba(127,191,95,0.16)" : "rgba(217,102,44,0.10)";
    ctx.fill();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Corner ticks
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    pts.forEach((p, i) => {
      [pts[(i + 1) % 4], pts[(i + 3) % 4]].forEach((n) => {
        const dx = n.x - p.x;
        const dy = n.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const t = Math.min(28, len * 0.25) / len;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + dx * t, p.y + dy * t);
        ctx.stroke();
      });
    });
    ctx.restore();
  }, []);

  // ---- detection loop --------------------------------------------------
  useEffect(() => {
    if (status === "starting" || status === "error") return;

    let running = true;
    let frame = 0;

    const tick = () => {
      if (!running || capturedRef.current) return;
      frame++;

      if (frame % 3 === 0) {
        const small = grabFrame(0.35);
        if (small) {
          let quad = detectDocument(small);

          // Too small in frame to read reliably
          if (quad && quadArea(quad) / (small.width * small.height) < MIN_COVERAGE) {
            quad = null;
            setStatus("close");
          }

          if (quad) {
            const v = videoRef.current;
            const sx = v.videoWidth / small.width;
            const sy = v.videoHeight / small.height;
            const scaled = quad.map((p) => ({ x: p.x * sx, y: p.y * sy }));

            const prev = lastQuad.current;
            let still = false;
            if (prev) {
              const drift =
                prev.reduce((s, p, i) => s + Math.hypot(p.x - scaled[i].x, p.y - scaled[i].y), 0) / 4;
              still = drift / v.videoWidth < MOVE_TOLERANCE;
            }
            lastQuad.current = scaled;
            steadyRef.current = still ? steadyRef.current + 1 : 0;

            const sharp = sharpness(small);
            const ready = steadyRef.current >= 4 && sharp >= SHARP_MIN;

            drawOverlay(scaled, ready);
            setStatus(ready ? "ready" : sharp < SHARP_MIN ? "blurry" : "hunting");
          } else {
            lastQuad.current = null;
            steadyRef.current = 0;
            drawOverlay(null, false);
            setStatus((s) => (s === "close" ? "close" : "hunting"));
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
  }, [status === "starting", status === "error", grabFrame, drawOverlay]);

  // ---- camera unavailable ---------------------------------------------
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

  const ready = status === "ready";
  const hint =
    status === "starting"
      ? "Starting camera…"
      : status === "close"
      ? "Move closer — fill the frame with the invoice"
      : status === "blurry"
      ? "Hold still — waiting for focus"
      : ready
      ? "Sharp and steady — tap to capture"
      : "Point at the invoice";

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

        <div className={`rc-live-hint ${ready ? "rc-live-hint-on" : ""}`}>{hint}</div>
      </div>

      <div className="rc-live-bar">
        <button onClick={onPickFile} className="rc-live-side" aria-label="Choose photo">
          <ImageIcon size={20} />
        </button>

        <button
          onClick={shootNow}
          className={`rc-live-shutter ${ready ? "rc-live-shutter-ready" : ""}`}
          aria-label="Capture"
        >
          <Camera size={22} />
        </button>

        <div className="rc-live-side rc-live-side-ghost" />
      </div>

      <div className="rc-live-caption">
        {ready ? "Ready — tap the button" : "Green outline means it's sharp enough"}
      </div>
    </div>
  );
}