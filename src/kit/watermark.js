// src/kit/watermark.js
// Deeply Era-Stylized `@Nonstop × ERC` Cut-Out Brand Watermark Engine (22 Art-History Contexts).
// - Uses `@Nonstop` in refined display typography (`Optima`, `Baskerville`, `Didot`, `Futura`, `Menlo`)
// - Optically aligns `@Nonstop`'s cap/x-height centerline 0.0px parallel with the cut-out `ERC` monogram (`往上和ERC平行`)
// - Tight symmetric padding (zero trailing gap after `ERC`) + period-authentic hand-crafted seals, cartouches,
//   impasto oil dabs, stone rubbings, woodblock bokashi, wavy expressionist warp, CRT scanlines, and 8-bit pixel quantization.

import { lerp, clamp, smootherstep } from '../beat/timeline.js';

let _ercImg = null;
let _nonstopImg = null;
let _wmLoadPromise = null;
const _stampCache = new Map();
let _measureCtx = null;

function getMeasureCtx() {
  if (!_measureCtx && typeof document !== 'undefined') {
    const mc = document.createElement('canvas');
    mc.width = 32;
    mc.height = 32;
    _measureCtx = mc.getContext('2d');
  }
  return _measureCtx;
}

export function preloadWatermarkAssets() {
  if (_wmLoadPromise) return _wmLoadPromise;
  if (typeof Image === 'undefined') return Promise.resolve();

  const loadOptional = (url, assignFn) =>
    new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'sync';
      img.onload = () => {
        assignFn(img);
        _stampCache.clear();
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });

  _wmLoadPromise = Promise.all([
    loadOptional('./assets/panels/erc_logo_cutout.png', (img) => {
      _ercImg = img;
    }),
  ]);
  return _wmLoadPromise;
}

preloadWatermarkAssets();

