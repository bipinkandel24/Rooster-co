// Find the largest quadrilateral (a sheet of paper) in a canvas.
// Sobel edges → threshold → largest connected blob → convex hull → 4 corners.
// Returns [tl, tr, br, bl] in source pixels, or null if nothing convincing.

function toGreyDownscaled(canvas, target = 400) {
  const scale = Math.min(1, target / Math.max(canvas.width, canvas.height));
  const w = Math.max(40, Math.round(canvas.width * scale));
  const h = Math.max(40, Math.round(canvas.height * scale));

  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, w, h);

  const d = ctx.getImageData(0, 0, w, h).data;
  const grey = new Float32Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    grey[p] = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
  }
  return { grey, w, h, scale: w / canvas.width };
}

function blur(src, w, h) {
  const out = new Float32Array(w * h);
  const k = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let s = 0;
      let i = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          s += src[(y + dy) * w + (x + dx)] * k[i++];
        }
      }
      out[y * w + x] = s / 16;
    }
  }
  return out;
}

function sobel(src, w, h) {
  const mag = new Float32Array(w * h);
  let max = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -src[i - w - 1] - 2 * src[i - 1] - src[i + w - 1] +
        src[i - w + 1] + 2 * src[i + 1] + src[i + w + 1];
      const gy =
        -src[i - w - 1] - 2 * src[i - w] - src[i - w + 1] +
        src[i + w - 1] + 2 * src[i + w] + src[i + w + 1];
      const m = Math.hypot(gx, gy);
      mag[i] = m;
      if (m > max) max = m;
    }
  }
  return { mag, max };
}

// Fill inward from the border of the edge map; whatever isn't reached is
// enclosed by edges — i.e. the sheet of paper.
function interiorMask(edge, w, h) {
  const seen = new Uint8Array(w * h);
  const stack = [];

  for (let x = 0; x < w; x++) {
    stack.push(x, (h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    stack.push(y * w, y * w + w - 1);
  }

  while (stack.length) {
    const i = stack.pop();
    if (i < 0 || i >= w * h || seen[i] || edge[i]) continue;
    seen[i] = 1;
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }

  const inside = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) inside[i] = seen[i] || edge[i] ? 0 : 1;
  return inside;
}

// Largest 4-connected component
function largestBlob(mask, w, h) {
  const label = new Int32Array(w * h).fill(-1);
  let best = null;

  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || label[s] !== -1) continue;
    const pts = [];
    const stack = [s];
    label[s] = s;

    while (stack.length) {
      const i = stack.pop();
      pts.push(i);
      const x = i % w;
      const nb = [];
      if (x > 0) nb.push(i - 1);
      if (x < w - 1) nb.push(i + 1);
      if (i >= w) nb.push(i - w);
      if (i < w * (h - 1)) nb.push(i + w);
      for (const n of nb) {
        if (mask[n] && label[n] === -1) {
          label[n] = s;
          stack.push(n);
        }
      }
    }
    if (!best || pts.length > best.length) best = pts;
  }
  return best;
}

function convexHull(points) {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function polyArea(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const j = (i + 1) % p.length;
    a += p[i].x * p[j].y - p[j].x * p[i].y;
  }
  return Math.abs(a) / 2;
}

// Reduce a hull to the 4 points enclosing the most area
function bestQuad(hull) {
  if (hull.length < 4) return null;
  if (hull.length === 4) return hull;

  let pts = [...hull];
  while (pts.length > 4) {
    let dropIdx = 0;
    let bestArea = -1;
    for (let i = 0; i < pts.length; i++) {
      const trial = pts.filter((_, k) => k !== i);
      const a = polyArea(trial);
      if (a > bestArea) {
        bestArea = a;
        dropIdx = i;
      }
    }
    pts = pts.filter((_, k) => k !== dropIdx);
  }
  return pts;
}

// Order as [tl, tr, br, bl]
function orderCorners(q) {
  const cx = q.reduce((s, p) => s + p.x, 0) / 4;
  const cy = q.reduce((s, p) => s + p.y, 0) / 4;
  const withAngle = q.map((p) => ({ ...p, a: Math.atan2(p.y - cy, p.x - cx) }));
  withAngle.sort((a, b) => a.a - b.a);

  // Rotate so the top-left (smallest x+y) comes first
  let startIdx = 0;
  let bestSum = Infinity;
  withAngle.forEach((p, i) => {
    const s = p.x + p.y;
    if (s < bestSum) {
      bestSum = s;
      startIdx = i;
    }
  });
  const ordered = [];
  for (let i = 0; i < 4; i++) ordered.push(withAngle[(startIdx + i) % 4]);
  return ordered.map(({ x, y }) => ({ x, y }));
}

export function detectDocument(canvas) {
  try {
    const { grey, w, h, scale } = toGreyDownscaled(canvas);
    const sm = blur(grey, w, h);
    const { mag, max } = sobel(sm, w, h);
    if (max < 1) return null;

    // Try a few thresholds — tight first, loosening if nothing is found
    for (const frac of [0.16, 0.11, 0.07]) {
      const t = max * frac;
      const edge = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) edge[i] = mag[i] > t ? 1 : 0;

      const inside = interiorMask(edge, w, h);
      const blob = largestBlob(inside, w, h);
      if (!blob) continue;

      // Must cover a decent share of the frame to be a sheet of paper
      const coverage = blob.length / (w * h);
      if (coverage < 0.12 || coverage > 0.97) continue;

      const pts = blob.map((i) => ({ x: i % w, y: Math.floor(i / w) }));
      const hull = convexHull(pts);
      const quad = bestQuad(hull);
      if (!quad) continue;

      // Reject shapes that lost too much area becoming a quad
      if (polyArea(quad) < polyArea(hull) * 0.75) continue;

      const ordered = orderCorners(quad);

      // Sanity: no absurdly thin result
      const wid = Math.max(
        Math.hypot(ordered[1].x - ordered[0].x, ordered[1].y - ordered[0].y),
        Math.hypot(ordered[2].x - ordered[3].x, ordered[2].y - ordered[3].y)
      );
      const hei = Math.max(
        Math.hypot(ordered[3].x - ordered[0].x, ordered[3].y - ordered[0].y),
        Math.hypot(ordered[2].x - ordered[1].x, ordered[2].y - ordered[1].y)
      );
      const ratio = Math.max(wid, hei) / Math.max(1, Math.min(wid, hei));
      if (ratio > 6) continue;

      // Scale back to full-resolution pixels
      return ordered.map((p) => ({ x: p.x / scale, y: p.y / scale }));
    }
    return null;
  } catch {
    return null;
  }
}