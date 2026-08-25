// Turn a raw photo into a clean "scanner output": greyscale, white-balanced,
// contrast-stretched so paper reads as white and ink as black.

function enhanceContext(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;

  // Pass 1 — greyscale, and build a luminance histogram
  const hist = new Uint32Array(256);
  const grey = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < px.length; i += 4, p++) {
    const g = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0;
    grey[p] = g;
    hist[g]++;
  }

  // Black point (2nd percentile) and white point (paper, 75th percentile)
  const total = w * h;
  let acc = 0;
  let black = 0;
  let white = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= total * 0.02) { black = v; break; }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= total * 0.25) { white = v; break; }
  }
  if (white - black < 30) { black = 0; white = 255; } // safety

  // Pass 2 — stretch levels, lift midtones so faint print survives
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    let n = (v - black) / (white - black);
    n = Math.min(1, Math.max(0, n));
    lut[v] = Math.round(Math.pow(n, 0.85) * 255);
  }

  for (let i = 0, p = 0; i < px.length; i += 4, p++) {
    const v = lut[grey[p]];
    px[i] = px[i + 1] = px[i + 2] = v;
    px[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// Clean up a canvas in place and return the result as a JPEG data URL
export function enhanceCanvas(canvas, quality = 0.82) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  enhanceContext(ctx, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { dataUrl, base64: dataUrl.split(",")[1] };
}

// Clean up a File directly (kept for any caller that starts from a photo)
export async function makeScan(file, maxDim = 2000) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);

  enhanceContext(ctx, w, h);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { dataUrl, base64: dataUrl.split(",")[1], width: w, height: h };
}

// Smaller copy of a data URL, for sending to the AI without a huge payload
export async function makeThumbBase64(dataUrl, maxDim = 1500, quality = 0.75) {
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality).split(",")[1];
}