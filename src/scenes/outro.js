// src/scenes/outro.js
// Outro: 3x7 Vertical Museum Wall & Belly-Laughing Naiwa Press Conference
// (125.0s - 137.0s sim clock -> 83.33s - 91.33s real time @ 1.50x = concise 8.0s finale, ~4.5s close-up!)
// - 9:16 Vertical HD (1080x1920): 3 cols x 7 rows (21 tiles of 212x212px) museum gallery wall
// - 0.0px-locked match-cut from live Scene #20 into Tile #20 (col 1, row 6), pullback to full 3x7 wall,
//   then smooth C2 push-in onto Slot #21 (col 2, row 6)
// - Slot #21: Studio-relit, alpha-eroded & color-despilled neural cutout of Belly-Laughing Naiwa (`捧腹大笑`)
//   seated in the executive mahogany & tufted oxblood armchair behind the polished walnut desk (with real-time
//   tabletop reflection, backrest contact shadow & directional xenon flash response), crystal carafe & tumbler,
//   7 unbranded broadcast microphones, 3D gold-foil tent card "奶蛙（本人）", and 136.0s corridor bike streak + bell!

import { VIEW_W, VIEW_H, BASE_PANEL_SCALE } from '../beat/camera.js';
import { SCENES, clamp, lerp, smoothstep, smootherstep } from '../beat/timeline.js';
import { computePelicanRig, drawRig2D } from '../rig/pelican.js';
import { renderPanelAmbientLife } from '../kit/ambient.js';
import { drawStylizedWatermarkAt } from '../kit/watermark.js';

const COLS = 3;
const ROWS = 7;
const TILE_SIZE = 212;
const TILE_GAP_X = 34;
const TILE_GAP_Y = 22;
const GRID_W = COLS * TILE_SIZE + (COLS - 1) * TILE_GAP_X; // 3*212 + 2*34 = 704px
const GRID_H = ROWS * TILE_SIZE + (ROWS - 1) * TILE_GAP_Y; // 7*212 + 6*22 = 1616px
const GRID_X0 = Math.round((VIEW_W - GRID_W) / 2); // 188
const GRID_Y0 = 72; // Spans y = 72..1688 inside 1080x1920, leaving clean 232px below for dado & subtitle!

const WALL_OX = -160;
const WALL_OY = -90;
const WALL_W = 1400;
const WALL_H = 2120;

// =============================================================================
// Preloaded Neural-Cutout Belly-Laugh Sprite Sheets (8x7 tiles of 280x402 each = 112 frames)
// + Cached Alpha-Erosion & Green-Despill Clean Frame Processor!
// =============================================================================
const SHEET_COLS = 8;
const SHEET_ROWS = 7;
const SPRITE_W = 280;
const SPRITE_H = 402;
const TOTAL_LAUGH_FRAMES = SHEET_COLS * SHEET_ROWS * 2; // 112 frames

const _laughSheets = [null, null];
let _laughLoadPromise = null;
const _cleanedFrameCache = new Map();
let _scratchRawCanvas = null;
let _scratchRawCtx = null;

export function preloadOutroAssets() {
  if (_laughLoadPromise) return _laughLoadPromise;
  if (typeof Image === 'undefined') return Promise.resolve();

  const loadOne = (url, idx) =>
    new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'sync';
      img.onload = () => {
        _laughSheets[idx] = img;
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });

  _laughLoadPromise = Promise.all([
    loadOne('./assets/panels/naiwa_laugh_0.png', 0),
    loadOne('./assets/panels/naiwa_laugh_1.png', 1),
  ]);
  return _laughLoadPromise;
}

// Kick off eager preload on module import
preloadOutroAssets();

/**
 * Extracts and studio-grades frame `frameIdx` from the repaired zero-defect sprite sheets
 * (`naiwa_laugh_0.png` & `naiwa_laugh_1.png`, rebuilt directly from un-cropped source frames
 * with 100% intact dual bulging frog eyes and upper-left crown) into a cached `280x402` canvas.
 */
