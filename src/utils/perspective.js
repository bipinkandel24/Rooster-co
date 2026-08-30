// Warp a quadrilateral region of an image into a flat rectangle.
// Uses an inverse homography with bilinear sampling — no dependencies.

function solve(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];
    if (Math.abs(M[col][col]) < 1e-12) return null;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

// Homography mapping destination rect -> source quad
function homography(dst, src) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = dst[i];
    const { x: u, y: v } = src[i];
    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    b.push(v);
  }
  const h = solve(A, b);
  return h ? [...h, 1] : null;
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// corners: [topLeft, topRight, bottomRight, bottomLeft] in image pixels
export function warpToRect(sourceCanvas, corners, maxDim = 2600) {
  const [tl, tr, br, bl] = corners;

  let w = Math.round(Math.max(dist(tl, tr), dist(bl, br)));
  let h = Math.round(Math.max(dist(tl, bl), dist(tr, br)));

  const scale = Math.min(1, maxDim / Math.max(w, h));
  w = Math.max(50, Math.round(w * scale));
  h = Math.max(50, Math.round(h * scale));

  const dstPts = [
    { x: 0, y: 0 },
    { x: w - 1, y: 0 },
    { x: w - 1, y: h - 1 },
    { x: 0, y: h - 1 },
  ];

  const H = homography(dstPts, corners);
  if (!H) return null;

  const sctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const src = sctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const sw = src.width;
  const sh = src.height;
  const sp = src.data;

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d");
  const dstImg = octx.createImageData(w, h);
  const dp = dstImg.data;

  const [a, bb, c, d, e, f, g, i2, k] = H;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const den = g * x + i2 * y + k;
      const u = (a * x + bb * y + c) / den;
      const v = (d * x + e * y + f) / den;

      const p = (y * w + x) * 4;

      if (u < 0 || v < 0 || u > sw - 1 || v > sh - 1) {
        dp[p] = dp[p + 1] = dp[p + 2] = 255;
        dp[p + 3] = 255;
        continue;
      }

      const x0 = Math.floor(u);
      const y0 = Math.floor(v);
      const x1 = Math.min(x0 + 1, sw - 1);
      const y1 = Math.min(y0 + 1, sh - 1);
      const fx = u - x0;
      const fy = v - y0;

      for (let ch = 0; ch < 3; ch++) {
        const p00 = sp[(y0 * sw + x0) * 4 + ch];
        const p10 = sp[(y0 * sw + x1) * 4 + ch];
        const p01 = sp[(y1 * sw + x0) * 4 + ch];
        const p11 = sp[(y1 * sw + x1) * 4 + ch];
        dp[p + ch] =
          p00 * (1 - fx) * (1 - fy) +
          p10 * fx * (1 - fy) +
          p01 * (1 - fx) * fy +
          p11 * fx * fy;
      }
      dp[p + 3] = 255;
    }
  }

  octx.putImageData(dstImg, 0, 0);
  return out;
}

// Load a File into a canvas, downscaled for reasonable performance
export async function fileToCanvas(file, maxDim = 2400) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bitmap.width * scale);
  c.height = Math.round(bitmap.height * scale);
  c.getContext("2d").drawImage(bitmap, 0, 0, c.width, c.height);
  return c;
}