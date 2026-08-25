// Find the largest quadrilateral (a sheet of paper) in a canvas.
// Runs on a small downscale with typed-array queues so it stays fast on phones.

const WORK = 240; // detection resolution — small on purpose

function toGreyDownscaled(canvas, target = WORK) {
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
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      out[i] =
        (src[i - w - 1] + 2 * src[i - w] + src[i - w + 1] +
         2 * src[i - 1] + 4 * src[i] + 2 * src[i + 1] +
         src[i + w - 1] + 2 * src[i + w] + src[i + w + 1]) / 16;
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
      const m = Math.abs(gx) + Math.abs(gy); // cheaper than hypot
      mag[i] = m;
      if (m > max) max = m;
    }
  }
  return { mag, max };
}

// Flood from the border using a typed-array queue; anything unreached and
// not itself an edge is enclosed — i.e. the sheet of paper.
function interiorMask(edge, w, h) {
  const n = w * h;
  const seen = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;

  const push = (i) => {
    if (i < 0 || i >= n || seen[i] || edge[i]) return;
    seen[i] = 1;
    queue[tail++] = i;
  };

  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }

  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < n - w) push(i + w);
  }

  const inside = new Uint8Array(n);
  for (let i = 0; i < n; i++) inside[i] = seen[i] || edge[i] ? 0 : 1;
  return inside;
}

// Largest 4-connected component, returned as a bounds-checked point list
function largestBlob(mask, w, h) {
  const n = w * h;
  const done = new Uint8Array(n);
  const queue = new Int32Array(n);
  let bestPts = null;

  for (let s = 0; s < n; s++) {
    if (!mask[s] || done[s]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = s;
    done[s] = 1;
    const pts = [];

    while (head < tail) {
      const i = queue[head++];
      pts.push(i);
      const x = i % w;
      if (x > 0 && mask[i - 1] && !done[i - 1]) { done[i - 1] = 1; queue[tail++] = i - 1; }
      if (x < w - 1 && mask[i + 1] && !done[i + 1]) { done[i + 1] = 1; queue[tail++] = i + 1; }
      if (i >= w && mask[i - w] && !done[i - w]) { done[i - w] = 1; queue[tail++] = i - w; }
      if (i < n - w && mask[i + w] && !done[i + w]) { done[i + w] = 1; queue[tail++] = i + w; }
    }
    if (!bestPts || pts.length > bestPts.length) bestPts = pts;
  }
  return bestPts;
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

// Pick the 4 hull points furthest toward each corner of the frame — O(n),
// far cheaper than iteratively dropping vertices.
function quadFromHull(hull) {
  if (hull.length < 4) return null;
  let tl = hull[0], tr = hull[0], br = hull[0], bl = hull[0];
  for (const p of hull) {
    if (p.x + p.y < tl.x + tl.y) tl = p;
    if (p.x - p.y > tr.x - tr.y) tr = p;
    if (p.x + p.y > br.x + br.y) br = p;
    if (p.y - p.x > bl.y - bl.x) bl = p;
  }
  const q = [tl, tr, br, bl];
  // Reject if any two corners collapsed onto the same point
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      if (q[i].x === q[j].x && q[i].y === q[j].y) return null;
    }
  }
  return q;
}

export function detectDocument(canvas) {
  try {
    const { grey, w, h, scale } = toGreyDownscaled(canvas);
    const sm = blur(grey, w, h);
    const { mag, max } = sobel(sm, w, h);
    if (max < 1) return null;

    for (const frac of [0.16, 0.10]) {
      const t = max * frac;
      const edge = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) edge[i] = mag[i] > t ? 1 : 0;

      const inside = interiorMask(edge, w, h);
      const blob = largestBlob(inside, w, h);
      if (!blob) continue;

      const coverage = blob.length / (w * h);
      if (coverage < 0.12 || coverage > 0.97) continue;

      const pts = blob.map((i) => ({ x: i % w, y: (i / w) | 0 }));
      const hull = convexHull(pts);
      const quad = quadFromHull(hull);
      if (!quad) continue;

      if (polyArea(quad) < polyArea(hull) * 0.7) continue;

      const wid = Math.max(
        Math.hypot(quad[1].x - quad[0].x, quad[1].y - quad[0].y),
        Math.hypot(quad[2].x - quad[3].x, quad[2].y - quad[3].y)
      );
      const hei = Math.max(
        Math.hypot(quad[3].x - quad[0].x, quad[3].y - quad[0].y),
        Math.hypot(quad[2].x - quad[1].x, quad[2].y - quad[1].y)
      );
      if (Math.max(wid, hei) / Math.max(1, Math.min(wid, hei)) > 6) continue;

      return quad.map((p) => ({ x: p.x / scale, y: p.y / scale }));
    }
    return null;
  } catch {
    return null;
  }
}