function getCleanedLaughFrameCanvas(frameIdx) {
  const clampedIdx = clamp(frameIdx | 0, 0, TOTAL_LAUGH_FRAMES - 1);
  if (_cleanedFrameCache.has(clampedIdx)) {
    return _cleanedFrameCache.get(clampedIdx);
  }

  const sheetIdx = clampedIdx < 56 ? 0 : 1;
  const sheet = _laughSheets[sheetIdx];
  if (!sheet || !sheet.complete || sheet.naturalWidth === 0) return null;

  const localIdx = clampedIdx % 56;
  const col = localIdx % SHEET_COLS;
  const row = Math.floor(localIdx / SHEET_COLS);
  const sx = col * SPRITE_W;
  const sy = row * SPRITE_H;

  if (!_scratchRawCanvas) {
    _scratchRawCanvas = document.createElement('canvas');
    _scratchRawCanvas.width = SPRITE_W;
    _scratchRawCanvas.height = SPRITE_H;
    _scratchRawCtx = _scratchRawCanvas.getContext('2d', { willReadFrequently: true });
  }

  _scratchRawCtx.clearRect(0, 0, SPRITE_W, SPRITE_H);
  _scratchRawCtx.drawImage(sheet, sx, sy, SPRITE_W, SPRITE_H, 0, 0, SPRITE_W, SPRITE_H);

  const imgData = _scratchRawCtx.getImageData(0, 0, SPRITE_W, SPRITE_H);
  const src = imgData.data;

  // Preserve 100% of repaired alpha (`a0`) so BOTH frog eyes & upper-left crown stay razor-sharp,
  // applying only warm tungsten stage grading, 1px outer-rim ambient integration, and lower-waist desk AO!
  for (let y = 0; y < SPRITE_H; y++) {
    const rowOff = y * SPRITE_W;
    const waistAO = y > 220 ? 1 - 0.44 * clamp((y - 220) / 88, 0, 1) : 1.0;
    const topKey = y < 140 ? 1 + 0.04 * (1 - y / 140) : 1.0;
    for (let x = 0; x < SPRITE_W; x++) {
      const p = (rowOff + x) * 4;
      const a0 = src[p + 3];
      if (a0 === 0) continue;

      let r = src[p];
      let g = src[p + 1];
      let b = src[p + 2];

      // Gentle 1px outermost anti-aliased edge integration (NEVER eroding opaque eye/crown pixels!)
      if (a0 < 235) {
        const edgeFrac = 1 - a0 / 235;
        if (b > r * 0.55) {
          b = Math.round(b * (1 - edgeFrac * 0.55));
        }
        const rimShade = 1 - edgeFrac * 0.22;
        r = Math.round(r * rimShade);
        g = Math.round(g * rimShade);
        b = Math.round(b * rimShade);
      }

      src[p] = clamp(Math.round(r * waistAO * topKey * 1.01), 0, 255);
      src[p + 1] = clamp(Math.round(g * waistAO * topKey * 0.98), 0, 255);
      src[p + 2] = clamp(Math.round(b * waistAO * 0.93), 0, 255);
    }
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = SPRITE_W;
  outCanvas.height = SPRITE_H;
  const outCtx = outCanvas.getContext('2d');
  outCtx.putImageData(imgData, 0, 0);

  _cleanedFrameCache.set(clampedIdx, outCanvas);
  return outCanvas;
}

/**
 * Ensures all 20 frozen era thumbnails (512x512) are baked once into `kit.outroTileCache`.
 */
function ensureOutroTiles(kit, renderSceneFn) {
  if (kit.outroTileCache.size === SCENES.length) return;
  const tempSlot = kit.getSlot(3);
  for (const scene of SCENES) {
    if (kit.outroTileCache.has(scene.id)) continue;
    const freezeLocalT = 3.0;
    const freezeGlobalT = scene.t0 + freezeLocalT;
    renderSceneFn(kit, tempSlot, scene, {
      t: freezeGlobalT,
      localT: freezeLocalT,
      pelicanLocalX: 500,
      pedalAngle: 0.75 + scene.index * 0.4,
      speedScale: 0.25,
      isOutroThumbnail: true,
    });

    const thumb = kit.p.createGraphics(512, 512);
    thumb.pixelDensity(1);
    thumb.drawingContext.drawImage(tempSlot.g2d.canvas, 0, 0, 512, 512);
    kit.outroTileCache.set(scene.id, thumb);
  }
}

/**
 * Bakes the static 1400x2120 vertical museum exhibition hall wall once via `kit.bake2D`.
 */
function getBakedMuseumWall(kit) {
  return kit.bake2D(
    'outro_museum_wall_9x16_v1',
    (_g, ctx, rng, bw, bh) => {
      const cx = -WALL_OX + VIEW_W * 0.5;
      const cy = -WALL_OY + VIEW_H * 0.46;
      const wallGrad = ctx.createRadialGradient(cx, cy, 160, cx, cy, 1280);
      wallGrad.addColorStop(0.0, '#27231e');
      wallGrad.addColorStop(0.58, '#1d1a16');
      wallGrad.addColorStop(1.0, '#110f0d');
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, bw, bh);

      // Fine Belgian linen museum wall weave
      ctx.lineWidth = 0.8;
      for (let y = 0; y < bh; y += 3) {
        const a = 0.007 + rng() * 0.011;
        ctx.strokeStyle =
          rng() > 0.5
            ? `rgba(255, 244, 224, ${a.toFixed(3)})`
            : `rgba(0, 0, 0, ${(a * 1.9).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(bw, y + 0.5);
        ctx.stroke();
      }
      for (let i = 0; i < 3600; i++) {
        const fx = rng() * bw;
        const fy = rng() * (bh - 220);
        const len = 4 + rng() * 16;
        const horiz = rng() > 0.35;
        ctx.strokeStyle =
          rng() > 0.46
            ? `rgba(255, 244, 222, ${(0.02 + rng() * 0.032).toFixed(3)})`
            : `rgba(8, 7, 6, ${(0.05 + rng() * 0.07).toFixed(3)})`;
        ctx.lineWidth = 0.7 + rng() * 0.5;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(horiz ? fx + len : fx + 1, horiz ? fy + 0.5 : fy + len);
        ctx.stroke();
      }

      const ox = -WALL_OX;
      const oy = -WALL_OY;
      const topShadow = ctx.createLinearGradient(0, oy - 20, 0, oy + 62);
      topShadow.addColorStop(0, 'rgba(4, 3, 3, 0.76)');
      topShadow.addColorStop(1, 'rgba(4, 3, 3, 0)');
      ctx.fillStyle = topShadow;
      ctx.fillRect(0, 0, bw, oy + 62);

      // Architectural Dado Rail below the 3x7 grid (`y = 1738` in screen coords)
      const dadoY = oy + 1738;
      const dadoGrad = ctx.createLinearGradient(0, dadoY, 0, dadoY + 16);
      dadoGrad.addColorStop(0.0, '#4a4035');
      dadoGrad.addColorStop(0.25, '#383028');
      dadoGrad.addColorStop(0.7, '#241f1a');
      dadoGrad.addColorStop(1.0, '#120f0d');
      ctx.fillStyle = dadoGrad;
      ctx.fillRect(0, dadoY, bw, 16);

      ctx.strokeStyle = 'rgba(228, 198, 148, 0.24)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, dadoY + 1);
      ctx.lineTo(bw, dadoY + 1);
      ctx.stroke();

      // Lower wainscoting dark oiled-walnut band + 3 column-aligned recessed coffers
      const wainGrad = ctx.createLinearGradient(0, dadoY + 16, 0, bh);
      wainGrad.addColorStop(0, '#181512');
      wainGrad.addColorStop(1, '#0d0b09');
      ctx.fillStyle = wainGrad;
      ctx.fillRect(0, dadoY + 16, bw, bh - (dadoY + 16));

      for (let c = 0; c < COLS; c++) {
        const px = ox + GRID_X0 + c * (TILE_SIZE + TILE_GAP_X) + 6;
        const pw = TILE_SIZE - 12;
        const py = dadoY + 26;
        const ph = 128;
        ctx.fillStyle = 'rgba(10, 9, 8, 0.45)';
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = 'rgba(9, 8, 7, 0.85)';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(px, py, pw, ph);
        ctx.strokeStyle = 'rgba(196, 168, 122, 0.10)';
        ctx.lineWidth = 0.9;
        ctx.strokeRect(px + 2, py + 2, pw - 4, ph - 4);
      }
    },
    WALL_W,
    WALL_H
  );
}

function getBakedPictureLightCone(kit) {
  return kit.bake2D(
    'outro_pic_cone_9x16',
    (_g, ctx, _rng, cw, ch) => {
      ctx.clearRect(0, 0, cw, ch);
      const midX = cw * 0.5;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(midX - 28, 14);
      ctx.lineTo(midX + 28, 14);
      ctx.quadraticCurveTo(cw * 0.95, ch * 0.45, cw * 0.98, ch);
      ctx.lineTo(cw * 0.02, ch);
      ctx.quadraticCurveTo(cw * 0.05, ch * 0.45, midX - 28, 14);
      ctx.closePath();
      ctx.clip();

      const coneG = ctx.createRadialGradient(midX, 26, 8, midX, ch * 0.42, cw * 0.52);
      coneG.addColorStop(0.0, 'rgba(255, 229, 176, 0.24)');
      coneG.addColorStop(0.32, 'rgba(255, 214, 148, 0.11)');
      coneG.addColorStop(0.68, 'rgba(235, 192, 125, 0.038)');
      coneG.addColorStop(1.0, 'rgba(235, 192, 125, 0)');
      ctx.fillStyle = coneG;
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    },
    320,
    310
  );
}

function getBakedPictureLamp(kit) {
  return kit.bake2D(
    'outro_lamp_hood_9x16',
    (_g, ctx) => {
      ctx.clearRect(0, 0, 300, 54);
      ctx.save();
      ctx.scale(6, 6);
      const cx = 25;
      const ly = 0.6;
      const lw = 46;
      const lh = 3.5;

      ctx.strokeStyle = '#6c5530';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - 11, ly + lh);
      ctx.lineTo(cx - 11, 7.2);
      ctx.moveTo(cx + 11, ly + lh);
      ctx.lineTo(cx + 11, 7.2);
      ctx.stroke();

      const lg = ctx.createLinearGradient(cx - lw * 0.5, ly, cx + lw * 0.5, ly + lh);
      lg.addColorStop(0.0, '#4f3c20');
      lg.addColorStop(0.28, '#b89450');
      lg.addColorStop(0.52, '#e6c884');
      lg.addColorStop(0.76, '#9c7b3e');
      lg.addColorStop(1.0, '#3e2f18');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.roundRect(cx - lw * 0.5, ly, lw, lh, 1.6);
      ctx.fill();
      ctx.restore();
    },
    300,
    54
  );
}

function drawPictureLampFixture(kit, ctx, tx, ty) {
  const lampG = getBakedPictureLamp(kit);
  ctx.drawImage(lampG.canvas, tx + TILE_SIZE * 0.5 - 25, ty - 9.0, 50, 9);
}

function getBakedMicroPlaque(kit, scene) {
  return kit.bake2D(
    `outro_micro_plaque_9x16_${scene.id}`,
    (_g, ctx) => {
      ctx.clearRect(0, 0, 240, 54);
      ctx.save();
      ctx.scale(6, 6);
      const pw = 38;
      const ph = 7;
      const px = 0.5;
      const py = 0.5;

      ctx.fillStyle = 'rgba(5, 4, 3, 0.62)';
      ctx.fillRect(px + 0.9, py + 1.1, pw, ph);

      const bg = ctx.createLinearGradient(px, py, px + pw, py + ph);
      bg.addColorStop(0.0, '#46351c');
      bg.addColorStop(0.32, '#9b7b40');
      bg.addColorStop(0.50, '#edd18e');
      bg.addColorStop(0.70, '#8d6d36');
      bg.addColorStop(1.0, '#3b2c17');
      ctx.fillStyle = bg;
      ctx.fillRect(px, py, pw, ph);

      const label = `${String(scene.num).padStart(2, '0')} · ${scene.zh}`;
      ctx.fillStyle = '#24190b';
      ctx.font = '700 2.9px "PelicanSerif", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, px + pw * 0.5, py + ph * 0.53);
      ctx.restore();
    },
    240,
    54
  );
}

function drawMuseumMicroPlaque(kit, ctx, tx, ty, scene, outroT) {
  const plG = getBakedMicroPlaque(kit, scene);
  const px = tx + (TILE_SIZE - 38) * 0.5;
  const py = ty + TILE_SIZE + 4.4;
  ctx.drawImage(plG.canvas, px - 0.5, py - 0.5, 40, 9);

  const glintA = Math.max(0, Math.sin(outroT * 0.85 + scene.index * 0.42)) * 0.14;
  if (glintA > 0.01) {
    ctx.fillStyle = `rgba(255, 245, 205, ${glintA.toFixed(3)})`;
    ctx.fillRect(px + 2, py + 0.6, 34, 2.0);
  }
}

function drawSlot21MitredGiltFrame(ctx, tx, ty, size, flashStrength = 0) {
  const o = 3.2;
  const i = 2.6;
  const ox0 = tx - o;
  const oy0 = ty - o;
  const ox1 = tx + size + o;
  const oy1 = ty + size + o;
  const ix0 = tx + i;
  const iy0 = ty + i;
  const ix1 = tx + size - i;
  const iy1 = ty + size - i;

  const drawSide = (pts, g0, g1, c0, cMid, c1) => {
    const g = ctx.createLinearGradient(g0[0], g0[1], g1[0], g1[1]);
    g.addColorStop(0.0, c0);
    g.addColorStop(0.48, cMid);
    g.addColorStop(1.0, c1);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.lineTo(pts[3][0], pts[3][1]);
    ctx.closePath();
    ctx.fill();
  };

  drawSide([[ox0, oy0], [ox1, oy0], [ix1, iy0], [ix0, iy0]], [0, oy0], [0, iy0], '#7a5f30', '#dfc07c', '#9a783d');
  const botMid = flashStrength > 0.05 ? '#caa862' : '#7d6030';
  drawSide([[ix0, iy1], [ix1, iy1], [ox1, oy1], [ox0, oy1]], [0, iy1], [0, oy1], '#9a7940', botMid, '#3f2e15');
  drawSide([[ox0, oy0], [ix0, iy0], [ix0, iy1], [ox0, oy1]], [ox0, 0], [ix0, 0], '#5e4722', '#be9d58', '#7c6030');
  drawSide([[ix1, iy0], [ox1, oy0], [ox1, oy1], [ix1, iy1]], [ix1, 0], [ox1, 0], '#856734', '#c9a862', '#4c391a');

  ctx.strokeStyle = '#f5e6c4';
  ctx.lineWidth = 0.75;
  ctx.strokeRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
  ctx.strokeStyle = 'rgba(10, 8, 6, 0.72)';
  ctx.lineWidth = 0.6;
  ctx.strokeRect(ox0, oy0, ox1 - ox0, oy1 - oy0);
}

// =============================================================================
// Slot #21 Press Conference Sub-Renderers (authored in crisp 1000x1000 vector space)
// =============================================================================

function computeCurtainFlutter(xNorm, outroT) {
  const waveStart = 10.80 + xNorm * 0.28;
  const age = outroT - waveStart;
  const breeze = Math.sin(outroT * 2.1 + xNorm * 4.5) * 1.4; // subtle continuous auditorium air-flow!
  if (age <= 0 || age > 0.78) return breeze;
  const env = Math.sin(Math.min(1, age / 0.14) * (Math.PI * 0.5)) * Math.exp(-age * 4.6);
  return breeze + env * (16.5 * Math.cos(age * 21.0) + 7.5);
}

function drawRearCorridor(ctx, flashInfo, outroT) {
  ctx.fillStyle = '#0c121d';
  ctx.fillRect(0, 0, 1000, 1000);

  const corrG = ctx.createLinearGradient(0, 314, 0, 628);
  corrG.addColorStop(0.0, '#2a231c');
  corrG.addColorStop(0.28, '#382f24');
  corrG.addColorStop(0.72, '#28211a');
  corrG.addColorStop(1.0, '#181410');
  ctx.fillStyle = corrG;
  ctx.fillRect(90, 314, 820, 314);

  const covePulse = 0.94 + 0.06 * Math.sin(outroT * 2.8);
  const coveG = ctx.createRadialGradient(500, 318, 30, 500, 390, 440);
  coveG.addColorStop(0.0, `rgba(255, 222, 164, ${(0.25 * covePulse).toFixed(3)})`);
  coveG.addColorStop(0.55, `rgba(232, 188, 124, ${(0.10 * covePulse).toFixed(3)})`);
  coveG.addColorStop(1.0, 'rgba(232, 188, 124, 0)');
  ctx.fillStyle = coveG;
  ctx.fillRect(90, 314, 820, 290);

  const tx0 = 128;
  const panes = 5;
  const paneW = (872 - tx0) / panes;
  ctx.fillStyle = '#1b1612';
  ctx.fillRect(tx0 - 6, 322, 872 - tx0 + 12, 78);

  for (let i = 0; i < panes; i++) {
    const px = tx0 + i * paneW + 5;
    const pw = paneW - 10;
    const py = 327;
    const ph = 67;

    const glassG = ctx.createLinearGradient(px, py, px + pw * 0.6, py + ph);
    glassG.addColorStop(0.0, 'rgba(246, 224, 182, 0.28)');
    glassG.addColorStop(0.48, 'rgba(218, 192, 148, 0.17)');
    glassG.addColorStop(1.0, 'rgba(148, 126, 96, 0.11)');
    ctx.fillStyle = glassG;
    ctx.fillRect(px, py, pw, ph);

    ctx.strokeStyle = 'rgba(240, 218, 178, 0.22)';
    ctx.lineWidth = 1.1;
    ctx.strokeRect(px + 5, py + 5, pw - 10, ph - 10);
    ctx.strokeStyle = '#241d17';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(px, py, pw, ph);
  }

  const railG = ctx.createLinearGradient(0, 486, 0, 497);
  railG.addColorStop(0, '#4f4132');
  railG.addColorStop(0.45, '#332920');
  railG.addColorStop(1, '#1a1510');
  ctx.fillStyle = railG;
  ctx.fillRect(90, 486, 820, 11);

  for (let i = 0; i < 6; i++) {
    const wx = 132 + i * 124;
    ctx.strokeStyle = 'rgba(18, 14, 10, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(wx, 506, 108, 48);
  }

  ctx.fillStyle = '#1b1611';
  ctx.fillRect(90, 562, 820, 12);
  const floorG = ctx.createLinearGradient(0, 574, 0, 632);
  floorG.addColorStop(0, '#231d17');
  floorG.addColorStop(0.4, '#1b1612');
  floorG.addColorStop(1, '#100d0b');
  ctx.fillStyle = floorG;
  ctx.fillRect(90, 574, 820, 58);

  const shShiftX = flashInfo.strength > 0.01 ? (500 - flashInfo.originX) * 0.085 : 0;
  const shShiftY = flashInfo.strength > 0.01 ? -14 * flashInfo.strength : 4;
  const shAlpha = 0.34 + flashInfo.strength * 0.30;
  ctx.save();
  ctx.fillStyle = `rgba(6, 7, 10, ${shAlpha.toFixed(3)})`;
  ctx.beginPath();
  ctx.roundRect(356 + shShiftX, 304 + shShiftY, 288, 322, 32);
  ctx.fill();
  ctx.restore();
}

function drawStreakingNaiwaAndBell(ctx, outroT) {
  if (outroT >= 10.86 && outroT <= 11.74) {
    const sheets = [
      { t0: 10.86, x0: 235, y0: 545, vx: 165, vy: -95, rot0: -0.25, spin: 5.4, w: 28, h: 20 },
      { t0: 10.91, x0: 345, y0: 525, vx: 195, vy: -118, rot0: 0.35, spin: -6.2, w: 31, h: 22 },
      { t0: 10.97, x0: 635, y0: 538, vx: 185, vy: -105, rot0: -0.4, spin: 6.8, w: 30, h: 21 },
      { t0: 11.01, x0: 705, y0: 512, vx: 155, vy: -84, rot0: 0.2, spin: -5.1, w: 26, h: 18 },
      { t0: 11.04, x0: 765, y0: 548, vx: 145, vy: -76, rot0: -0.15, spin: 4.5, w: 27, h: 19 },
    ];
    for (const s of sheets) {
      const dt = outroT - s.t0;
      if (dt < 0 || dt > 0.72) continue;
      const fade = Math.sin(Math.min(1, dt / 0.08) * (Math.PI * 0.5)) * (1 - smoothstep(0.46, 0.72, dt));
      const sx = s.x0 + s.vx * dt * (1 - 0.38 * dt);
      const sy = s.y0 + s.vy * dt + 165 * dt * dt + Math.sin(dt * 19 + s.x0) * 6;
      const tilt = Math.cos(dt * 14 + s.rot0 * 5);
      ctx.save();
      ctx.globalAlpha = fade * 0.88;
      ctx.translate(sx, sy);
      ctx.rotate(s.rot0 + s.spin * dt);
      ctx.scale(1, Math.max(0.28, Math.abs(tilt)));
      ctx.fillStyle = tilt >= 0 ? '#f7f1e3' : '#dfd6c3';
      ctx.strokeStyle = 'rgba(90, 76, 58, 0.55)';
      ctx.lineWidth = 1.1;
      ctx.fillRect(-s.w * 0.5, -s.h * 0.5, s.w, s.h);
      ctx.strokeRect(-s.w * 0.5, -s.h * 0.5, s.w, s.h);
      ctx.restore();
    }
  }

  // Corridor breeze & flying press-release sheets at t = 135.76..136.74s (`叮铃！` @ 136.0s!)
  if (outroT >= 10.76 && outroT <= 11.42) {
    const u = (outroT - 10.76) / 0.66;
    const gustX = lerp(80, 960, u);
    const ribbons = [
      { y: 428, len: 420, w: 2.2, a: 0.34 },
      { y: 472, len: 480, w: 1.8, a: 0.28 },
      { y: 522, len: 390, w: 1.6, a: 0.24 },
    ];
    for (const rb of ribbons) {
      const xHead = gustX;
      const xTail = gustX - rb.len;
      const rg = ctx.createLinearGradient(xTail, 0, xHead, 0);
      rg.addColorStop(0.0, 'rgba(255, 246, 222, 0)');
      rg.addColorStop(0.55, `rgba(255, 234, 178, ${(rb.a * 0.6).toFixed(3)})`);
      rg.addColorStop(1.0, 'rgba(255, 250, 236, 0)');
      ctx.strokeStyle = rg;
      ctx.lineWidth = rb.w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(xTail, rb.y + 3);
      ctx.quadraticCurveTo((xTail + xHead) * 0.5, rb.y - 4, xHead, rb.y);
      ctx.stroke();
    }
  }
}

function drawAcousticBellRipples(ctx, outroT) {
  // Golden Concentric Acoustic Bell Ripples radiating right from the Brass Bicycle Handlebar Bell on the desk (`(164, 560)`) at 136.0s!
  if (outroT < 11.0 || outroT > 11.96) return;
  const bellAge = outroT - 11.0;
  const bellAlpha = Math.pow(Math.max(0, 1 - bellAge / 0.96), 1.2);
  const bx = 164;
  const by = 560;

  ctx.save();
  const bloomR = 48 + bellAge * 165;
  const bgGlow = ctx.createRadialGradient(bx, by, 4, bx, by, bloomR);
  bgGlow.addColorStop(0.0, `rgba(255, 236, 162, ${(bellAlpha * 0.36).toFixed(3)})`);
  bgGlow.addColorStop(0.55, `rgba(255, 210, 108, ${(bellAlpha * 0.14).toFixed(3)})`);
  bgGlow.addColorStop(1.0, 'rgba(255, 210, 108, 0)');
  ctx.fillStyle = bgGlow;
  ctx.beginPath();
  ctx.arc(bx, by, bloomR, 0, Math.PI * 2);
  ctx.fill();

  for (let r = 0; r < 4; r++) {
    const ringDelay = r < 3 ? 0 : 0.08;
    const rAge = bellAge - ringDelay;
    if (rAge < 0) continue;
    const rad = 16 + r * 16 + rAge * 138;
    const rAlpha = bellAlpha * (1 - r * 0.19);
    if (rAlpha <= 0.01) continue;

    ctx.strokeStyle =
      r === 0
        ? `rgba(255, 246, 202, ${(rAlpha * 0.96).toFixed(3)})`
        : `rgba(255, 216, 118, ${(rAlpha * 0.86).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.2, (3.3 - r * 0.6) * (0.68 + 0.32 * bellAlpha));
    ctx.lineCap = 'round';

    const rot = r * 0.9 + bellAge * (r % 2 === 0 ? 1.15 : -0.95);
    ctx.beginPath();
    ctx.arc(bx, by, rad, rot + 0.10, rot + Math.PI * 1.38);
    ctx.stroke();
  }
  ctx.restore();
}

function drawVelvetPleatStrip(ctx, x0, pw, y0, y1, swayBot, idx) {
  const xm = x0 + pw * 0.5;
  const g = ctx.createLinearGradient(x0, 0, x0 + pw, 0);
  g.addColorStop(0.0, '#060b14');
  g.addColorStop(0.22, '#101d32');
  g.addColorStop(0.50, idx % 2 === 0 ? '#243a5c' : '#1d304e');
  g.addColorStop(0.68, '#2f4b73');
  g.addColorStop(0.88, '#0f1a2d');
  g.addColorStop(1.0, '#050911');

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + pw + 0.8, y0);
  ctx.quadraticCurveTo(x0 + pw + swayBot * 0.45, (y0 + y1) * 0.55, x0 + pw + swayBot + 0.8, y1);
  ctx.quadraticCurveTo(xm + swayBot, y1 + 5, x0 + swayBot, y1);
  ctx.quadraticCurveTo(x0 + swayBot * 0.45, (y0 + y1) * 0.55, x0, y0);
  ctx.closePath();
  ctx.fill();
}

function drawMidnightVelvetCurtains(ctx, outroT) {
  const wingPleats = 4;
  const wingW = 124 / wingPleats;
  for (let i = 0; i < wingPleats; i++) {
    const lx = i * wingW;
    const lSway = computeCurtainFlutter((lx + wingW) / 1000, outroT) * (0.45 + 0.2 * i);
    drawVelvetPleatStrip(ctx, lx, wingW, 0, 634, lSway, i);

    const rx = 876 + i * wingW;
    const rSway = computeCurtainFlutter(rx / 1000, outroT) * (1.05 - 0.18 * i);
    drawVelvetPleatStrip(ctx, rx, wingW, 0, 634, rSway, i + 1);
  }

  const valPleats = 20;
  const vpW = 1000 / valPleats;
  const valSh = ctx.createLinearGradient(0, 312, 0, 336);
  valSh.addColorStop(0, 'rgba(4, 6, 11, 0.78)');
  valSh.addColorStop(1, 'rgba(4, 6, 11, 0)');
  ctx.fillStyle = valSh;
  ctx.fillRect(0, 312, 1000, 24);

  for (let i = 0; i < valPleats; i++) {
    const vx = i * vpW;
    const sway = computeCurtainFlutter((vx + vpW * 0.5) / 1000, outroT) * 0.42;
    drawVelvetPleatStrip(ctx, vx, vpW, 0, 315, sway, i);
  }

  ctx.strokeStyle = '#cda65a';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const ux = (i / 40) * 1000;
    const sway = computeCurtainFlutter(i / 40, outroT) * 0.42;
    const uy = 314 + Math.sin(i * Math.PI * 0.5) * 1.8;
    if (i === 0) ctx.moveTo(ux + sway, uy);
    else ctx.lineTo(ux + sway, uy);
  }
  ctx.stroke();
}

function drawExecutiveArmchairBackrest(ctx, flashInfo) {
  const cx = 500;
  const fStr = flashInfo.strength;
  const fDir = (flashInfo.originX - cx) / 420;

  // Sculpted Dark Mahogany Outer Backrest Frame (`x = 362..638, y = 296..628`)
  const fx0 = 362;
  const fx1 = 638;
  const fy0 = 296;
  const fy1 = 628;

  const woodG = ctx.createLinearGradient(fx0, fy0, fx1, fy1);
  woodG.addColorStop(0.0, '#2c150e');
  woodG.addColorStop(0.24, '#562b1d');
  woodG.addColorStop(0.50, '#683624');
  woodG.addColorStop(0.78, '#462217');
  woodG.addColorStop(1.0, '#24100b');

  ctx.fillStyle = woodG;
  ctx.beginPath();
  ctx.moveTo(fx0 + 18, fy0 + 14);
  ctx.bezierCurveTo(fx0 + 74, fy0 - 10, fx1 - 74, fy0 - 10, fx1 - 18, fy0 + 14);
  ctx.quadraticCurveTo(fx1 + 4, fy0 + 18, fx1, fy0 + 38);
  ctx.lineTo(fx1 - 4, fy1);
  ctx.lineTo(fx0 + 4, fy1);
  ctx.lineTo(fx0, fy0 + 38);
  ctx.quadraticCurveTo(fx0 - 4, fy0 + 18, fx0 + 18, fy0 + 14);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = fStr > 0.04 ? `rgba(242, 248, 255, ${(0.35 + fStr * 0.6).toFixed(3)})` : '#7e442f';
  ctx.lineWidth = 2.6;
  ctx.stroke();

  // Deep Diamond-Tufted Oxblood Leather Backrest Cushion
  const lx0 = 382;
  const lx1 = 618;
  const ly0 = 318;
  const ly1 = 592;
  const leathG = ctx.createRadialGradient(cx + fDir * 28, 430, 18, cx, 458, 168);
  leathG.addColorStop(0.0, fStr > 0.05 ? '#6e2e27' : '#52211b');
  leathG.addColorStop(0.55, '#381511');
  leathG.addColorStop(1.0, '#1d0a08');

  ctx.save();
  ctx.fillStyle = leathG;
  ctx.beginPath();
  ctx.moveTo(lx0 + 12, ly0 + 10);
  ctx.bezierCurveTo(lx0 + 55, ly0 - 4, lx1 - 55, ly0 - 4, lx1 - 12, ly0 + 10);
  ctx.quadraticCurveTo(lx1, ly0 + 14, lx1, ly0 + 28);
  ctx.lineTo(lx1 - 3, ly1);
  ctx.lineTo(lx0 + 3, ly1);
  ctx.lineTo(lx0, ly0 + 28);
  ctx.quadraticCurveTo(lx0, ly0 + 14, lx0 + 12, ly0 + 10);
  ctx.closePath();
  ctx.fill();
  ctx.clip();

  const colsT = [424, 474, 526, 576];
  const rowsT = [360, 412, 464, 516, 568];
  for (let r = 0; r < rowsT.length; r++) {
    const ry = rowsT[r];
    const rowOff = (r % 2) * 25;
    for (let c = -1; c < colsT.length; c++) {
      const bx = colsT[0] + c * 50 + rowOff;
      ctx.strokeStyle = 'rgba(14, 4, 3, 0.72)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bx - 25, ry);
      ctx.lineTo(bx, ry - 26);
      ctx.lineTo(bx + 25, ry);
      ctx.lineTo(bx, ry + 26);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawExecutiveArmchairArmrests(ctx, flashInfo) {
  const cx = 500;
  const fStr = flashInfo.strength;
  const fDir = (flashInfo.originX - cx) / 420;

  for (const side of [-1, 1]) {
    const xInner = cx + side * 126;
    const xOuter = cx + side * 164;

    ctx.strokeStyle = '#2d150e';
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(xOuter - side * 4, 532);
    ctx.quadraticCurveTo(xOuter + side * 5, 580, xOuter - side * 8, 632);
    ctx.stroke();

    ctx.strokeStyle = side * fDir > 0 && fStr > 0.04 ? `rgba(235, 220, 208, ${0.24 + fStr * 0.45})` : '#693725';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(xOuter - side * 2, 534);
    ctx.quadraticCurveTo(xOuter + side * 6, 580, xOuter - side * 6, 630);
    ctx.stroke();

    ctx.fillStyle = '#4e201b';
    ctx.strokeStyle = '#6c3825';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(xInner, 514);
    ctx.quadraticCurveTo((xInner + xOuter) * 0.5, 506, xOuter + side * 3, 528);
    ctx.lineTo(xOuter - side * 3, 540);
    ctx.quadraticCurveTo((xInner + xOuter) * 0.5, 524, xInner, 528);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * Composites the Studio-Relit, Alpha-Eroded Belly-Laughing Naiwa (`捧腹大笑`) seated in the armchair!
 * - Concise, lively 112-frame belly-laugh cycle mapped cleanly across the press-conference close-up
 * - Casts soft contact shadow onto tufted leather backrest + specular xenon press-flash response
 * - Clipped cleanly at `y = 632` behind the solid American walnut conference table!
 */
function drawSeatedBellyLaughNaiwa(ctx, outroT, flashInfo) {
  // Advance smoothly through all 112 frames across the close-up window (`outroT = 3.2..11.8s`)
  // so during 1.50x playback (~4.5s real close-up) the viewer gets the full peak `捧腹大笑` performance!
  const animSec = Math.max(0, outroT - 3.15);
  const frameIdx = Math.floor(animSec * 15.5) % TOTAL_LAUGH_FRAMES;
  const cleanCanvas = getCleanedLaughFrameCanvas(frameIdx);

  const cx = 500;
  const fStr = flashInfo.strength;
  const fShiftX = fStr > 0.01 ? (cx - flashInfo.originX) * 0.048 : 0;

  // 1. Soft dark contact shadow cast by Naiwa's golden back onto the tufted oxblood leather cushion!
  ctx.save();
  const backShG = ctx.createRadialGradient(
    cx + fShiftX,
    476,
    24,
    cx + fShiftX,
    482,
    134
  );
  backShG.addColorStop(0.0, `rgba(6, 2, 2, ${(0.76 + fStr * 0.18).toFixed(3)})`);
  backShG.addColorStop(0.65, 'rgba(8, 3, 3, 0.42)');
  backShG.addColorStop(1.0, 'rgba(8, 3, 3, 0)');
  ctx.fillStyle = backShG;
  ctx.beginPath();
  ctx.ellipse(cx + fShiftX, 482, 118, 136, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (!cleanCanvas) return null;

  // 2. Seated Naiwa Sprite clipped strictly above the walnut tabletop back edge (`y <= 632`)
  //    Positioned at `drawY = 318, drawW = 342` (`drawH = 491`) so Naiwa's round golden belly rests
  //    naturally behind the desk with ZERO standing thigh gap visible above the tabletop!
  const drawW = 342;
  const drawH = Math.round(drawW * (SPRITE_H / SPRITE_W)); // 491px
  const drawX = Math.round(cx - drawW * 0.5);
  const drawY = 318;

  ctx.save();
  ctx.beginPath();
  ctx.rect(240, 220, 520, 412); // y = 220..632 (behind walnut tabletop!)
  ctx.clip();

  // Grounded dark mahogany/oxblood contact shadow behind Naiwa (ZERO white outer glow!)
  ctx.save();
  ctx.shadowColor = 'rgba(8, 3, 2, 0.72)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.drawImage(cleanCanvas, drawX, drawY, drawW, drawH);
  ctx.restore();

  // Directional Xenon Strobe Specular Flash Wash during DSLR camera bursts
  if (fStr > 0.04) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fStr * 0.16;
    ctx.drawImage(cleanCanvas, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  // Stage-desk upward ambient occlusion along `y = 580..632` so Naiwa tucks seamlessly behind the walnut desk!
  const tuckG = ctx.createLinearGradient(0, 578, 0, 632);
  tuckG.addColorStop(0, 'rgba(12, 7, 5, 0)');
  tuckG.addColorStop(1, 'rgba(12, 7, 5, 0.58)');
  ctx.fillStyle = tuckG;
  ctx.fillRect(drawX, 578, drawW, 54);

  ctx.restore();
  return { cleanCanvas, drawX, drawY, drawW, drawH };
}

function drawConferenceTableAndRefreshments(ctx, outroT, flashInfo, naiwaDrawInfo) {
  const fStr = flashInfo.strength;
  const clothX0 = 36;
  const clothW = 928;
  const clothY0 = 666;
  const numBoxPleats = 12;
  const bpW = clothW / numBoxPleats;

  for (let i = 0; i < numBoxPleats; i++) {
    const px = clothX0 + i * bpW;
    const pg = ctx.createLinearGradient(px, clothY0, px + bpW, 1000);
    pg.addColorStop(0.0, i % 2 === 0 ? '#192d44' : '#15263a');
    pg.addColorStop(0.55, '#101d2d');
    pg.addColorStop(1.0, '#08101a');
    ctx.fillStyle = pg;
    ctx.fillRect(px, clothY0, bpW + 0.8, 1000 - clothY0);
  }

  ctx.fillStyle = 'rgba(198, 160, 88, 0.16)';
  ctx.fillRect(clothX0, 680, clothW, 14);
  ctx.strokeStyle = 'rgba(218, 180, 106, 0.45)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(clothX0, 680.5);
  ctx.lineTo(clothX0 + clothW, 680.5);
  ctx.moveTo(clothX0, 693.5);
  ctx.lineTo(clothX0 + clothW, 693.5);
  ctx.stroke();

  const overSh = ctx.createLinearGradient(0, 666, 0, 686);
  overSh.addColorStop(0, 'rgba(3, 5, 9, 0.82)');
  overSh.addColorStop(1, 'rgba(3, 5, 9, 0)');
  ctx.fillStyle = overSh;
  ctx.fillRect(clothX0, 666, clothW, 20);

  // Polished American Walnut Tabletop (`y = 624..648`)
  const topPlaneG = ctx.createLinearGradient(0, 624, 0, 648);
  topPlaneG.addColorStop(0.0, '#3a2214');
  topPlaneG.addColorStop(0.65, '#54331e');
  topPlaneG.addColorStop(1.0, '#684127');
  ctx.fillStyle = topPlaneG;
  ctx.beginPath();
  ctx.moveTo(38, 624);
  ctx.lineTo(962, 624);
  ctx.lineTo(980, 648);
  ctx.lineTo(20, 648);
  ctx.closePath();
  ctx.fill();

  // Real-Time Specular Reflection of Belly-Laughing Naiwa on the Polished Walnut Tabletop!
  if (naiwaDrawInfo?.cleanCanvas) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(38, 624);
    ctx.lineTo(962, 624);
    ctx.lineTo(980, 648);
    ctx.lineTo(20, 648);
    ctx.closePath();
    ctx.clip();

    ctx.globalAlpha = 0.16 + fStr * 0.08;
    ctx.translate(0, 626 * 2);
    ctx.scale(1, -0.35);
    ctx.drawImage(
      naiwaDrawInfo.cleanCanvas,
      naiwaDrawInfo.drawX,
      naiwaDrawInfo.drawY + 140,
      naiwaDrawInfo.drawW,
      naiwaDrawInfo.drawH
    );
    ctx.restore();
  }

  const noseG = ctx.createLinearGradient(0, 647, 0, 667);
  noseG.addColorStop(0.0, fStr > 0.04 ? '#a8744c' : '#855534');
  noseG.addColorStop(0.28, '#5f3a22');
  noseG.addColorStop(0.72, '#3c2313');
  noseG.addColorStop(1.0, '#211209');
  ctx.fillStyle = noseG;
  ctx.beginPath();
  ctx.roundRect(18, 647, 964, 20, 5);
  ctx.fill();

  // Crystal Water Carafe & Glass Tumbler (`x = 768..868`)
  const trayCx = 814;
  const trayCy = 638;
  const waterTremor =
    Math.sin(outroT * 18.0) * 0.45 + // subtle table vibration from Naiwa's belly-laughing!
    (outroT >= 10.95 && outroT <= 11.55
      ? Math.sin((outroT - 10.95) * 34) * Math.exp(-(outroT - 10.95) * 4.5) * 1.1
      : 0);

  ctx.fillStyle = '#181412';
  ctx.strokeStyle = '#b6914c';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(trayCx, trayCy, 52, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const cxC = 838;
  ctx.save();
  ctx.fillStyle = 'rgba(186, 226, 252, 0.28)';
  ctx.beginPath();
  ctx.moveTo(cxC - 13, 590 + waterTremor * 0.5);
  ctx.quadraticCurveTo(cxC - 20, 616, cxC - 15, 633);
  ctx.quadraticCurveTo(cxC, 637, cxC + 15, 633);
  ctx.quadraticCurveTo(cxC + 20, 616, cxC + 13, 590 - waterTremor * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = `rgba(226, 242, 255, ${(0.62 + fStr * 0.34).toFixed(3)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cxC - 12, 548);
  ctx.quadraticCurveTo(cxC - 8, 568, cxC - 13, 590);
  ctx.quadraticCurveTo(cxC - 21, 616, cxC - 16, 634);
  ctx.quadraticCurveTo(cxC, 639, cxC + 16, 634);
  ctx.quadraticCurveTo(cxC + 21, 616, cxC + 13, 590);
  ctx.quadraticCurveTo(cxC + 8, 568, cxC + 13, 546);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  const gxT = 786;
  ctx.save();
  ctx.fillStyle = 'rgba(182, 224, 252, 0.26)';
  ctx.fillRect(gxT - 12.5, 603, 25, 29);
  ctx.strokeStyle = `rgba(228, 244, 255, ${(0.62 + fStr * 0.34).toFixed(3)})`;
  ctx.lineWidth = 1.45;
  ctx.strokeRect(gxT - 13, 588, 26, 46);
  ctx.restore();

  // Trophy Exhibition Prop on Left of Desk (`x = 92..196`): Precision 3D-Modeled Chrome Riser Handlebar + Spun-Brass Bell!
  // Vibrates right at `outroT = 11.0s` (`136.0s`) when the solo brass bicycle bell `叮铃！` rings out!
  const bellRingVib =
    outroT >= 11.0 && outroT <= 11.65
      ? Math.sin((outroT - 11.0) * 58) * Math.exp(-(outroT - 11.0) * 5.0) * 2.6
      : 0;
  ctx.save();
  // 1. Turned mahogany & brushed-brass museum display pedestal base
  const pedG = ctx.createLinearGradient(92, 634, 186, 642);
  pedG.addColorStop(0.0, '#16120f');
  pedG.addColorStop(0.45, '#3b2b1e');
  pedG.addColorStop(1.0, '#120f0c');
  ctx.fillStyle = pedG;
  ctx.strokeStyle = '#d4af62';
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.ellipse(140, 638, 46, 7.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Machined headset locknut collar at base of quill stem
  ctx.fillStyle = '#94a3b8';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.roundRect(132, 626, 16, 10, 3);
  ctx.fill();
  ctx.stroke();

  // 2. Curved 3D Chrome Gooseneck Quill Stem & Swept Dual-Horn Riser Bar (dark outer casing + satin chrome core + white specular)
  const drawChromeTube = (fn, wOuter, wMid, wSpec) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#11151c';
    ctx.lineWidth = wOuter;
    fn();
    ctx.stroke();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = wMid;
    fn();
    ctx.stroke();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = wSpec;
    fn();
    ctx.stroke();
  };

  drawChromeTube(() => {
    ctx.beginPath();
    ctx.moveTo(140, 627);
    ctx.lineTo(142, 580);
    ctx.quadraticCurveTo(143, 571, 152, 571);
  }, 9.2, 6.0, 2.2);

  // Dual swept riser horns
  drawChromeTube(() => {
    ctx.beginPath();
    ctx.moveTo(150, 572);
    ctx.bezierCurveTo(136, 572, 128, 562, 114, 565);
    ctx.moveTo(150, 572);
    ctx.bezierCurveTo(162, 572, 168, 563, 180, 567);
  }, 8.0, 5.0, 1.8);

  // Forged stem clamp knuckle + recessed stainless hex bolt
  ctx.fillStyle = '#e2e8f0';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(149, 572, 5.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(149, 572, 2.1, 0, Math.PI * 2);
  ctx.fill();

  // Alloy front brake lever + gracefully arcing braided brake cable housing
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(176, 572);
  ctx.bezierCurveTo(172, 598, 156, 616, 144, 634);
  ctx.stroke();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(174, 570);
  ctx.quadraticCurveTo(181, 581, 191, 585);
  ctx.stroke();

  // 3. Contoured Stitched Dark-Umber Leather Handlebar Grips + Chrome Bar-End Plugs
  const drawGrip = (x0, y0, x1, y1) => {
    ctx.strokeStyle = '#1c120b';
    ctx.lineWidth = 9.8;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = '#5c3d26';
    ctx.lineWidth = 6.8;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(226, 192, 148, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2.2, 2.6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(x1, y1, 3.2, 0, Math.PI * 2);
    ctx.fill();
  };
  drawGrip(116, 565, 95, 572);
  drawGrip(176, 567, 197, 574);

  // 4. 3D Spun-Brass Bicycle Bell Dome + Finial Screw + Thumb Striker Lever at `(164, 560)`!
  const bx = 164 + bellRingVib;
  const bellG = ctx.createRadialGradient(bx - 3, 555, 1.5, bx, 559, 11);
  bellG.addColorStop(0.0, '#fffbeb');
  bellG.addColorStop(0.45, outroT >= 11.0 && outroT <= 11.4 ? '#fde047' : '#f59e0b');
  bellG.addColorStop(1.0, '#78350f');
  ctx.fillStyle = bellG;
  ctx.strokeStyle = '#3b2108';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(bx, 561, 9.6, Math.PI * 1.02, Math.PI * 2.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Top brass finial nut & side thumb-striker
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(bx, 551, 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(bx + 8, 561);
  ctx.lineTo(bx + 14, 564 - bellRingVib * 0.5);
  ctx.stroke();
  ctx.restore();
}

function drawPorousFoamCapsule(ctx, rx, ry, cLit, cMid, cDark, fStr) {
  const fg = ctx.createRadialGradient(-rx * 0.32, -ry * 0.32, rx * 0.12, 0, 0, Math.max(rx, ry) * 1.08);
  fg.addColorStop(0.0, cLit);
  fg.addColorStop(0.55, cMid);
  fg.addColorStop(1.0, cDark);
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = fStr > 0.03 ? `rgba(245, 250, 255, ${(0.25 + fStr * 0.48).toFixed(3)})` : 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx - 0.6, ry - 0.6, 0, -Math.PI * 0.88, -Math.PI * 0.12);
  ctx.stroke();
}

function drawBroadcastMicrophones(ctx, flashInfo) {
  const fStr = flashInfo.strength;
  // Slightly lowered central mic capsules (`tipY = 516..548`) so Naiwa's laughing face & belly stay 100% unobstructed!
  const mics = [
    { baseX: 176, baseY: 639, tipX: 250, tipY: 542, tilt: 0.48, kind: 'ochre_boom' },
    { baseX: 266, baseY: 636, tipX: 328, tipY: 526, tilt: 0.36, kind: 'chrome_dynamic' },
    { baseX: 356, baseY: 638, tipX: 398, tipY: 524, tilt: 0.24, kind: 'crimson_foam' },
    { baseX: 452, baseY: 635, tipX: 468, tipY: 536, tilt: 0.10, kind: 'shotgun_shock' },
    { baseX: 548, baseY: 635, tipX: 532, tipY: 532, tilt: -0.11, kind: 'brass_vintage' },
    { baseX: 638, baseY: 638, tipX: 600, tipY: 526, tilt: -0.25, kind: 'cobalt_coiled' },
    { baseX: 720, baseY: 640, tipX: 664, tipY: 542, tilt: -0.40, kind: 'charcoal_ball' },
  ];

  for (const m of mics) {
    // Soft cast shadow from foreground mics onto Naiwa's lower belly during xenon flashes
    if (fStr > 0.03 && m.tipX > 350 && m.tipX < 650) {
      ctx.fillStyle = `rgba(12, 6, 4, ${(0.12 + fStr * 0.18).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(m.tipX + (500 - flashInfo.originX) * 0.03, m.tipY - 6, 15, 22, m.tilt, 0, Math.PI * 2);
      ctx.fill();
    }

    const baseG = ctx.createLinearGradient(m.baseX - 24, m.baseY - 4, m.baseX + 24, m.baseY + 4);
    baseG.addColorStop(0.0, '#121418');
    baseG.addColorStop(0.45, m.kind === 'brass_vintage' ? '#8c6d34' : '#383e47');
    baseG.addColorStop(1.0, '#0d0f12');
    ctx.fillStyle = baseG;
    ctx.beginPath();
    ctx.ellipse(m.baseX, m.baseY, 23, 6.8, 0, 0, Math.PI * 2);
    ctx.fill();

    const ctrlX = lerp(m.baseX, m.tipX, 0.18);
    const ctrlY = m.tipY + 42;
    ctx.strokeStyle = '#242830';
    ctx.lineWidth = 5.4;
    ctx.beginPath();
    ctx.moveTo(m.baseX, m.baseY - 2);
    ctx.quadraticCurveTo(ctrlX, ctrlY, m.tipX, m.tipY);
    ctx.stroke();

    ctx.strokeStyle = m.kind === 'brass_vintage' ? '#caa55c' : '#9aa4b2';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(m.baseX - 0.8, m.baseY - 2);
    ctx.quadraticCurveTo(ctrlX - 0.8, ctrlY, m.tipX - 0.8, m.tipY);
    ctx.stroke();

    ctx.save();
    ctx.translate(m.tipX, m.tipY);
    ctx.rotate(m.tilt);
    ctx.fillStyle = '#5c6470';
    ctx.fillRect(-4.5, 12, 9, 12);

    if (m.kind === 'ochre_boom') {
      drawPorousFoamCapsule(ctx, 16, 22, '#f0bf59', '#c78e28', '#6e4b0e', fStr);
    } else if (m.kind === 'chrome_dynamic') {
      const cg = ctx.createRadialGradient(-5, -9, 2, 0, -5, 16);
      cg.addColorStop(0.0, '#ffffff');
      cg.addColorStop(0.45, '#aeb8c4');
      cg.addColorStop(1.0, '#3a414a');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, -6, 14, 0, Math.PI * 2);
      ctx.fill();
    } else if (m.kind === 'crimson_foam') {
      drawPorousFoamCapsule(ctx, 15, 21.5, '#cf404c', '#8f2029', '#450c11', fStr);
    } else if (m.kind === 'shotgun_shock') {
      ctx.fillStyle = '#cfd8e3';
      ctx.beginPath();
      ctx.roundRect(-5.5, -24, 11, 40, 4);
      ctx.fill();
    } else if (m.kind === 'brass_vintage') {
      ctx.fillStyle = '#d8ae54';
      ctx.strokeStyle = '#3d2b0c';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-12, -19, 24, 31, 10);
      ctx.fill();
      ctx.stroke();
    } else if (m.kind === 'cobalt_coiled') {
      drawPorousFoamCapsule(ctx, 15.5, 21, '#4d7cb3', '#29496e', '#132438', fStr);
    } else {
      drawPorousFoamCapsule(ctx, 16, 19, '#505763', '#2a2e36', '#121418', fStr);
    }
    ctx.restore();
  }
}

function drawTentCardNameplate(ctx, outroT, flashInfo) {
  const cx = 500;
  const fStr = flashInfo.strength;

  let dxTremble = 0;
  let rotTremble = 0;
  if (outroT >= 10.95 && outroT <= 11.60) {
    const dt = outroT - 10.95;
    const env = Math.sin(Math.min(1, dt / 0.08) * (Math.PI * 0.5)) * Math.exp(-dt * 5.2);
    dxTremble = env * Math.cos(dt * 38) * 3.2 + env * 1.8;
    rotTremble = env * Math.sin(dt * 42) * 0.012;
  }

  const cardW = 436;
  const cardH = 126;
  const cardX = cx - cardW * 0.5;
  const cardY = 640;

  ctx.save();
  ctx.translate(cx + dxTremble, cardY + cardH * 0.5);
  ctx.rotate(rotTremble);
  ctx.translate(-cx, -(cardY + cardH * 0.5));

  ctx.fillStyle = 'rgba(4, 6, 11, 0.56)';
  ctx.beginPath();
  ctx.moveTo(cardX + 8, cardY + 12);
  ctx.lineTo(cardX + cardW + 18, cardY + 10);
  ctx.lineTo(cardX + cardW + 8, cardY + cardH + 11);
  ctx.lineTo(cardX + 4, cardY + cardH + 11);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#bfb49e';
  ctx.beginPath();
  ctx.moveTo(cardX + cardW - 4, cardY);
  ctx.lineTo(cardX + cardW + 15, cardY + cardH - 18);
  ctx.lineTo(cardX + cardW, cardY + cardH);
  ctx.closePath();
  ctx.fill();

  const topInset = 4;
  const cardGrad = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
  cardGrad.addColorStop(0.0, fStr > 0.04 ? '#ffffff' : '#fdfaf2');
  cardGrad.addColorStop(0.55, '#f6efe1');
  cardGrad.addColorStop(1.0, '#eae0cc');
  ctx.fillStyle = cardGrad;
  ctx.beginPath();
  ctx.moveTo(cardX + topInset, cardY);
  ctx.lineTo(cardX + cardW - topInset, cardY);
  ctx.lineTo(cardX + cardW, cardY + cardH);
  ctx.lineTo(cardX, cardY + cardH);
  ctx.closePath();
  ctx.fill();

  const foilG = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  foilG.addColorStop(0.0, '#9e7a36');
  foilG.addColorStop(0.32, '#e4c47a');
  foilG.addColorStop(0.52, fStr > 0.04 ? '#fff6d6' : '#f4dc9c');
  foilG.addColorStop(0.75, '#b89146');
  foilG.addColorStop(1.0, '#8c6a2b');

  ctx.strokeStyle = foilG;
  ctx.lineWidth = 3.0;
  ctx.strokeRect(cardX + 11, cardY + 10, cardW - 22, cardH - 20);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(cardX + 17.5, cardY + 16.5, cardW - 35, cardH - 33);

  // Razor-sharp letterpress `奶蛙（本人）` typography in PelicanSerif!
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 54px "PelicanSerif", serif';
  ctx.fillStyle = 'rgba(255, 252, 244, 0.85)';
  ctx.fillText('奶蛙（本人）', cx + 0.8, cardY + cardH * 0.54 + 1.1);
  ctx.fillStyle = '#181410';
  ctx.fillText('奶蛙（本人）', cx, cardY + cardH * 0.54);

  ctx.restore();
}

function drawXenonFlashAndPressPit(ctx, outroT, flashInfo) {
  const fStr = flashInfo.strength;
  const pitRise = lerp(0.35, 1.0, smootherstep(3.6, 7.2, outroT));
  const ySlide = (1 - pitRise) * 52;

  if (fStr > 0.01) {
    const ox = flashInfo.originX;
    const oy = 905 + ySlide;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const beamG = ctx.createRadialGradient(ox, oy, 10, ox * 0.58 + 500 * 0.42, 480, 790);
    beamG.addColorStop(0.0, `rgba(255, 255, 255, ${(fStr * 0.78).toFixed(3)})`);
    beamG.addColorStop(0.24, `rgba(220, 238, 255, ${(fStr * 0.34).toFixed(3)})`);
    beamG.addColorStop(0.64, `rgba(195, 224, 255, ${(fStr * 0.12).toFixed(3)})`);
    beamG.addColorStop(1.0, 'rgba(195, 224, 255, 0)');
    ctx.fillStyle = beamG;
    ctx.fillRect(0, 0, 1000, 1000);

    if (fStr > 0.22) {
      const sA = Math.min(1, (fStr - 0.22) / 0.78);
      ctx.strokeStyle = `rgba(255, 255, 255, ${(sA * 0.85).toFixed(3)})`;
      ctx.lineWidth = 2.2;
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3 + 0.22;
        const rLen = (k % 2 === 0 ? 64 : 38) * sA;
        ctx.beginPath();
        ctx.moveTo(ox - Math.cos(a) * rLen, oy - Math.sin(a) * rLen);
        ctx.lineTo(ox + Math.cos(a) * rLen, oy + Math.sin(a) * rLen);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(0, ySlide);
  const rimStroke =
    fStr > 0.04
      ? `rgba(218, 236, 255, ${(0.34 + fStr * 0.48).toFixed(3)})`
      : 'rgba(132, 168, 214, 0.28)';

  const drawRimSilhouette = (pathFn) => {
    ctx.fillStyle = '#04070d';
    ctx.strokeStyle = rimStroke;
    ctx.lineWidth = 1.6;
    pathFn();
    ctx.fill();
    ctx.stroke();
  };

  drawRimSilhouette(() => {
    ctx.beginPath();
    ctx.moveTo(-12, 1012);
    ctx.quadraticCurveTo(6, 938, 54, 926);
    ctx.bezierCurveTo(46, 874, 114, 868, 116, 918);
    ctx.quadraticCurveTo(166, 928, 194, 1012);
    ctx.closePath();
  });

  drawRimSilhouette(() => {
    ctx.beginPath();
    ctx.moveTo(212, 1012);
    ctx.quadraticCurveTo(238, 948, 282, 944);
    ctx.bezierCurveTo(276, 898, 336, 898, 334, 944);
    ctx.quadraticCurveTo(368, 952, 388, 1012);
    ctx.closePath();
  });

  drawRimSilhouette(() => {
    ctx.beginPath();
    ctx.moveTo(664, 1012);
    ctx.quadraticCurveTo(698, 942, 742, 934);
    ctx.bezierCurveTo(738, 884, 804, 884, 802, 932);
    ctx.quadraticCurveTo(846, 940, 874, 1012);
    ctx.closePath();
  });

  drawRimSilhouette(() => {
    ctx.beginPath();
    ctx.moveTo(876, 1012);
    ctx.quadraticCurveTo(902, 924, 952, 914);
    ctx.lineTo(1012, 908);
    ctx.lineTo(1012, 1012);
    ctx.closePath();
  });

  ctx.restore();
}

function drawPressConferenceSlot(ctx, w, h, outroT, flashInfo) {
  ctx.save();
  ctx.scale(w / 1000, h / 1000);

  drawRearCorridor(ctx, flashInfo, outroT);
  drawStreakingNaiwaAndBell(ctx, outroT);
  drawMidnightVelvetCurtains(ctx, outroT);
  // Top-left museum brushed-brass foil watermark inside Slot #21 Press Conference!
  drawStylizedWatermarkAt(ctx, 'outro', 34, 34, 176, outroT);
  drawExecutiveArmchairBackrest(ctx, flashInfo);
  const naiwaDrawInfo = drawSeatedBellyLaughNaiwa(ctx, outroT, flashInfo);
  drawExecutiveArmchairArmrests(ctx, flashInfo);
  drawConferenceTableAndRefreshments(ctx, outroT, flashInfo, naiwaDrawInfo);
  drawAcousticBellRipples(ctx, outroT);
  drawBroadcastMicrophones(ctx, flashInfo);
  drawTentCardNameplate(ctx, outroT, flashInfo);
  drawXenonFlashAndPressPit(ctx, outroT, flashInfo);

  ctx.restore();
}

/**
 * Renders the Outro (sim t in [125.0, 137.0], outroT in [0, 12.0]) onto the 1080x1920 overlay canvas.
 */
export function renderOutro(kit, overlayG, t, renderSceneFn) {
  const rawOutroT = t - 125.0;
  const outroT = clamp(rawOutroT, 0, 12.0);

  const ctx = overlayG.drawingContext;
  ctx.save();
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  // Tile #20 = idx 19 -> col 1, row 6; Slot #21 = idx 20 -> col 2, row 6
  const tile20Col = 19 % COLS; // 1
  const tile20Row = Math.floor(19 / COLS); // 6
  const tile20Cx = GRID_X0 + tile20Col * (TILE_SIZE + TILE_GAP_X) + TILE_SIZE / 2;
  const tile20Cy = GRID_Y0 + tile20Row * (TILE_SIZE + TILE_GAP_Y) + TILE_SIZE / 2;

  const tile21Col = 20 % COLS; // 2
  const tile21Row = Math.floor(20 / COLS); // 6
  const tile21Cx = GRID_X0 + tile21Col * (TILE_SIZE + TILE_GAP_X) + TILE_SIZE / 2;
  const tile21Cy = GRID_Y0 + tile21Row * (TILE_SIZE + TILE_GAP_Y) + TILE_SIZE / 2;

  const startZoom = (BASE_PANEL_SCALE * 1000) / TILE_SIZE; // 920 / 212 = exact 0.0px match to Scroll World!
  const pullBackU = smootherstep(0.08, 1.58, outroT);
  const curGapX = lerp(0, TILE_GAP_X, pullBackU);
  const curGapY = lerp(0, TILE_GAP_Y, pullBackU);
  const pushInU = smootherstep(3.45, 6.85, outroT);

  let focusX = lerp(tile20Cx, VIEW_W / 2, pullBackU);
  let focusY = lerp(tile20Cy, VIEW_H / 2 - 24, pullBackU);
  let zoom = lerp(startZoom, 1.0, pullBackU);

  if (pushInU > 0) {
    focusX = lerp(focusX, tile21Cx, pushInU);
    focusY = lerp(focusY, tile21Cy + 8, pushInU);
    zoom = lerp(zoom, 4.55, pushInU); // 212 * 4.55 = 964.6px wide inside 1080px!
  }

  // Xenon camera flashes locked to audio DSLR shutter bursts (outroT = 4.0, 5.0, 6.0, 6.5, 7.0s)
  const flashSpecs = [
    { ft: 4.0, ox: 165, oy: 1035 },
    { ft: 5.0, ox: 776, oy: 1025 },
    { ft: 6.0, ox: 118, oy: 1030 },
    { ft: 6.5, ox: 368, oy: 1040 },
    { ft: 7.0, ox: 868, oy: 1025 },
  ];
  let flashInfo = { strength: 0, originX: 500, originY: 1030 };
  for (const sp of flashSpecs) {
    const dt = outroT - sp.ft;
    if (dt >= -0.02 && dt < 0.36) {
      const s = Math.exp(-Math.max(0, dt) * 14);
      if (s > flashInfo.strength) {
        flashInfo = { strength: s, originX: sp.ox, originY: sp.oy };
      }
    }
  }

  ctx.fillStyle = pullBackU < 0.999 ? '#241f1a' : '#13110f';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const wallG = getBakedMuseumWall(kit);
  const coneG = getBakedPictureLightCone(kit);

  ctx.save();
  ctx.translate(VIEW_W / 2, VIEW_H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-focusX, -focusY);

  if (pullBackU > 0.002) {
    ctx.save();
    ctx.globalAlpha = pullBackU;
    ctx.drawImage(wallG.canvas, WALL_OX, WALL_OY, WALL_W, WALL_H);
    ctx.restore();
  }

  const halfViewW = VIEW_W / (2 * zoom);
  const halfViewH = VIEW_H / (2 * zoom);
  const viewMinX = focusX - halfViewW - 95;
  const viewMaxX = focusX + halfViewW + 95;
  const viewMinY = focusY - halfViewH - 85;
  const viewMaxY = focusY + halfViewH + 85;

  const museumLightAlpha = smootherstep(0.18, 0.96, pullBackU);
  if (museumLightAlpha > 0.003) {
    ctx.save();
    ctx.globalAlpha = museumLightAlpha;
    for (let idx = 0; idx < 21; idx++) {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const tx = tile20Cx + (col - tile20Col) * (TILE_SIZE + curGapX) - TILE_SIZE / 2;
      const ty = tile20Cy + (row - tile20Row) * (TILE_SIZE + curGapY) - TILE_SIZE / 2;
      if (tx + TILE_SIZE < viewMinX || tx > viewMaxX || ty + TILE_SIZE < viewMinY || ty > viewMaxY) continue;
      ctx.drawImage(coneG.canvas, tx + TILE_SIZE * 0.5 - 160, ty - 24, 320, 310);
    }
    ctx.restore();
  }

  const tempLiveSlot = kit.getSlot(3);
  for (let idx = 0; idx < 21; idx++) {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const tx = tile20Cx + (col - tile20Col) * (TILE_SIZE + curGapX) - TILE_SIZE / 2;
    const ty = tile20Cy + (row - tile20Row) * (TILE_SIZE + curGapY) - TILE_SIZE / 2;
    if (tx + TILE_SIZE < viewMinX || tx > viewMaxX || ty + TILE_SIZE < viewMinY || ty > viewMaxY) continue;

    if (idx === 20) {
      const slot21Alpha = smootherstep(0.10, 0.68, outroT);
      if (slot21Alpha <= 0.002) continue;
      ctx.save();
      ctx.globalAlpha = slot21Alpha;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.54)';
      ctx.fillRect(tx + 4.5, ty + 6.5, TILE_SIZE + 2, TILE_SIZE + 2);

      ctx.save();
      ctx.translate(tx, ty);
      ctx.beginPath();
      ctx.rect(0, 0, TILE_SIZE, TILE_SIZE);
      ctx.clip();
      drawPressConferenceSlot(ctx, TILE_SIZE, TILE_SIZE, outroT, flashInfo);
      ctx.restore();

      drawSlot21MitredGiltFrame(ctx, tx, ty, TILE_SIZE, flashInfo.strength);
      if (museumLightAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = slot21Alpha * museumLightAlpha;
        drawPictureLampFixture(kit, ctx, tx, ty);
        ctx.restore();
      }
      ctx.restore();
      continue;
    }

    if (pullBackU > 0.002) {
      ctx.fillStyle = `rgba(0, 0, 0, ${(0.52 * pullBackU).toFixed(3)})`;
      ctx.fillRect(tx + 5 * pullBackU, ty + 7 * pullBackU, TILE_SIZE, TILE_SIZE);
    }

    const scene = SCENES[idx];
    tempLiveSlot.usedFb = false;
    tempLiveSlot.g2d.clear();

    let livePelX;
    let liveLocalT;
    let liveRawLocalT;
    let liveGlobalT;
    let livePedalAngle;

    if (idx === 19 && rawOutroT < 0.96) {
      // Exact 0.0px match-cut continuation from Scene #20 as camera begins pullback!
      livePelX = 1000 + (rawOutroT / 6.0) * 1000;
      liveLocalT = clamp(6.0 + rawOutroT, 0, 6.0);
      liveRawLocalT = 6.0 + rawOutroT;
      liveGlobalT = t;
      livePedalAngle = (t / 0.5) * Math.PI;
    } else {
      // Every single artwork #01..#20 actively animates & rides its bicycle live on the 3x7 wall!
      livePedalAngle = (t / 0.5) * Math.PI * 1.28 + idx * 0.72;
      if (idx === 19) {
        livePelX = 165 + (((outroT - 0.96) * 165) % 670);
        liveLocalT = 4.75 + (((outroT * 0.88) % 1.15));
      } else if (idx === 18) {
        // #19 Short Video: sweep cyclist briskly across 9:16 smartphone screen (VX=219..VR=781)
        livePelX = 235 + (((outroT * 185 + 95) % 520));
        liveLocalT = 0.85 + (((outroT * 0.95 + idx * 0.45) % 4.35));
      } else if (idx === 16) {
        // #17 Win98/QQ: keep pixel Naiwa riding inside MS Paint canvas
        livePelX = 215 + (((outroT * 145 + idx * 83) % 550));
        liveLocalT = 0.90 + (((outroT * 0.90 + idx * 0.51) % 4.30));
      } else if (idx === 14) {
        // #15 Oscilloscope: pure CRT vector cyclist riding window (outside Lissajous morph)
        livePelX = 210 + (((outroT * 150 + idx * 113) % 580));
        liveLocalT = 0.45 + (((outroT * 0.85 + 0.3) % 1.35));
      } else if (idx === 4) {
        // #05 Northern Song: mountain log bridge & cliff plank trail
        livePelX = 235 + (((outroT * 132 + idx * 107) % 525));
        liveLocalT = 0.80 + (((outroT * 0.90 + idx * 0.47) % 4.40));
      } else if (idx === 1) {
        // #02 Egypt: active Tutankhamun chariot-bike pedaling window (outside cubit freeze)
        livePelX = 175 + (((outroT * 155 + idx * 137) % 650));
        liveLocalT = 4.55 + (((outroT * 0.88 + 0.2) % 1.25));
      } else {
        livePelX = 175 + (((outroT * 155 + idx * 137) % 650));
        liveLocalT = 0.75 + (((outroT * 0.94 + idx * 0.57) % 4.50));
      }
      liveRawLocalT = liveLocalT;
      liveGlobalT = scene.t0 + liveLocalT;
    }

    renderSceneFn(kit, tempLiveSlot, scene, {
      t: liveGlobalT,
      localT: liveLocalT,
      rawLocalT: liveRawLocalT,
      pelicanLocalX: livePelX,
      pedalAngle: livePedalAngle,
      speedScale: 1.0,
      isOutroThumbnail: false,
      isLiveWallTile: true,
    });

    const tileCtx = tempLiveSlot.g2d.drawingContext;
    renderPanelAmbientLife(tileCtx, scene, liveGlobalT, liveLocalT);

    // Crisp museum placard strip at bottom of each live tile once wall pulls back
    const labelAlpha = smoothstep(0.32, 0.88, pullBackU);
    if (labelAlpha > 0.01) {
      tileCtx.save();
      tileCtx.globalAlpha = labelAlpha;
      tileCtx.fillStyle = 'rgba(15, 14, 12, 0.76)';
      tileCtx.fillRect(0, 1000 - 96, 1000, 96);
      tileCtx.fillStyle = '#f5f0e6';
      tileCtx.font = '700 48px "PelicanSerif", serif';
      tileCtx.textAlign = 'left';
      tileCtx.textBaseline = 'middle';
      tileCtx.fillText(`${String(scene.num).padStart(2, '0')} ${scene.zh}`, 36, 1000 - 48);
      tileCtx.restore();
    }

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tempLiveSlot.g2d.canvas, tx, ty, TILE_SIZE, TILE_SIZE);
    ctx.restore();

    if (idx === 19) {
      ctx.strokeStyle = '#161b22';
      ctx.lineWidth = lerp(0.85, 4.4, pullBackU);
      ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = `rgba(88, 166, 255, ${lerp(0.55, 0.88, pullBackU).toFixed(3)})`;
      ctx.lineWidth = lerp(0.35, 1.3, pullBackU);
      const inset = lerp(0.7, 2.8, pullBackU);
      ctx.strokeRect(tx + inset, ty + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
    } else {
      ctx.strokeStyle = scene.frameColor || '#5c4632';
      ctx.lineWidth = 4.6;
      ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = scene.frameAccent || '#d4a373';
      ctx.lineWidth = 1.3;
      ctx.strokeRect(tx + 3, ty + 3, TILE_SIZE - 6, TILE_SIZE - 6);
    }

    if (museumLightAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = museumLightAlpha;
      drawPictureLampFixture(kit, ctx, tx, ty);
      drawMuseumMicroPlaque(kit, ctx, tx, ty, scene, outroT);
      ctx.restore();
    }
    if (idx !== 20 && pushInU > 0.15) {
      // Smoothly dim surrounding exhibition tiles during the close-up spotlight on Slot #21!
      ctx.save();
      ctx.fillStyle = `rgba(12, 10, 9, ${(smoothstep(0.15, 0.92, pushInU) * 0.88).toFixed(3)})`;
      ctx.fillRect(tx - 8, ty - 14, TILE_SIZE + 16, TILE_SIZE + 32);
      ctx.restore();
    }
  }
  ctx.restore();

  // Top-left museum brushed-brass watermark during the 3x7 exhibition wall overview
  const wallWmAlpha = pullBackU * (1 - smoothstep(0.45, 0.92, pushInU));
  if (wallWmAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = wallWmAlpha;
    drawStylizedWatermarkAt(ctx, 'outro', 46, 20, 148, outroT);
    ctx.restore();
  }

  // Centered Documentary Subtitles sized cleanly for 1080x1920 vertical screen!
  const sub1Alpha = smoothstep(1.22, 1.68, outroT) * (1 - smoothstep(3.65, 4.25, outroT));
  if (sub1Alpha > 0.005) {
    drawCenteredSubtitle(ctx, '「截至目前，人类共提交了 20 份答卷。」', sub1Alpha);
  }

  const sub2Alpha = smoothstep(5.65, 6.25, outroT) * (1 - smoothstep(11.65, 11.98, outroT));
  if (sub2Alpha > 0.005) {
    drawCenteredSubtitle(ctx, '「奶蛙本人对此仅以捧腹大笑回应。」', sub2Alpha);
  }

  ctx.restore();
}

function drawCenteredSubtitle(ctx, text, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '600 37px "PelicanSerif", serif';
  const tw = ctx.measureText(text).width;
  const padX = 34;
  const boxH = 74;
  const bw = Math.min(VIEW_W - 64, tw + padX * 2);
  const bx = (VIEW_W - bw) / 2;
  const by = VIEW_H - 166;

  ctx.fillStyle = 'rgba(10, 9, 8, 0.88)';
  ctx.strokeStyle = 'rgba(214, 184, 128, 0.54)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, boxH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(214, 184, 128, 0.18)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(bx + 5, by + 5, bw - 10, boxH - 10, 7);
  ctx.stroke();

  ctx.fillStyle = '#f8f2e4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, VIEW_W / 2, by + boxH / 2 + 2);
  ctx.restore();
}
