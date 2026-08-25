import React, { useRef, useEffect, useState, useCallback } from "react";
import { Check, RotateCcw, Maximize2, X, Scan } from "lucide-react";
import { warpToRect } from "../utils/perspective";
import { enhanceCanvas } from "../utils/scanFilter";
import { detectDocument } from "../utils/detectEdges";

export default function CropView({ canvas, onDone, onCancel }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [display, setDisplay] = useState({ w: 0, h: 0, scale: 1 });
  const [corners, setCorners] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [detected, setDetected] = useState(false);

  const insetCorners = useCallback(() => {
    const ix = canvas.width * 0.08;
    const iy = canvas.height * 0.08;
    return [
      { x: ix, y: iy },
      { x: canvas.width - ix, y: iy },
      { x: canvas.width - ix, y: canvas.height - iy },
      { x: ix, y: canvas.height - iy },
    ];
  }, [canvas]);

  // Fit the photo to the available width, then try to find the paper
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !canvas) return;

    const avail = wrap.clientWidth;
    const scale = avail / canvas.width;
    setDisplay({ w: avail, h: Math.round(canvas.height * scale), scale });

    // Let the first paint land before running detection
    const t = setTimeout(() => {
      const found = detectDocument(canvas);
      setCorners(found || insetCorners());
      setDetected(Boolean(found));
    }, 30);

    return () => clearTimeout(t);
  }, [canvas, insetCorners]);

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
    if (dragging === null) return;

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
  }, [dragging, pointFromEvent, canvas]);

  const redetect = () => {
    const found = detectDocument(canvas);
    if (found) {
      setCorners(found);
      setDetected(true);
    } else {
      setCorners(insetCorners());
      setDetected(false);
    }
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
    const warped = warpToRect(canvas, corners);
    if (!warped) return;
    const { dataUrl } = enhanceCanvas(warped);
    onDone(dataUrl);
  };

  if (!corners) {
    return (
      <div className="rc-scroll-area">
        <div className="rc-namegate">
          <div className="rc-namegate-sub">Finding the edges…</div>
        </div>
      </div>
    );
  }

  const pts = corners.map((c) => ({
    x: c.x * display.scale,
    y: c.y * display.scale,
  }));
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

      <div ref={wrapRef} className="rc-crop-wrap" style={{ height: display.h }}>
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

      <button onClick={apply} className="rc-submit-btn rc-submit-active">
        <Check size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
        Scan this area
      </button>
    </div>
  );
}