function makeDetRng(seed0 = 1337) {
  let s = seed0 >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Selects refined, high-aesthetic Latin typography for `@Nonstop` tailored to each art era.
 */
function getEraFontSpec(fontStyle) {
  switch (fontStyle) {
    case 'editorial_italic':
      return 'italic 700 40px "Baskerville", "Didot", "Bodoni 72", "Georgia", serif';
    case 'editorial_serif':
      return '700 39px "Bodoni 72", "Didot", "Baskerville", "Palatino", serif';
    case 'monumental':
      return '700 38px "Optima", "Palatino", "Baskerville", serif';
    case 'geometric':
      return '700 36px "Futura", "Avenir Next", "Gill Sans", sans-serif';
    case 'geometric_italic':
      return 'italic 800 36px "Avenir Next", "Futura", sans-serif';
    case 'mono':
      return '700 34px "PelicanMono", "Menlo", monospace';
    default:
      return '700 38px "Optima", "Avenir Next", sans-serif';
  }
}

/**
 * Builds and caches a supersampled transparent canvas of `@Nonstop × [ERC]` where:
 * 1) `@Nonstop`'s optical cap/body center (`baseline - capAscent * 0.5`) sits on the EXACT SAME horizontal axis
 *    (`cy = H * 0.5`) as the geometric `ERC` monogram (`往上和erc平行`), so `'p'`'s descender never drags the word low!
 * 2) Left and right padding are strictly equal (`PAD_X`), leaving zero empty space after `ERC`.
 * 3) Optional era surface transformations (`waveWarp`, `pixelate`, `scanlines`, `bristleGrooves`, `distress`)
 *    physically stylize BOTH `@Nonstop` and `ERC` together!
 */
function getStylizedLockupStamp(key, paintFillFn, opts = {}) {
  const cacheId = `v4_${key}_${Boolean(_ercImg?.complete && _ercImg?.naturalWidth)}`;
  if (_stampCache.has(cacheId)) {
    return _stampCache.get(cacheId);
  }

  const PAD_X = opts.padX ?? 14;
  const H = 96;
  const cy = H * 0.5; // Exact shared horizontal centerline (y = 48) for `@`, `Nonstop`, `×`, and `ERC`!
  const fontSpec = getEraFontSpec(opts.fontStyle || 'monumental');
  const track = opts.track ?? 0.9;
  const atGap = 3.2;

  const mCtx = getMeasureCtx();
  let capAscent = 27;
  let atAscent = 25;
  let atDescent = 5;
  let wordW = 165;
  let atW = 30;

  if (mCtx) {
    mCtx.font = fontSpec;
    const mCap = mCtx.measureText('Nonsto'); // Measure cap-to-baseline without 'p' descender!
    if (mCap.actualBoundingBoxAscent > 8) {
      capAscent = mCap.actualBoundingBoxAscent;
    }
    const mAt = mCtx.measureText('@');
    atW = mAt.width;
    if (mAt.actualBoundingBoxAscent > 6) {
      atAscent = mAt.actualBoundingBoxAscent;
      atDescent = mAt.actualBoundingBoxDescent || 0;
    }
    const mainWord = 'Nonstop';
    wordW = 0;
    for (let i = 0; i < mainWord.length; i++) {
      wordW += mCtx.measureText(mainWord[i]).width + (i < mainWord.length - 1 ? track : 0);
    }
  }

  const ercH = opts.ercH ?? 41;
  const ercW = (_ercImg && _ercImg.complete && _ercImg.naturalWidth > 0)
    ? Math.round(ercH * (_ercImg.naturalWidth / _ercImg.naturalHeight))
    : 79;

  let textSpanW = atW + atGap + wordW;
  if (_nonstopImg && _nonstopImg.complete && _nonstopImg.naturalWidth > 0) {
    textSpanW = Math.round((_nonstopImg.naturalWidth / _nonstopImg.naturalHeight) * ercH);
  }

  const divX = PAD_X + textSpanW + 13;
  const ercX = divX + 13;
  const W = Math.ceil(ercX + ercW + PAD_X);

  const rawCnv = document.createElement('canvas');
  rawCnv.width = W;
  rawCnv.height = H;
  const c = rawCnv.getContext('2d');
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#ffffff';

  if (_nonstopImg && _nonstopImg.complete && _nonstopImg.naturalWidth > 0) {
    c.drawImage(_nonstopImg, PAD_X, Math.round(cy - ercH * 0.5), textSpanW, ercH);
  } else {
    c.font = fontSpec;
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';

    // Center `@` optically on `cy`
    const atBaselineY = cy + (atAscent - atDescent) * 0.5;
    c.fillText('@', PAD_X, atBaselineY);

    // Center `Nonsto` cap-body `[baseline - capAscent .. baseline]` dead-level with `ERC` `[cy - ercH/2 .. cy + ercH/2]`!
    // Slight -1.2px optical lift so lowercase x-height + cap 'N' look razor-parallel with geometric `ERC`!
    const wordBaselineY = cy + capAscent * 0.5 - 1.2;
    const mainWord = 'Nonstop';
    let curX = PAD_X + atW + atGap;
    for (let i = 0; i < mainWord.length; i++) {
      const ch = mainWord[i];
      c.fillText(ch, curX, wordBaselineY);
      curX += c.measureText(ch).width + track;
    }
  }

  // Stylized geometric separator (`×` or diamond star) centered at `(divX, cy)`
  if (opts.diamondSep) {
    c.beginPath();
    c.moveTo(divX, cy - 5.5);
    c.lineTo(divX + 4.8, cy);
    c.lineTo(divX, cy + 5.5);
    c.lineTo(divX - 4.8, cy);
    c.closePath();
    c.fill();
  } else {
    c.lineWidth = 2.6;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(divX - 4.2, cy - 4.2);
    c.lineTo(divX + 4.2, cy + 4.2);
    c.moveTo(divX + 4.2, cy - 4.2);
    c.lineTo(divX - 4.2, cy + 4.2);
    c.stroke();
  }

  // Cut-out `ERC` geometric monogram centered strictly at `cy`!
  const ercTop = Math.round(cy - ercH * 0.5);
  if (_ercImg && _ercImg.complete && _ercImg.naturalWidth > 0) {
    c.drawImage(_ercImg, ercX, ercTop, ercW, ercH);
  } else {
    c.font = '900 38px "Futura", "Avenir Next", sans-serif';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText('ERC', ercX, cy);
  }

  // Tint opaque glyph + logo mask via `source-in`
  c.globalCompositeOperation = 'source-in';
  paintFillFn(c, W, H);
  c.globalCompositeOperation = 'source-over';

  // Optional bristle/stone/woodgrain striation grooves cut right through the glyphs & ERC logo!
  if (opts.striations) {
    const rng = makeDetRng(opts.seed || 707);
    c.globalCompositeOperation = 'destination-out';
    c.strokeStyle = '#000';
    for (let i = 0; i < opts.striations; i++) {
      const sy = 16 + rng() * (H - 32);
      const sx = rng() * W * 0.8;
      const slen = 18 + rng() * 65;
      c.lineWidth = 0.7 + rng() * 1.1;
      c.globalAlpha = 0.28 + rng() * 0.36;
      c.beginPath();
      c.moveTo(sx, sy);
      c.lineTo(sx + slen, sy + (rng() - 0.5) * 3.5);
      c.stroke();
    }
    c.globalAlpha = 1.0;
    c.globalCompositeOperation = 'source-over';
  }

  // Optional organic pitting / stone-rubbing / seal-mud飞白 (`destination-out`)
  if (opts.distress) {
    const rng = makeDetRng(opts.seed || 1337);
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = '#000';
    const count = opts.distressCount || 95;
    for (let i = 0; i < count; i++) {
      const px = rng() * W;
      const py = rng() * H;
      const r = 0.8 + rng() * (opts.distressSize || 2.2);
      c.globalAlpha = 0.45 + rng() * 0.55;
      c.beginPath();
      c.arc(px, py, r, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1.0;
    c.globalCompositeOperation = 'source-over';
  }

  // Optional horizontal CRT / VHS scanline gaps
  if (opts.scanlines) {
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = 'rgba(0, 0, 0, 0.36)';
    for (let y = 0; y < H; y += 4) {
      c.fillRect(0, y, W, 1.5);
    }
    c.globalCompositeOperation = 'source-over';
  }

  let outCnv = rawCnv;

  // Optional sinuous Expressionist wave warp (#13 Munch The Scream / #04 Tang silk breeze)
  if (opts.waveAmp) {
    const warpCnv = document.createElement('canvas');
    warpCnv.width = W;
    warpCnv.height = H;
    const wCtx = warpCnv.getContext('2d');
    const amp = opts.waveAmp;
    const freq = opts.waveFreq || 0.045;
    for (let x = 0; x < W; x += 2) {
      const dy = Math.sin(x * freq + 0.6) * amp;
      wCtx.drawImage(rawCnv, x, 0, 2, H, x, dy, 2, H);
    }
    outCnv = warpCnv;
  }

  // Optional true 8-bit nearest-neighbor integer pixel quantization (#16 Famicom)
  if (opts.pixelStep) {
    const step = opts.pixelStep;
    const sw = Math.max(16, Math.round(W / step));
    const sh = Math.max(8, Math.round(H / step));
    const tiny = document.createElement('canvas');
    tiny.width = sw;
    tiny.height = sh;
    const tCtx = tiny.getContext('2d');
    tCtx.imageSmoothingEnabled = false;
    tCtx.drawImage(outCnv, 0, 0, sw, sh);

    const pixCnv = document.createElement('canvas');
    pixCnv.width = W;
    pixCnv.height = H;
    const pCtx = pixCnv.getContext('2d');
    pCtx.imageSmoothingEnabled = false;
    pCtx.drawImage(tiny, 0, 0, sw, sh, 0, 0, W, H);
    outCnv = pixCnv;
  }

  if (_stampCache.size < 96) {
    _stampCache.set(cacheId, outCnv);
  }
  return outCnv;
}

/**
 * Helper to draw an organic hand-chipped stone/seal polygon border (ZERO stiff computer `strokeRect`!).
 */
function traceRoughSealRect(ctx, x, y, w, h, jitter, seed) {
  const rng = makeDetRng(seed);
  const segsX = 9;
  const segsY = 4;
  ctx.beginPath();
  for (let i = 0; i <= segsX; i++) {
    const px = x + (w * i) / segsX + (rng() - 0.5) * jitter;
    const py = y + (rng() - 0.5) * jitter;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = 1; i <= segsY; i++) {
    ctx.lineTo(x + w + (rng() - 0.5) * jitter, y + (h * i) / segsY + (rng() - 0.5) * jitter);
  }
  for (let i = 1; i <= segsX; i++) {
    ctx.lineTo(x + w - (w * i) / segsX + (rng() - 0.5) * jitter, y + h + (rng() - 0.5) * jitter);
  }
  for (let i = 1; i < segsY; i++) {
    ctx.lineTo(x + (rng() - 0.5) * jitter, y + h - (h * i) / segsY + (rng() - 0.5) * jitter);
  }
  ctx.closePath();
}

/**
 * Draws the deeply era-stylized `@Nonstop × ERC` watermark at `(x, y)` with base width `rawTargetW`.
 */
export function drawStylizedWatermarkAt(ctx, eraId, x, y, rawTargetW = 190, localT = 0) {
  const targetW = Math.round(rawTargetW * 0.90);
  ctx.save();
  ctx.translate(x, y);

  switch (eraId) {
    case 'intro': {
      // Archival 19th-Century Museum Folio Iron-Gall Ex-Libris Stamp (`古籍藏书票铁胆墨钤印`)
      const stamp = getStylizedLockupStamp('intro_folio', (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, '#5a3e24');
        g.addColorStop(0.6, '#3d2916');
        g.addColorStop(1, '#6b4728');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'editorial_italic', diamondSep: true, distress: true, distressCount: 55, distressSize: 1.5, seed: 11 });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));

      ctx.globalAlpha = 0.80;
      traceRoughSealRect(ctx, -5, -2, targetW + 10, targetH + 4, 1.2, 19);
      ctx.strokeStyle = 'rgba(92, 66, 38, 0.62)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // Delicate corner fleuron ticks
      for (const [cx, cy] of [[-5, -2], [targetW + 5, -2], [-5, targetH + 2], [targetW + 5, targetH + 2]]) {
        ctx.fillStyle = 'rgba(92, 66, 38, 0.68)';
        ctx.fillRect(cx - 2, cy - 2, 4, 4);
      }
      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }

    case 's01_sahara': {
      // Tassili Blown Red-Ochre & Kaolin Cave-Rock Hand-Spatter Stencil (`撒哈拉岩画吹喷赭石粉印`)
      const stamp = getStylizedLockupStamp('s01_ochre', (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#f7ebd2');
        g.addColorStop(0.55, '#efd2a2');
        g.addColorStop(1, '#df9e58');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'monumental', distress: true, distressCount: 165, distressSize: 2.9, striations: 14, seed: 101 });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));

      // Blown red-ochre pigment cloud + rock spatter droplets behind stencil (NO geometric box!)
      const rng = makeDetRng(109);
      const cloud = ctx.createRadialGradient(targetW * 0.5, targetH * 0.5, 8, targetW * 0.5, targetH * 0.5, targetW * 0.62);
      cloud.addColorStop(0, 'rgba(128, 42, 16, 0.62)');
      cloud.addColorStop(0.7, 'rgba(112, 36, 14, 0.34)');
      cloud.addColorStop(1, 'rgba(112, 36, 14, 0)');
      ctx.fillStyle = cloud;
      ctx.fillRect(-16, -12, targetW + 32, targetH + 24);

      ctx.fillStyle = 'rgba(122, 38, 14, 0.48)';
      for (let i = 0; i < 42; i++) {
        const sx = -8 + rng() * (targetW + 16);
        const sy = -6 + rng() * (targetH + 12);
        const sr = 0.8 + rng() * 2.3;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.90;
      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }

    case 's02_egypt': {
      // Authentic Double-Rope Royal Egyptian Shen-Cartouche (`双股金绳王名圈 + 圣书体日轮护符 + 石膏裂纹`)
      const stamp = getStylizedLockupStamp('s02_egypt', (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, '#165e68');
        g.addColorStop(0.46, '#244b5a');
        g.addColorStop(0.58, '#8f2c1a');
        g.addColorStop(1, '#b53820');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'monumental', diamondSep: true, distress: true, distressCount: 70, distressSize: 1.7, striations: 8, seed: 202 });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));

      const padX = 12;
      const padY = 4;
      const cw = targetW + padX * 2;
      const ch = targetH + padY * 2;
      const rad = ch * 0.5;

      ctx.globalAlpha = 0.92;
      // Warm papyrus/limestone cartouche interior fill
      ctx.fillStyle = 'rgba(243, 226, 184, 0.86)';
      ctx.beginPath();
      ctx.roundRect(-padX, -padY, cw, ch, rad);
      ctx.fill();

      // Double-strand gold & carnelian Shen-rope border
      ctx.strokeStyle = '#6e2314';
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.roundRect(-padX, -padY, cw, ch, rad);
      ctx.stroke();

      ctx.strokeStyle = '#dfab32';
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.roundRect(-padX, -padY, cw, ch, rad);
      ctx.stroke();

      // Inner turquoise-blue temple register rule
      ctx.strokeStyle = 'rgba(24, 98, 108, 0.55)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.roundRect(-padX + 3.2, -padY + 3.2, cw - 6.4, ch - 6.4, rad - 3);
      ctx.stroke();

      // Diagonal rope-twist ticks around the Shen ring!
      ctx.strokeStyle = 'rgba(110, 35, 20, 0.65)';
      ctx.lineWidth = 1.1;
      for (let rx = 8; rx < cw - 8; rx += 9) {
        ctx.beginPath();
        ctx.moveTo(-padX + rx, -padY - 1.5);
        ctx.lineTo(-padX + rx + 3, -padY + 1.5);
        ctx.moveTo(-padX + rx, -padY + ch - 1.5);
        ctx.lineTo(-padX + rx + 3, -padY + ch + 1.5);
        ctx.stroke();
      }

      // Traditional vertical Shen-knot tie bar + central carnelian lashing on the right!
      const knotX = -padX + cw + 4.5;
      ctx.strokeStyle = '#6e2314';
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(knotX, -padY - 3);
      ctx.lineTo(knotX, -padY + ch + 3);
      ctx.stroke();
      ctx.strokeStyle = '#dfab32';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.fillStyle = '#b53820';
      ctx.fillRect(knotX - 3, ch * 0.5 - padY - 5, 6, 10);

      // Tiny solar Ra disk on left inside cartouche
      ctx.fillStyle = '#b53820';
      ctx.beginPath();
      ctx.arc(-3, targetH * 0.5, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.drawImage(stamp, 3, 0, targetW - 2, targetH);
      break;
    }

    case 's03_han': {
      // Chipped-Stone Eastern Han Intaglio Cinnabar Seal Rubbing (`汉画像石刀凿崩边朱砂拓印`)
      const stamp = getStylizedLockupStamp('s03_han', (c, w, h) => {
        c.fillStyle = '#f4eee0';
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'monumental', distress: true, distressCount: 135, distressSize: 2.3, striations: 18, seed: 303 });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));

      ctx.globalAlpha = 0.90;
      traceRoughSealRect(ctx, -6, -3, targetW + 12, targetH + 6, 2.8, 309);
      ctx.fillStyle = 'rgba(174, 44, 32, 0.88)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(242, 234, 218, 0.78)';
      ctx.lineWidth = 1.4;
      traceRoughSealRect(ctx, -3, -0.5, targetW + 6, targetH + 1, 1.8, 317);
      ctx.stroke();

      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }

    case 's04_tang':
    case 's05_song':
    case 's06_qingming':
    case 's09_bada': {
      // Hand-Carved Vermilion Cinnabar Collector's Seal (`古法铁笔刀刻朱文鉴藏残印`, organic chipped edges & 飞白)
      const isBada = eraId === 's09_bada';
      const stamp = getStylizedLockupStamp(`seal_${eraId}`, (c, w, h) => {
        c.fillStyle = isBada ? '#9e261b' : '#ab2c1f';
        c.fillRect(0, 0, w, h);
      }, {
        fontStyle: 'editorial_italic',
        diamondSep: true,
        distress: true,
        distressCount: isBada ? 140 : 95,
        distressSize: 2.1,
        striations: 10,
        waveAmp: eraId === 's04_tang' ? 0.9 : 0,
        seed: 505 + eraId.length * 17,
      });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));

      ctx.globalAlpha = isBada ? 0.86 : 0.84;
      ctx.fillStyle = 'rgba(246, 236, 214, 0.36)';
      traceRoughSealRect(ctx, -5, -2, targetW + 10, targetH + 4, 2.2, 401 + eraId.length);
      ctx.fill();

      ctx.strokeStyle = isBada ? '#9e261b' : '#ab2c1f';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      ctx.lineWidth = 0.9;
      traceRoughSealRect(ctx, -2, 0.5, targetW + 4, targetH - 1, 1.3, 419 + eraId.length);
      ctx.stroke();

      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }

    case 's07_maya': {
      // Carved Mesoamerican Stepped Glyph Block + Jade Corner Beads (`玛雅树皮抄本阶梯石雕铭文块`)
      const stamp = getStylizedLockupStamp('s07_maya', (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, '#bd3122');
        g.addColorStop(0.5, '#1a1512');
        g.addColorStop(1, '#1d6e5f');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'monumental', diamondSep: true, distress: true, distressCount: 75, distressSize: 1.8, seed: 707 });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));

      ctx.globalAlpha = 0.92;
      ctx.fillStyle = 'rgba(240, 222, 182, 0.88)';
      ctx.strokeStyle = '#171310';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.roundRect(-7, -3, targetW + 14, targetH + 6, 9);
      ctx.fill();
      ctx.stroke();

      // Four Maya jade cabochon corner beads
      ctx.fillStyle = '#248270';
      for (const [bx, by] of [[-4, 0], [targetW + 4, 0], [-4, targetH], [targetW + 4, targetH]]) {
        ctx.beginPath();
        ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }

    case 's08_mughal': {
      // Illuminated Mughal Gold-Zari & Lapis-Lazuli Cusped Mihrab Plaque + Pearl Studs
      const stamp = getStylizedLockupStamp('s08_mughal', (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#fff5c0');
        g.addColorStop(0.5, '#f2bd39');
        g.addColorStop(1, '#ffe999');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'editorial_italic', diamondSep: true });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));

      ctx.globalAlpha = 0.92;
      const pw = targetW + 14;
      const ph = targetH + 6;
      ctx.fillStyle = 'rgba(18, 42, 82, 0.88)';
      ctx.strokeStyle = '#f2c449';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(4, -3);
      ctx.lineTo(targetW - 4, -3);
      ctx.quadraticCurveTo(targetW + 9, targetH * 0.5, targetW - 4, targetH + 3);
      ctx.lineTo(4, targetH + 3);
      ctx.quadraticCurveTo(-9, targetH * 0.5, 4, -3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Delicate pearl-dot inner fillet
      ctx.fillStyle = '#fff5d6';
      for (const [dx, dy] of [[-2, targetH * 0.5], [targetW + 2, targetH * 0.5]]) {
        ctx.beginPath();
        ctx.arc(dx, dy, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }

    case 's10_wayang': {
      // Perforated Javanese Prada-Gold Buffalo-Hide Plaque (`爪哇镂空金彩牛皮影印`)
      const stamp = getStylizedLockupStamp('s10_wayang', (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#fff0a6');
        g.addColorStop(0.55, '#f0ad35');
        g.addColorStop(1, '#c96b18');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'monumental', diamondSep: true, distress: true, distressCount: 95, distressSize: 1.7, seed: 1010 });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));

      ctx.globalAlpha = 0.92;
      ctx.shadowColor = 'rgba(255, 188, 68, 0.55)';
      ctx.shadowBlur = 8;
      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }

    case 's11_ukiyoe': {
      // Edo Woodblock Bokashi-Wiped Tanzaku Publisher Crest (`浮世绘木版拭色版元印`)
      const stamp = getStylizedLockupStamp('s11_ukiyoe', (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, '#183657');
        g.addColorStop(0.56, '#1e466e');
        g.addColorStop(1, '#b83324');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'editorial_serif', diamondSep: true, striations: 14, seed: 1111 });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));

      ctx.globalAlpha = 0.90;
      const bok = ctx.createLinearGradient(0, -3, 0, targetH + 3);
      bok.addColorStop(0, 'rgba(228, 198, 158, 0.90)');
      bok.addColorStop(1, 'rgba(247, 239, 220, 0.86)');
      ctx.fillStyle = bok;
      traceRoughSealRect(ctx, -5, -2, targetW + 10, targetH + 4, 1.4, 1117);
      ctx.fill();
      ctx.strokeStyle = '#183657';
      ctx.lineWidth = 2.0;
      ctx.stroke();
      ctx.strokeStyle = '#b83324';
      ctx.lineWidth = 0.9;
      traceRoughSealRect(ctx, -2.5, 0.5, targetW + 5, targetH - 1, 0.9, 1123);
      ctx.stroke();
      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }

    case 's12_starry': {
      // Van Gogh Swirling Impasto Oil-Brushstroke Signature (`梵高星月夜厚涂刮刀签名`)
      const stamp = getStylizedLockupStamp('s12_starry', (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#fff078');
        g.addColorStop(0.52, '#f5b822');
        g.addColorStop(1, '#6ee2de');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'editorial_italic', striations: 16, waveAmp: 1.4, waveFreq: 0.05, seed: 1212 });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));

      ctx.globalAlpha = 0.94;
      // Swirling Prussian-blue impasto brushstroke bed behind signature
      const rng = makeDetRng(1219);
      for (let i = 0; i < 9; i++) {
        ctx.save();
        const bx = (i / 8) * targetW;
        const by = targetH * 0.5 + Math.sin(i * 1.1) * 3.2;
        ctx.translate(bx, by);
        ctx.rotate(-0.10 + (rng() - 0.5) * 0.18);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(9, 24, 58, 0.78)' : 'rgba(21, 52, 108, 0.72)';
        ctx.beginPath();
        ctx.roundRect(-16, -targetH * 0.48, 34, targetH * 0.96, 9);
        ctx.fill();
        ctx.restore();
      }
      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }

    case 's13_scream': {
      // Munch Sinuous Wavy Blood-Sky Crayon Signature (`呐喊扭曲波浪油彩蜡笔印`)
      const stamp = getStylizedLockupStamp('s13_scream', (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, '#ffe48a');
        g.addColorStop(0.52, '#f59836');
        g.addColorStop(1, '#e34c2b');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'editorial_italic', waveAmp: 3.4, waveFreq: 0.052, striations: 16, distress: true, distressCount: 60, seed: 1313 });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));

      ctx.globalAlpha = 0.92;
      ctx.shadowColor = 'rgba(22, 12, 18, 0.85)';
      ctx.shadowBlur = 5;
      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }

    case 's14_nosferatu': {
      // 1922 Silent-Film Scratched Nitrate Gate Stamp (`默片硝酸盐胶片刮痕角标`)
      const flick = 0.72 + 0.12 * Math.sin(localT * 19.0);
      const stamp = getStylizedLockupStamp('s14_film', (c, w, h) => {
        c.fillStyle = '#e8dcc0';
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'editorial_serif', distress: true, distressCount: 115, distressSize: 2.2, striations: 12, seed: 1414 });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));

      ctx.globalAlpha = flick;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.88)';
      ctx.shadowBlur = 5;
      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }

    case 's15_oscilloscope': {
      // Tektronix P1 Green-Phosphor Scanline Vector Beam (`示波器荧光扫描线电子束`)
      const stamp = getStylizedLockupStamp('s15_crt', (c, w, h) => {
        c.fillStyle = '#74ffad';
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'mono', scanlines: true });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));

      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = '#18ff68';
      ctx.shadowBlur = 11;
      ctx.globalAlpha = 0.94;
      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }

    case 's16_8bit': {
      // True Integer-Quantized 8-Bit Famicom Pixel Sprite (`红白机真像素化块状精灵`)
      const stampBlk = getStylizedLockupStamp('s16_blk', (c, w, h) => {
        c.fillStyle = '#121212';
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'mono', pixelStep: 3 });
      const stampGold = getStylizedLockupStamp('s16_gold', (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.48, '#f8d830');
        g.addColorStop(1, '#d87800');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'mono', pixelStep: 3 });
      const targetH = Math.round(targetW * (stampGold.height / stampGold.width));

      ctx.imageSmoothingEnabled = false;
      for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [2, 2]]) {
        ctx.drawImage(stampBlk, ox, oy, targetW, targetH);
      }
      ctx.drawImage(stampGold, 0, 0, targetW, targetH);
      break;
    }

    case 's17_chat': {
      // Authentic Win2000 3D Beveled Mini Floating Tool-Window (`千禧桌面迷你浮动标题栏窗口`)
      const stamp = getStylizedLockupStamp('s17_win', (c, w, h) => {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'geometric', pixelStep: 2 });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));
      const bw = targetW + 28;
      const bh = targetH + 8;

      // 3D Win2000 outer bevel frame
      ctx.fillStyle = '#d4d0c8';
      ctx.fillRect(-7, -4, bw, bh);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-7, -4 + bh);
      ctx.lineTo(-7, -4);
      ctx.lineTo(-7 + bw, -4);
      ctx.stroke();
      ctx.strokeStyle = '#404040';
      ctx.beginPath();
      ctx.moveTo(-7 + bw, -4);
      ctx.lineTo(-7 + bw, -4 + bh);
      ctx.lineTo(-7, -4 + bh);
      ctx.stroke();

      // Classic Win2000 active blue gradient title strip + mini `[×]` button!
      const wg = ctx.createLinearGradient(-4, 0, -4 + bw - 6, 0);
      wg.addColorStop(0, '#0a246a');
      wg.addColorStop(1, '#3a6ea5');
      ctx.fillStyle = wg;
      ctx.fillRect(-4, -1, bw - 6, bh - 6);

      ctx.fillStyle = '#d4d0c8';
      ctx.fillRect(targetW + 4, Math.round(targetH * 0.5 - 6), 12, 12);
      ctx.fillStyle = '#111111';
      ctx.font = '700 10px "PelicanMono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('×', targetW + 10, Math.round(targetH * 0.5));

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }

    case 's18_vaporwave': {
      // High-Contrast Luminous Synthwave Neon Plaque (`蒸汽波高亮霓虹灯牌` — crystal-clear against dark violet sky!)
      const stamp = getStylizedLockupStamp('s18_vapor_v5', (c, w, h) => {
        const g = c.createLinearGradient(0, h * 0.15, w, h * 0.85);
        g.addColorStop(0.0, '#7efcff');
        g.addColorStop(0.45, '#ffffff');
        g.addColorStop(1.0, '#ff7af6');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'geometric_italic' });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));

      ctx.fillStyle = 'rgba(14, 4, 34, 0.84)';
      ctx.beginPath();
      ctx.roundRect(-9, -2, targetW + 18, targetH + 4, 8);
      ctx.fill();

      ctx.save();
      ctx.shadowColor = '#ff2aa4';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#ff49db';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.roundRect(-9, -2, targetW + 18, targetH + 4, 8);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = '#00f6ff';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.roundRect(-6.5, 0.5, targetW + 13, targetH - 1, 6);
      ctx.stroke();

      ctx.shadowColor = '#00f6ff';
      ctx.shadowBlur = 10;
      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }

    case 's19_shortvideo': {
      // 2020s Short-Video Creator Pill with Chromatic Cyan/Pink Offset (`竖屏短视频创作者联名胶囊`)
      const cyanS = getStylizedLockupStamp('s19_cyan', (c, w, h) => {
        c.fillStyle = '#25f4ee';
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'geometric' });
      const pinkS = getStylizedLockupStamp('s19_pink', (c, w, h) => {
        c.fillStyle = '#ff2a5f';
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'geometric' });
      const whiteS = getStylizedLockupStamp('s19_white', (c, w, h) => {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'geometric' });
      const targetH = Math.round(targetW * (whiteS.height / whiteS.width));

      ctx.globalAlpha = 0.90;
      ctx.fillStyle = 'rgba(8, 12, 24, 0.46)';
      ctx.beginPath();
      ctx.roundRect(-6, -1, targetW + 12, targetH + 2, (targetH + 2) * 0.5);
      ctx.fill();

      ctx.drawImage(cyanS, -1.5, -0.8, targetW, targetH);
      ctx.drawImage(pinkS, 1.5, 0.8, targetW, targetH);
      ctx.drawImage(whiteS, 0, 0, targetW, targetH);
      break;
    }

    case 's20_code_inline': {
      // Inline IDE Header Lockup right inside `#20` Code Art's macOS titlebar (zero bounding-box collision!)
      const stamp = getStylizedLockupStamp('s20_inline', (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, '#58a6ff');
        g.addColorStop(0.55, '#d2a8ff');
        g.addColorStop(1, '#7ee787');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'mono' });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));
      ctx.shadowColor = 'rgba(88, 166, 255, 0.55)';
      ctx.shadowBlur = 6;
      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }

    case 's20_code': {
      // Generative CAD NURBS Bounding-Box + Bézier Tangent Handles (`生成式代码控制网格水印`)
      const stamp = getStylizedLockupStamp('s20_code', (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, '#58a6ff');
        g.addColorStop(0.55, '#a5d6ff');
        g.addColorStop(1, '#7ee787');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'mono' });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));

      ctx.strokeStyle = 'rgba(88, 166, 255, 0.58)';
      ctx.lineWidth = 1.1;
      ctx.strokeRect(-5, -2, targetW + 10, targetH + 4);
      // Bézier tangent control handles extending from top-left & bottom-right corners
      ctx.strokeStyle = 'rgba(247, 129, 102, 0.78)';
      ctx.beginPath();
      ctx.moveTo(-5, -2);
      ctx.lineTo(14, -10);
      ctx.moveTo(targetW + 5, targetH + 2);
      ctx.lineTo(targetW - 14, targetH + 10);
      ctx.stroke();
      ctx.fillStyle = '#f78166';
      ctx.beginPath();
      ctx.arc(14, -10, 2.2, 0, Math.PI * 2);
      ctx.arc(targetW - 14, targetH + 10, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0d1117';
      ctx.strokeStyle = '#58a6ff';
      for (const [vx, vy] of [[-5, -2], [targetW + 5, -2], [-5, targetH + 2], [targetW + 5, targetH + 2]]) {
        ctx.fillRect(vx - 2.5, vy - 2.5, 5, 5);
        ctx.strokeRect(vx - 2.5, vy - 2.5, 5, 5);
      }
      ctx.shadowColor = 'rgba(88, 166, 255, 0.45)';
      ctx.shadowBlur = 6;
      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }

    default: {
      // Embossed Museum Brushed-Brass Foil Hallmark (`博物馆拉丝纯铜烫金徽章`)
      const stamp = getStylizedLockupStamp('outro_gold', (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#d8b262');
        g.addColorStop(0.48, '#fff2c6');
        g.addColorStop(1, '#b58636');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }, { fontStyle: 'editorial_serif', diamondSep: true });
      const targetH = Math.round(targetW * (stamp.height / stamp.width));

      ctx.globalAlpha = 0.90;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
      ctx.shadowBlur = 6;
      ctx.drawImage(stamp, 0, 0, targetW, targetH);
      break;
    }
  }

  ctx.restore();
}

