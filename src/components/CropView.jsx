import React, { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import { Check, RotateCcw, Maximize2, X, Scan } from "lucide-react";
import { warpToRect } from "../utils/perspective";
import { enhanceCanvas } from "../utils/scanFilter";
import { detectDocument } from "../utils/detectEdges";

const inset = (canvas) => {
  const ix = canvas.width * 0.08;
  const iy = canvas.height * 0.08;
  return [
    { x: ix, y: iy },
    { x: canvas.width - ix, y: iy },
    { x: canvas.width - ix, y: canvas.height - iy },
    { x: ix, y: canvas.height - iy },
  ];
};

export default function CropView({ canvas, onDone, onCancel }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [display, setDisplay] = useState({ w: 0, h: 0, scale: 0 });
  // Never null — otherwise the early return stops the ref from ever attaching
  const [corners, setCorners] = useState(() => inset(canvas));
  const [dragging, setDragging] = useState(null);
  const [detected, setDetected] = useState(false);

  const insetCorners = useCallback(() => inset(canvas), [canvas]);

  // Measure after layout, retrying until the container has a real width
  useLayoutEffect(() => {
    let raf = 0;

    const measure = () => {
      const wrap = wrapRef.current;
      if (!wrap || !canvas?.width) return;

      const avail = wrap.clientWidth;
      if (!avail) {
        raf = requestAnimationFrame(measure);
        return;
      }
      const scale = avail / canvas.width;
      setDisplay({ w: avail, h: Math.round(canvas.height * scale), scale });
    };

    measure();

    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [canvas]);

  // Try to find the paper once the photo is on screen
  useEffect(() => {
    if (!display.w) return;
    const t = setTimeout(() => {
      try {
        const started = performance.now();
        const found = detectDocument(canvas);
        if (found && performance.now() - started < 3000) {
          setCorners(found);
          setDetected(true);
        }
      } catch {
        /* keep the manual corners */
      }
    }, 60);
    return () => clearTimeout(t);
  }, [canvas, display.w]);

  // Paint the photo into the visible canvas
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !canvas || !display.w) return;
    c.width = display.w;
    c.height = display.h;
    c.getContext("2d").drawImage(canvas, 0, 0, display.w, display.h);
  }, [canvas, display]);

  const pointFromEvent = useCallback(
    (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const t = e.touches?.[0] || e;
      return {
        x: (t.clientX - rect.left) / display.scale,
        y: (t.clientY - rect.top) / display.scale,
      };
    },
    [display.scale]
  );

  const start = (i) => (e) => {
    e.preventDefault();
    setDragging(i);
  };

  useEffect(() => {
    if (dragging === null || !display.scale) return;

    const move = (e) => {
      e.preventDefault();
      const p = pointFromEvent(e);
      setCorners((prev) =>
        prev.map((c, i) =>
          i === dragging
            ? {
                x: Math.max(0, Math.min(canvas.width, p.x)),
                y: Math.max(0, Math.min(canvas.height, p.y)),
              }
            : c
        )
      );
    };
    const end = () => setDragging(null);

    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("mouseup", end);
    window.addEventListener("touchend", end);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchend", end);
    };
  }, [dragging, pointFromEvent, canvas, display.scale]);

  const redetect = () => {
    try {
      const found = detectDocument(canvas);
      if (found) {
        setCorners(found);
        setDetected(true);
        return;
      }
    } catch {
      /* fall through */
    }
    setCorners(insetCorners());
    setDetected(false);
  };

  const reset = () => {
    setCorners(insetCorners());
    setDetected(false);
  };

  const useWhole = () => {
    setCorners([
      { x: 0, y: 0 },
      { x: canvas.width, y: 0 },
      { x: canvas.width, y: canvas.height },
      { x: 0, y: canvas.height },
    ]);
    setDetected(false);
  };

  const apply = () => {
    try {
      const warped = warpToRect(canvas, corners);
      if (!warped) return;
      const { dataUrl } = enhanceCanvas(warped);
      onDone(dataUrl);
    } catch {
      // Fall back to the uncropped photo rather than losing the scan
      onDone(canvas.toDataURL("image/jpeg", 0.82));
    }
  };

  const ready = display.w > 0 && display.scale > 0;
  const pts = ready
    ? corners.map((c) => ({ x: c.x * display.scale, y: c.y * display.scale }))
    : [];
  const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="rc-scroll-area">
      <button onClick={onCancel} className="rc-back-btn">← Cancel</button>

      <div className="rc-detail-heading">
        <div>
          <h2 className="rc-detail-title">Line up the paper</h2>
          <div className="rc-stock-unit">
            {detected
              ? "Edges found — adjust the corners if needed"
              : "Drag the corners to the edges of the invoice"}
          </div>
        </div>
      </div>

      {/* The wrap always renders so the ref can attach and be measured */}
      <div
        ref={wrapRef}
        className="rc-crop-wrap"
        style={{ height: ready ? display.h : 220 }}
      >
        {ready && (
          <>
            <canvas ref={canvasRef} className="rc-crop-canvas" />

            <svg className="rc-crop-overlay" width={display.w} height={display.h}>
              <defs>
                <mask id="rc-hole">
                  <rect width={display.w} height={display.h} fill="white" />
                  <polygon points={poly} fill="black" />
                </mask>
              </defs>
              <rect
                width={display.w}
                height={display.h}
                fill="rgba(0,0,0,0.55)"
                mask="url(#rc-hole)"
              />
              <polygon points={poly} fill="none" stroke="#D9662C" strokeWidth="2" />
            </svg>

            {pts.map((p, i) => (
              <div
                key={i}
                className={`rc-crop-handle ${dragging === i ? "rc-crop-handle-on" : ""}`}
                style={{ left: p.x, top: p.y }}
                onMouseDown={start(i)}
                onTouchStart={start(i)}
              />
            ))}
          </>
        )}
      </div>

      <div className="rc-crop-actions">
        <button onClick={redetect} className="rc-icon-btn rc-icon-mail" title="Detect edges again">
          <Scan size={16} />
        </button>
        <button onClick={reset} className="rc-icon-btn" title="Reset corners">
          <RotateCcw size={16} />
        </button>
        <button onClick={useWhole} className="rc-icon-btn" title="Use whole photo">
          <Maximize2 size={16} />
        </button>
        <button onClick={onCancel} className="rc-icon-btn" title="Cancel">
          <X size={16} />
        </button>
      </div>

      <button onClick={apply} disabled={!ready} className={`rc-submit-btn ${ready ? "rc-submit-active" : ""}`}>
        <Check size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
        Scan this area
      </button>
    </div>
  );
}