/**
 * Renders the era-stylized `@Nonstop × ERC` watermark into the top-left red-circled corner of each 1000x1000 panel.
 */
export function renderPanelWatermark(ctx, scene, localT = 0) {
  if (scene.id === 's05_song' || scene.id === 's20_code') {
    // s05_song: rendered in native 1080x1920 screen space by `renderSongCyclistHiRes`
    // s20_code: integrated directly into the IDE titlebar in place of `Generative SVG Code Art`!
    return;
  }
  let wx = 26;
  let wy = 28;
  let ww = 186;

  if (scene.id === 's02_egypt') {
    wx = 28;
    wy = 26;
    ww = 182;
  } else if (scene.id === 's03_han') {
    wx = 26;
    wy = 34;
  } else if (scene.id === 's07_maya') {
    wx = 48;
    wy = 178; // Cleanly on the open bark-paper sky below all 3 rows of Maya celestial glyphs!
  } else if (scene.id === 's15_oscilloscope') {
    wx = 30;
    wy = 156; // Cleanly inside the flat green chassis subplate below `ANODE HV` without touching the CRT bezel!
    ww = 148;
  } else if (scene.id === 's16_8bit') {
    wx = 26;
    wy = 108;
  } else if (scene.id === 's17_chat') {
    wx = 98;
    wy = 22;
    ww = 166;
  } else if (scene.id === 's18_vaporwave') {
    wx = 38;
    wy = 24;
    ww = 198;
  } else if (scene.id === 's19_shortvideo') {
    const inPhone = smootherstep(0.6, 2.2, localT);
    wx = lerp(26, 236, inPhone);
    wy = lerp(28, 106, inPhone);
    ww = lerp(180, 142, inPhone);
  }

  drawStylizedWatermarkAt(ctx, scene.id, wx, wy, ww, localT);
}
