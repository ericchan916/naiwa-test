// src/scenes/s13_scream.js
// #13 蒙克《呐喊》 (1893 · Expressionist Fjord Bridge) — r3 Museum-Authentic Masterpiece
// Physical Medium: Casein/tempera & greasy pastel crayons on unprimed brown wood-pulp board (Papp).
// - Hybrid WebGL2 Kubelka-Munk spectral underpainting (`kit.bakeBrush` -> `fb.get().canvas` -> `bake2D`,
//   keeping `slot.usedFb = false` for <16ms/frame steady-state and 100% Outro gallery compatibility)
// - Raw 1893 unprimed brown wood-pulp board breathing gaps & paper-tooth dry-pastel skip mask
// - Zero modern geometric primitives (no capsule wheel shadow, no floating wire rings, no arc cartoon eye,
//   no top-left modern placard; includes Munch's faint 1893 scratched pencil inscription easter egg!)
// - Bar 2 Gag (localT 2..4s): Cadaverous casein death-mask Screamer recoils in horror as the unfazed
//   pastel pelican hurtles past—sending real acoustic field-warping spasms through the blood-red sky
//   ribbons & dark Oslo Fjord currents with 12Hz hand-repainted brush boil!

import {
  PANEL_SIZE,
  ROAD_EDGE_Y,
  clamp,
  lerp,
  smoothstep,
  smootherstep,
} from '../beat/timeline.js';
import { computePelicanRig } from '../rig/pelican.js';
import { paintNaiwaScream } from '../rig/naiwa.js';
import { makePRNG, hashSeed } from '../kit/kit.js';

// Shared 1-point perspective vanishing point for the Ekeberg fjord bridge
const VP_X = -880;
const VP_Y = 356;
const INNER_DECK_Y0 = 490; // y(0)=490 -> y(1000)=638
const OUTER_DECK_Y0 = 838; // y(0)=838 -> y(302)=1000 (generous bridge deck margin below y=680)

function bridgeRayY(x, yAtZero) {
  const m = (yAtZero - VP_Y) / (0 - VP_X);
  return VP_Y + m * (x - VP_X);
}

/**
 * Deterministic 1D hash in [0, 1) for dry-pastel paper-tooth skip & bristle grit.
 */
function toothHash(n) {
  let x = Math.imul(n | 0, 0x27d4eb2d);
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0x85ebca6b) >>> 0;
  return ((x ^ (x >>> 13)) >>> 0) * 2.3283064365386963e-10;
}

/**
 * Evaluates Munch's undulating sky wave Y-coordinate at horizontal coordinate `x`.
 */
function skyWaveY(x, baseLineY, seedPhase = 0) {
  const nx = x / PANEL_SIZE;
  return (
    baseLineY +
    Math.sin(nx * Math.PI * 2.35 + seedPhase) * 34 +
    Math.sin(nx * Math.PI * 5.1 - seedPhase * 0.7 + 1.1) * 14 +
    Math.cos(nx * Math.PI * 1.2 + 0.4) * 22
  );
}

/**
 * Displaces sky & fjord brushstroke coordinates around the Screamer's open mouth
 * during Bar 2 (`shock > 0`), making the painting's own sky & water bands heave and
 * spasm with acoustic compression waves instead of drawing artificial wire circles.
 */
function warpFieldAroundScream(x, y, mouthX, mouthY, shock, boilT) {
  if (shock <= 0.005) return [x, y];
  const dx = x - mouthX;
  const dy = (y - mouthY) * 1.18;
  const dist = Math.hypot(dx, dy);
  const maxR = 640;
  if (dist >= maxR || dist < 4) return [x, y];

  const falloff = Math.pow(1 - dist / maxR, 1.35) * smoothstep(6, 46, dist);
  // Propagating acoustic wave fronts radiating from the Screamer's shriek
  const wavePhase = dist * 0.056 - boilT * 9.2;
  const radialPush = Math.sin(wavePhase) * 19.5 * shock * falloff;
  const shearHeave = Math.cos(wavePhase * 0.5 + dx * 0.008) * 11.5 * shock * falloff;

  const invD = 1 / dist;
  return [
    x + dx * invD * radialPush,
    y + dy * invD * radialPush * 0.92 + shearHeave,
  ];
}

/**
 * Multi-bristle dry-dragged pastel / casein ribbon stroke (`多鬃毛干擦粉彩/蛋彩笔触`).
 * Replaces uniform round-capped Canvas2D polylines with variable-pressure tapered polygon
 * strands, broken cardboard-tooth gaps, and dry chalk edge crumbs.
 */
function drawDryPastelRibbon(ctx, pts, opts = {}) {
  const {
    color = '#d94e28',
    width = 6.5,
    alpha = 0.9,
    waviness = 1.8,
    freq = 0.12,
    phase = 0,
    bristles = 3,
    dryness = 0.24, // 0 = wet casein, 0.45 = chalky dry pastel skipping over cardboard tooth
    crumbs = false,
    taper = true,
  } = opts;
  if (!pts || pts.length < 2) return;

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'bevel';
  ctx.lineCap = 'butt';

  const seedBase = Math.floor((phase * 97.3 + width * 31.7) * 100) | 0;

  for (let b = 0; b < bristles; b++) {
    const bNorm = bristles === 1 ? 0 : (b / (bristles - 1)) * 2 - 1;
    const bAlpha =
      alpha *
      (bristles === 1 ? 1 : 0.54 + 0.42 * (1 - Math.abs(bNorm))) *
      (0.88 + 0.12 * toothHash(seedBase + b * 17));
    if (bAlpha <= 0.02) continue;

    const baseHalfW =
      Math.max(0.45, (width / Math.pow(bristles, 0.56)) * 0.54) *
      (1 - 0.22 * Math.abs(bNorm));

    // Build left/right variable-width polygon strip with dry-drag skip breaks
    let leftStrip = [];
    let rightStrip = [];
    let dist = 0;

    const flushSubStrip = () => {
      if (leftStrip.length < 2) {
        leftStrip.length = 0;
        rightStrip.length = 0;
        return;
      }
      ctx.globalAlpha = clamp(bAlpha, 0, 1);
      ctx.beginPath();
      ctx.moveTo(leftStrip[0][0], leftStrip[0][1]);
      for (let k = 1; k < leftStrip.length; k++) {
        ctx.lineTo(leftStrip[k][0], leftStrip[k][1]);
      }
      for (let k = rightStrip.length - 1; k >= 0; k--) {
        ctx.lineTo(rightStrip[k][0], rightStrip[k][1]);
      }
      ctx.closePath();
      ctx.fill();
      leftStrip.length = 0;
      rightStrip.length = 0;
    };

    for (let i = 0; i < pts.length; i++) {
      const [px, py] = pts[i];
      let tx = 1;
      let ty = 0;
      if (i < pts.length - 1) {
        const dx = pts[i + 1][0] - px;
        const dy = pts[i + 1][1] - py;
        const len = Math.hypot(dx, dy) || 1;
        tx = dx / len;
        ty = dy / len;
        if (i > 0) dist += len;
      } else {
        const dx = px - pts[i - 1][0];
        const dy = py - pts[i - 1][1];
        const len = Math.hypot(dx, dy) || 1;
        tx = dx / len;
        ty = dy / len;
        dist += len;
      }
      const nx = -ty;
      const ny = tx;

      const u = i / (pts.length - 1);
      const env = taper ? Math.pow(Math.sin(Math.PI * clamp(u, 0.03, 0.97)), 0.62) : 1;
      const hVal = toothHash(seedBase + b * 131 + i * 37);

      // Dry pastel skips across valleys of the rough wood-pulp cardboard near bristle ends/edges
      const skipThresh = dryness * (0.35 + 0.55 * Math.abs(bNorm) + 0.35 * (1 - env));
      if (dryness > 0.05 && i > 0 && i < pts.length - 1 && hVal < skipThresh * 0.48) {
        flushSubStrip();
        continue;
      }

      const spread = bNorm * width * 0.36 * (0.78 + 0.22 * env);
      const tremor =
        Math.sin(dist * freq + phase + b * 2.05) * waviness * env +
        (hVal - 0.5) * waviness * 0.85;
      const pressureMod = 0.62 + 0.68 * toothHash(seedBase + b * 73 + i * 19);
      const hw = baseHalfW * env * pressureMod;

      const cx = px + nx * (spread + tremor);
      const cy = py + ny * (spread + tremor);
      leftStrip.push([cx - nx * hw, cy - ny * hw]);
      rightStrip.push([cx + nx * hw, cy + ny * hw]);

      // Chalky pastel dust crumbs shed along high-contrast edges
      if (crumbs && (i + b) % 2 === 0 && hVal > 0.52) {
        ctx.globalAlpha = clamp(bAlpha * 0.72, 0, 1);
        const side = hVal > 0.76 ? 1 : -1;
        const cOff = hw + (0.8 + hVal * 2.8);
        const cw = 1.1 + hVal * 2.1;
        const ch = 0.8 + (1 - hVal) * 1.6;
        ctx.fillRect(cx + nx * side * cOff - cw * 0.5, cy + ny * side * cOff - ch * 0.5, cw, ch);
      }
    }
    flushSubStrip();
  }

  ctx.restore();
}

/**
 * Faintly scratches Munch's real 1893 Oslo National Museum pencil inscription
 * ("Kan kun være malet af en gal Mand!") into the upper-left blood-red pastel sky band.
 */
function drawMunchMadmanPencilEasterEgg(ctx, rng) {
  ctx.save();
  ctx.translate(64, 92);
  ctx.rotate(-0.068);
  ctx.font = 'italic 400 14.5px "PelicanSerif", Georgia, serif';
  ctx.fillStyle = 'rgba(54, 38, 30, 0.21)';
  ctx.strokeStyle = 'rgba(228, 202, 162, 0.12)';
  ctx.lineWidth = 0.55;

  const words = ['Kan', 'kun', 'være', 'malet', 'af', 'en', 'gal', 'Mand!'];
  let cursorX = 0;
  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const word = words[wIdx];
    const jitterY = Math.sin(wIdx * 1.4) * 2.1 + (rng() - 0.5) * 1.4;
    const tilt = (rng() - 0.5) * 0.055;
    ctx.save();
    ctx.translate(cursorX, jitterY);
    ctx.rotate(tilt);
    ctx.strokeText(word, 0.4, 0.4);
    ctx.fillText(word, 0, 0);
    ctx.restore();
    cursorX += ctx.measureText(word).width + 6.5 + rng() * 2.2;
  }

  // Faint broken graphite hairline scratch underneath part of the note
  drawDryPastelRibbon(
    ctx,
    [
      [2, 5],
      [96, 3.5],
      [198, 6],
      [256, 4.2],
    ],
    {
      color: '#3a2820',
      width: 1.1,
      alpha: 0.16,
      waviness: 0.7,
      bristles: 1,
      dryness: 0.42,
      taper: true,
    }
  );
  ctx.restore();
}

/**
 * Bakes a seamless 256x256 raw 1893 brown wood-pulp cardboard (Papp) tooth overlay
 * so dynamic pastel strokes also breathe with subtle cardboard grain.
 */
function getBakedCardboardToothTile(kit) {
  return kit.bake2D(
    's13_papp_tooth_tile_r3',
    (_g, ctx, rng, w, h) => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 950; i++) {
        const x = rng() * w;
        const y = rng() * h;
        const len = 6 + rng() * 34;
        const th = 0.7 + rng() * 1.4;
        ctx.fillStyle =
          rng() > 0.45
            ? `rgba(182, 142, 92, ${(0.04 + rng() * 0.07).toFixed(3)})`
            : `rgba(74, 48, 26, ${(0.035 + rng() * 0.06).toFixed(3)})`;
        ctx.fillRect(x, y, len, th);
      }
      for (let i = 0; i < 420; i++) {
        ctx.fillStyle =
          rng() > 0.5 ? 'rgba(218, 184, 134, 0.08)' : 'rgba(58, 36, 18, 0.09)';
        ctx.fillRect(rng() * w, rng() * h, 1.4 + rng() * 1.8, 1.2 + rng() * 1.6);
      }
    },
    256,
    256
  );
}

/**
 * Bakes the 1000x1000 Munch 1893 masterpiece backdrop:
 * Step A: WebGL2 `kit.bakeBrush` Kubelka-Munk spectral casein washes + pastel/charcoal strokes
 *         transferred once via `fb.get().canvas` into `bake2D` (`slot.usedFb = false`!).
 * Step B: Unprimed brown wood-pulp board fibers, swirling Oslo Fjord & 2 boats, scraped casein
 *         bridge planks & diagonal railings, 2 distant top-hat silhouettes, and Munch's pencil note!
 */
function getBakedScreamBackdrop(kit) {
  return kit.bake2D('s13_scream_master_bg_r3', (_g, ctx, rng, w, h) => {
    // 1. Raw 1893 unprimed warm wood-pulp board (Papp) base
    const cardGrad = ctx.createLinearGradient(0, 0, w, h);
    cardGrad.addColorStop(0, '#be9868');
    cardGrad.addColorStop(0.48, '#ae8758');
    cardGrad.addColorStop(1, '#946e44');
    ctx.fillStyle = cardGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. WebGL2 Kubelka-Munk Spectral Underpainting (`kit.bakeBrush` -> `fb.get().canvas`)
    if (kit && typeof kit.bakeBrush === 'function' && kit.brush) {
      const spectralFb = kit.bakeBrush('s13_munch_spectral_under_r3', (p, brush, bRng) => {
        // Fill FBO with warm 1893 Papp cardboard tone so Kubelka-Munk mixes pigment into tan board!
        p.background(180, 141, 92);

        // A. Matte Casein Spectral Washes (leaving raw cardboard breathing margins!)
        brush.noStroke();
        brush.noHatch();

        // Blood-red & vermilion upper sky casein blotches
        brush.fill('#9e1d14', 148);
        brush.fillBleed(0.24, 'out');
        brush.fillTexture(0.82, 0.56);
        brush.polygon([
          [-20, -15],
          [1020, -15],
          [1020, 145],
          [690, 178],
          [340, 118],
          [-20, 162],
        ]);

        // Sulfur-amber & fiery orange mid-sky casein wash
        brush.fill('#e87828', 132);
        brush.fillBleed(0.26, 'out');
        brush.fillTexture(0.78, 0.48);
        brush.polygon([
          [-20, 152],
          [380, 134],
          [760, 198],
          [1020, 168],
          [1020, 345],
          [520, 365],
          [-20, 338],
        ]);

        // Abyssal Prussian-blue & indigo Oslo Fjord casein wash
        brush.fill('#182b4c', 186);
        brush.fillBleed(0.22, 'out');
        brush.fillTexture(0.84, 0.58);
        brush.polygon([
          [120, 368],
          [820, 355],
          [920, 625],
          [420, 710],
          [80, 515],
        ]);

        // Pale sulfur-celadon fjord island cove glow
        brush.fill('#ccb87d', 136);
        brush.fillBleed(0.28, 'out');
        brush.fillTexture(0.76, 0.45);
        brush.polygon([
          [455, 428],
          [685, 418],
          [735, 510],
          [510, 542],
        ]);

        // Dark Ekeberg pine hillside mass on right
        brush.fill('#1a242b', 192);
        brush.fillBleed(0.2, 'out');
        brush.fillTexture(0.85, 0.6);
        brush.polygon([
          [860, 310],
          [1020, 295],
          [1020, 665],
          [725, 595],
        ]);

        // Burnt-umber & sienna wooden bridge under-wash
        brush.fill('#563321', 176);
        brush.fillBleed(0.16, 'out');
        brush.fillTexture(0.86, 0.62);
        brush.polygon([
          [-10, bridgeRayY(0, INNER_DECK_Y0)],
          [1010, bridgeRayY(1000, INNER_DECK_Y0)],
          [1010, 1015],
          [-10, 1015],
        ]);

        // B. Greasy Pastel, Crayon & Charcoal Spectral Strokes
        brush.noFill();
        brush.noField();

        // Sweeping pastel & crayon sky ribbons (deliberately spaced so tan cardboard peeks through!)
        const pSkyPalette = [
          '#8f1611', '#c72819', '#e34c1f', '#f28529',
          '#f6c441', '#f5df6e', '#5c1f31', '#d63e1d',
        ];
        for (let row = 0; row < 28; row++) {
          const baseY = 10 + row * 13.5 + (bRng() - 0.5) * 8;
          const col =
            row < 7
              ? pSkyPalette[row % 3]
              : row < 15
              ? pSkyPalette[2 + (row % 4)]
              : pSkyPalette[3 + (row % 5)];
          const tool = row % 3 === 0 ? 'crayon' : 'pastel';
          brush.set(tool, col, 2.4 + bRng() * 2.2);
          const pts = [];
          const ph = row * 0.48 + bRng() * 0.5;
          for (let x = -20; x <= 1020; x += 68) {
            pts.push([x, skyWaveY(x, baseY, ph), 0.72 + bRng() * 0.36]);
          }
          brush.spline(pts, 0.5);
        }

        // Charcoal & pastel swirling fjord strokes
        for (let ring = 0; ring < 24; ring++) {
          const rx = 44 + ring * 13.5;
          const ry = 20 + ring * 6.2;
          const pts = [];
          const a0 = -0.5 + (bRng() - 0.5) * 0.6;
          for (let k = 0; k <= 7; k++) {
            const a = a0 + k * 0.36;
            const px = 588 + Math.cos(a) * rx;
            const py = 486 + Math.sin(a) * ry;
            if (py > 352 && py < 695) {
              pts.push([px, py, 0.75 + bRng() * 0.3]);
            }
          }
          if (pts.length >= 3) {
            const fCol =
              ring >= 5 && ring <= 8
                ? '#dfd096'
                : ring === 11 || ring === 12
                ? '#d44522'
                : ring % 2 === 0
                ? '#111d36'
                : '#2d4b70';
            brush.set(ring % 2 === 0 ? 'charcoal' : 'pastel', fCol, 2.1 + bRng() * 1.6);
            brush.spline(pts, 0.5);
          }
        }

        // Dry charcoal & crayon bridge plank strokes converging toward VP
        const bPlankCols = ['#382019', '#6e3f22', '#9b6431', '#281924', '#b88342'];
        for (let i = 0; i < 58; i++) {
          const yZero = INNER_DECK_Y0 + 8 + bRng() * (OUTER_DECK_Y0 - INNER_DECK_Y0 - 16);
          const x0 = bRng() * 420;
          const x1 = Math.min(1015, x0 + 340 + bRng() * 520);
          const xm = (x0 + x1) * 0.5;
          brush.set(
            i % 2 === 0 ? 'charcoal' : 'crayon',
            bPlankCols[i % bPlankCols.length],
            1.9 + bRng() * 1.8
          );
          brush.spline(
            [
              [x0, bridgeRayY(x0, yZero), 0.75],
              [xm, bridgeRayY(xm, yZero) + (bRng() - 0.5) * 3, 0.95],
              [x1, bridgeRayY(x1, yZero), 0.68],
            ],
            0.35
          );
        }
      });

      const snap = spectralFb.get();
      if (snap && snap.canvas) {
        ctx.drawImage(snap.canvas, 0, 0, w, h);
      }
    }

    // 3. Authentic 1893 Unprimed Wood-Pulp Cardboard Fiber & Bark Flecks (Papp Texture)
    for (let i = 0; i < 2200; i++) {
      const gx = rng() * w;
      const gy = rng() * h;
      const gw = 10 + rng() * 54;
      const gh = 0.7 + rng() * 1.7;
      ctx.fillStyle =
        rng() > 0.46
          ? `rgba(218, 182, 132, ${(0.05 + rng() * 0.08).toFixed(3)})`
          : `rgba(76, 48, 25, ${(0.05 + rng() * 0.09).toFixed(3)})`;
      ctx.fillRect(gx, gy, gw, gh);
    }
    for (let i = 0; i < 1100; i++) {
      ctx.fillStyle = rng() > 0.38 ? 'rgba(58, 36, 18, 0.22)' : 'rgba(232, 202, 154, 0.19)';
      ctx.fillRect(rng() * w, rng() * h, 1.2 + rng() * 2.2, 1.1 + rng() * 1.9);
    }

    // 4. Dry-Dragged Pastel & Casein Sky Ribbons (leaving raw tan Papp cardboard breathing gaps!)
    const skyColors = [
      '#8b1510', '#ba2016', '#da3b1d', '#ee5f21', '#f4872b',
      '#f7c13e', '#f6dd6c', '#5e1c2e', '#cf3f1f', '#b58d5c', // raw Papp tone gap!
    ];
    for (let band = -1; band < 17; band++) {
      const baseY = band * 24 + 8;
      // Leave deliberate breathing slivers between bands so raw cardboard glows through!
      const col =
        band < 3
          ? '#961913'
          : band < 6
          ? '#d2371c'
          : band < 9
          ? '#f17d29'
          : band < 12
          ? '#f4c545'
          : band < 15
          ? '#df5222'
          : '#492f4b';
      const pts = [];
      const ph = band * 0.55 + rng() * 0.35;
      for (let x = -30; x <= w + 30; x += 28) {
        pts.push([x, skyWaveY(x, baseY, ph)]);
      }
      drawDryPastelRibbon(ctx, pts, {
        color: col,
        width: 17 + rng() * 9,
        alpha: 0.64,
        waviness: 2.3,
        freq: 0.05,
        phase: ph,
        bristles: 3,
        dryness: 0.26,
        taper: false,
      });
    }

    for (let i = 0; i < 185; i++) {
      const yNorm = rng();
      const baseY = -8 + yNorm * 398;
      let col;
      if (rng() < 0.09) {
        // Raw cardboard breathing streak
        col = '#b88f5e';
      } else if (yNorm < 0.26) {
        col = rng() < 0.58 ? (rng() < 0.5 ? '#991611' : '#c92919') : '#e65421';
      } else if (yNorm < 0.55) {
        col = rng() < 0.45 ? '#eb6623' : rng() < 0.55 ? '#f5bc3e' : '#c92b1a';
      } else if (yNorm < 0.8) {
        col = rng() < 0.48 ? '#f6d85f' : rng() < 0.6 ? '#f08c31' : '#4a3556';
      } else {
        col = skyColors[Math.floor(rng() * skyColors.length)];
      }

      const xStart = -40 + rng() * (w - 110);
      const segLen = 170 + rng() * 440;
      const ph = yNorm * 6.2 + rng() * 1.1;
      const pts = [];
      for (let x = xStart; x <= Math.min(w + 40, xStart + segLen); x += 24) {
        pts.push([x, skyWaveY(x, baseY, ph)]);
      }
      drawDryPastelRibbon(ctx, pts, {
        color: col,
        width: 5.0 + rng() * 8.5,
        alpha: 0.74 + rng() * 0.2,
        waviness: 1.8 + rng() * 1.8,
        freq: 0.08,
        phase: rng() * 6.28,
        bristles: 3,
        dryness: 0.32,
        crumbs: i % 4 === 0,
        taper: true,
      });
    }

    // Iconic Munch swirling red-orange vortex tongue in upper-right sky
    for (let k = 0; k < 16; k++) {
      const r = 26 + k * 9.8;
      const pts = [];
      for (let a = -0.7; a <= Math.PI * 1.18; a += 0.19) {
        pts.push([
          745 + Math.cos(a) * r * 1.65,
          176 + Math.sin(a) * r * 0.58 + Math.sin(a * 2) * 8,
        ]);
      }
      drawDryPastelRibbon(ctx, pts, {
        color: k % 3 === 0 ? '#f5ca48' : k % 2 === 0 ? '#e44c20' : '#9c1a14',
        width: 6.4,
        alpha: 0.78,
        waviness: 1.5,
        phase: k * 0.8,
        bristles: 3,
        dryness: 0.28,
      });
    }

    // Munch's authentic 1893 scratched pencil inscription in the upper-left red cloud!
    drawMunchMadmanPencilEasterEgg(ctx, rng);

    // 5. Swirling Abyssal Oslo Fjord, Island Cove & Two Expressive Boats
    const vortexCx = 588;
    const vortexCy = 486;
    for (let ring = 0; ring < 42; ring++) {
      const rx = 32 + ring * 9.4;
      const ry = 15 + ring * 4.3;
      const pts = [];
      const a0 = -0.45 + (rng() - 0.5) * 0.85;
      const span = 2.1 + rng() * 2.7;
      for (let a = a0; a <= a0 + span; a += 0.16) {
        const pinch = 1 + 0.24 * Math.sin(2 * a + 0.7);
        const px = vortexCx + Math.cos(a) * rx * pinch + Math.sin(a * 3) * 10;
        const py = vortexCy + Math.sin(a) * ry * pinch;
        if (py > 348 && py < 710) pts.push([px, py]);
      }
      let wCol = '#182b4c';
      if (ring < 6) {
        wCol = rng() < 0.5 ? '#3a5d7e' : '#213d64';
      } else if (ring >= 10 && ring <= 15) {
        wCol = rng() < 0.58 ? '#e0cb8f' : '#88ac94';
      } else if (ring >= 18 && ring <= 23 && rng() < 0.45) {
        wCol = rng() < 0.5 ? '#c63b21' : '#e88633';
      } else if (ring > 26) {
        wCol = rng() < 0.5 ? '#0f182c' : '#2f274a';
      } else {
        wCol = rng() < 0.4 ? '#29476b' : '#14233d';
      }

      drawDryPastelRibbon(ctx, pts, {
        color: wCol,
        width: 5.6 + rng() * 6.0,
        alpha: 0.82,
        waviness: 1.9,
        phase: ring * 0.9,
        bristles: 3,
        dryness: 0.22,
      });
    }

    // Brooding dark Ekeberg wooded hillside on the right (x = 720..1000, y = 305..640)
    for (let row = 0; row < 32; row++) {
      const tRow = row / 31;
      const x0 = lerp(895, 715, Math.sin(tRow * Math.PI * 0.85));
      const y0 = 308 + tRow * 330;
      const pts = [];
      for (let x = x0; x <= w + 20; x += 26) {
        const lift = Math.sin((x - x0) * 0.02 + row * 0.4) * 16 - (x - x0) * 0.14;
        pts.push([x, y0 + lift]);
      }
      const hillCol =
        row % 5 === 0 ? '#2c3e34' : row % 3 === 0 ? '#1a2636' : row % 2 === 0 ? '#131820' : '#3b2827';
      drawDryPastelRibbon(ctx, pts, {
        color: hillCol,
        width: 11 + rng() * 6.5,
        alpha: 0.88,
        waviness: 2.1,
        phase: row * 0.7,
        bristles: 3,
        dryness: 0.24,
        taper: false,
      });
    }

    // Two Expressive Munch Boats in the Fjord Basin (sculpted purely from casein/pastel gouges)
    const boats = [
      { x: 542, y: 454, s: 1.36 },
      { x: 662, y: 498, s: 1.16 },
    ];
    for (const b of boats) {
      for (let r = 0; r < 4; r++) {
        drawDryPastelRibbon(
          ctx,
          [
            [b.x - (16 - r * 3) * b.s, b.y + (6 + r * 4.2) * b.s],
            [b.x, b.y + (7 + r * 4.2) * b.s],
            [b.x + (17 - r * 2.5) * b.s, b.y + (6.5 + r * 4.2) * b.s],
          ],
          {
            color: r === 0 ? '#f4cf56' : r === 1 ? '#e85c23' : '#88ac94',
            width: 2.5 * b.s,
            alpha: 0.76 - r * 0.12,
            waviness: 0.9,
            bristles: 2,
            dryness: 0.28,
          }
        );
      }
      drawDryPastelRibbon(
        ctx,
        [
          [b.x - 19 * b.s, b.y - 2 * b.s],
          [b.x - 7 * b.s, b.y + 4.5 * b.s],
          [b.x + 8 * b.s, b.y + 4.5 * b.s],
          [b.x + 20 * b.s, b.y - 3 * b.s],
        ],
        { color: '#0c101c', width: 5.4 * b.s, alpha: 0.96, waviness: 0.7, bristles: 3, dryness: 0.15 }
      );
      drawDryPastelRibbon(
        ctx,
        [
          [b.x - 1 * b.s, b.y + 1 * b.s],
          [b.x - 2 * b.s, b.y - 13 * b.s],
          [b.x + 1.5 * b.s, b.y - 27 * b.s],
        ],
        { color: '#efe0a6', width: 2.6 * b.s, alpha: 0.9, waviness: 0.6, bristles: 2, dryness: 0.26, taper: false }
      );
      drawDryPastelRibbon(
        ctx,
        [
          [b.x + 1 * b.s, b.y - 24 * b.s],
          [b.x + 9 * b.s, b.y - 13 * b.s],
          [b.x + 2 * b.s, b.y - 5 * b.s],
        ],
        { color: '#e68b46', width: 2.8 * b.s, alpha: 0.76, waviness: 0.8, bristles: 2, dryness: 0.28 }
      );
    }

    // Swirling Dark Cliff / Abyssal Shore below the Lower-Left Bridge Edge
    for (let k = 0; k < 18; k++) {
      const yStart = 832 + k * 10.5;
      const pts = [];
      for (let x = -20; x <= 420; x += 24) {
        pts.push([x, yStart + Math.sin(x * 0.018 + k * 0.5) * 18 + x * 0.42]);
      }
      drawDryPastelRibbon(ctx, pts, {
        color: k % 4 === 0 ? '#502d21' : k % 3 === 0 ? '#1d223a' : '#12111d',
        width: 12,
        alpha: 0.9,
        waviness: 2.3,
        bristles: 3,
        dryness: 0.22,
        taper: false,
      });
    }

    // 6. Scraped Casein & Dry-Pastel Wooden Bridge Deck (leaving raw Papp wood-fiber gaps!)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, bridgeRayY(0, INNER_DECK_Y0));
    ctx.lineTo(w, bridgeRayY(w, INNER_DECK_Y0));
    ctx.lineTo(w, bridgeRayY(w, OUTER_DECK_Y0));
    ctx.lineTo(0, bridgeRayY(0, OUTER_DECK_Y0));
    ctx.closePath();
    ctx.clip();

    // Semi-transparent casein ground so raw cardboard tooth breathes underneath
    ctx.fillStyle = 'rgba(62, 37, 25, 0.72)';
    ctx.fillRect(0, 480, w, 540);

    // 210 scraped multi-bristle casein & dry-pastel plank strokes (deeper umber/Prussian bed near y=680 so bike pops!)
    const plankColors = [
      '#6d3e21', '#8e5a2c', '#ad7b3d', '#4e2b1b', '#2e1b17',
      '#352436', '#944d21', '#744825', '#b58d58', '#1f1416',
    ];
    for (let i = 0; i < 210; i++) {
      const yZero = INNER_DECK_Y0 + 2 + rng() * (OUTER_DECK_Y0 - INNER_DECK_Y0 - 4);
      const x0 = rng() < 0.4 ? -12 : rng() * 640;
      const x1 = Math.min(w + 20, x0 + 230 + rng() * 640);
      const pts = [];
      for (let x = x0; x <= x1; x += 34) {
        pts.push([x, bridgeRayY(x, yZero)]);
      }
      drawDryPastelRibbon(ctx, pts, {
        color: plankColors[Math.floor(rng() * plankColors.length)],
        width: 5.5 + rng() * 9.5,
        alpha: 0.72 + rng() * 0.22,
        waviness: 1.4,
        freq: 0.06,
        phase: rng() * 6.28,
        bristles: 3,
        dryness: 0.34,
        crumbs: i % 5 === 0,
        taper: true,
      });
    }

    // Scraped dark perspective plank seams fanning out from VP
    for (let yZero = INNER_DECK_Y0 + 18; yZero <= OUTER_DECK_Y0 - 8; yZero += 23) {
      const seamPts = [];
      for (let x = 0; x <= w; x += 48) {
        seamPts.push([x, bridgeRayY(x, yZero)]);
      }
      drawDryPastelRibbon(ctx, seamPts, {
        color: '#181014',
        width: 2.8,
        alpha: 0.78,
        waviness: 0.95,
        phase: yZero * 0.1,
        bristles: 2,
        dryness: 0.3,
        taper: false,
      });
    }

    // Deep Prussian-indigo & raw-umber rubbed pastel bed along y = 680 (anchors cross-frame road & maximizes sulfur bike contrast!)
    for (let k = -2; k <= 2; k++) {
      const pts = [];
      for (let x = 0; x <= w; x += 30) {
        pts.push([x, ROAD_EDGE_Y + k * 4.2 + Math.sin(x * 0.024 + k) * 1.5]);
      }
      drawDryPastelRibbon(ctx, pts, {
        color: Math.abs(k) <= 1 ? '#1c1829' : '#5e3b24',
        width: k === 0 ? 8.5 : 5.0,
        alpha: Math.abs(k) <= 1 ? 0.48 : 0.32,
        waviness: 1.1,
        phase: k * 1.7,
        bristles: 3,
        dryness: 0.28,
        taper: false,
      });
    }
    ctx.restore();

    // Outer foreground heavy bridge curb timber along OUTER_DECK_Y0 = 838
    drawDryPastelRibbon(
      ctx,
      [
        [0, bridgeRayY(0, OUTER_DECK_Y0 - 2)],
        [190, bridgeRayY(190, OUTER_DECK_Y0 - 2)],
        [380, bridgeRayY(380, OUTER_DECK_Y0 - 2)],
      ],
      { color: '#211213', width: 11, alpha: 0.94, waviness: 1.4, bristles: 3, dryness: 0.2, taper: false }
    );
    drawDryPastelRibbon(
      ctx,
      [
        [0, bridgeRayY(0, OUTER_DECK_Y0 - 8)],
        [190, bridgeRayY(190, OUTER_DECK_Y0 - 8)],
        [380, bridgeRayY(380, OUTER_DECK_Y0 - 8)],
      ],
      { color: '#b87c3c', width: 4.8, alpha: 0.78, waviness: 1.2, bristles: 3, dryness: 0.36, crumbs: true, taper: false }
    );

    // 7. Scraped Casein & Dry-Chalk Railing Posts + Three Diagonal Railing Beams (NO uniform marker tubes!)
    const postXs = [28, 95, 172, 264, 372, 502, 658, 845, 992];
    for (let pIdx = 0; pIdx < postXs.length; pIdx++) {
      const px = postXs[pIdx];
      const yBot = bridgeRayY(px, INNER_DECK_Y0 + 3);
      const yTop = bridgeRayY(px, 405);
      const pw = lerp(4.5, 11.2, px / w);
      drawDryPastelRibbon(
        ctx,
        [
          [px, yBot + 4],
          [px - 1.2, lerp(yBot, yTop, 0.35)],
          [px + 0.8, lerp(yBot, yTop, 0.7)],
          [px + 0.3, yTop],
        ],
        { color: '#221417', width: pw, alpha: 0.92, waviness: 1.0, phase: pIdx, bristles: 3, dryness: 0.24, taper: false }
      );
      drawDryPastelRibbon(
        ctx,
        [
          [px - pw * 0.26, yBot - 2],
          [px - pw * 0.22, (yBot + yTop) * 0.5],
          [px - pw * 0.28, yTop + 3],
        ],
        { color: '#ad652e', width: pw * 0.42, alpha: 0.68, waviness: 0.8, phase: pIdx + 2, bristles: 2, dryness: 0.38, taper: false }
      );
    }

    const railDefs = [
      { y0: 410, w0: 8.5, w1: 19.5, main: '#dc983e', warm: '#c45b24', hi: '#f7d56a', sh: '#3f1e17' },
      { y0: 440, w0: 7.0, w1: 15.0, main: '#c55e26', warm: '#9e431f', hi: '#eba64b', sh: '#331916' },
      { y0: 468, w0: 6.5, w1: 13.8, main: '#924522', warm: '#6e311b', hi: '#cf8339', sh: '#261314' },
    ];
    for (let rIdx = 0; rIdx < railDefs.length; rIdx++) {
      const r = railDefs[rIdx];
      // Segment each diagonal beam into overlapping foreshortened scraped strokes so width grows naturally rightwards!
      const chunks = 7;
      for (let c = 0; c < chunks; c++) {
        const u0 = c / chunks;
        const u1 = Math.min(1.02, (c + 1.18) / chunks);
        const xA = -12 + u0 * (w + 26);
        const xB = -12 + u1 * (w + 26);
        const xm = (xA + xB) * 0.5;
        const localW = lerp(r.w0, r.w1, (u0 + u1) * 0.5);

        const ptsSh = [
          [xA, bridgeRayY(xA, r.y0) + localW * 0.28],
          [xm, bridgeRayY(xm, r.y0) + localW * 0.3],
          [xB, bridgeRayY(xB, r.y0) + localW * 0.28],
        ];
        const ptsMain = [
          [xA, bridgeRayY(xA, r.y0)],
          [xm, bridgeRayY(xm, r.y0) + (rng() - 0.5) * 1.4],
          [xB, bridgeRayY(xB, r.y0)],
        ];
        const ptsHi = [
          [xA, bridgeRayY(xA, r.y0) - localW * 0.24],
          [xm, bridgeRayY(xm, r.y0) - localW * 0.26],
          [xB, bridgeRayY(xB, r.y0) - localW * 0.24],
        ];

        drawDryPastelRibbon(ctx, ptsSh, {
          color: r.sh,
          width: localW * 0.78,
          alpha: 0.88,
          waviness: 1.0,
          phase: c + rIdx * 3,
          bristles: 3,
          dryness: 0.25,
          taper: false,
        });
        drawDryPastelRibbon(ctx, ptsMain, {
          color: c % 2 === 0 ? r.main : r.warm,
          width: localW * 0.92,
          alpha: 0.86,
          waviness: 1.2,
          phase: c * 1.7 + rIdx,
          bristles: 4,
          dryness: 0.34,
          crumbs: true,
          taper: true,
        });
        drawDryPastelRibbon(ctx, ptsHi, {
          color: r.hi,
          width: localW * 0.42,
          alpha: 0.84,
          waviness: 0.95,
          phase: c * 2.3 + rIdx,
          bristles: 2,
          dryness: 0.42,
          crumbs: true,
          taper: true,
        });
      }
    }

    // 8. Two Distant Faceless Top-Hat Figures Painted Purely from Vertical Casein/Pastel Smears (NO fillRect/ellipse!)
    const distantFigs = [
      { x: 82, footY: 522, h: 98, lean: 0.04 },
      { x: 132, footY: 536, h: 110, lean: -0.03 },
    ];
    for (let fIdx = 0; fIdx < distantFigs.length; fIdx++) {
      const f = distantFigs[fIdx];
      // Cast oblique shadow across planks
      drawDryPastelRibbon(
        ctx,
        [
          [f.x - 2, f.footY],
          [f.x + 22, f.footY + 15],
          [f.x + 42, f.footY + 28],
        ],
        { color: '#1b1324', width: 11, alpha: 0.56, waviness: 1.3, bristles: 3, dryness: 0.32 }
      );

      const shoulderY = f.footY - f.h * 0.67;
      const headY = f.footY - f.h * 0.82;
      const hx = f.x + f.lean * 42;

      // Legs as vertical casein strokes
      for (const legSide of [-4.2, 4.2]) {
        drawDryPastelRibbon(
          ctx,
          [
            [f.x + legSide, f.footY - f.h * 0.38],
            [f.x + legSide * 1.08, f.footY + (legSide > 0 ? 2 : 0)],
          ],
          { color: '#101320', width: 5.4, alpha: 0.94, waviness: 0.8, bristles: 2, dryness: 0.2, taper: false }
        );
      }

      // Overcoat torso built from 3 overlapping vertical dark Prussian/charcoal strokes
      for (const coatLane of [-7.5, 0, 7.5]) {
        drawDryPastelRibbon(
          ctx,
          [
            [hx + coatLane * 1.25, shoulderY],
            [hx + coatLane * 1.15, f.footY - f.h * 0.46],
            [f.x + coatLane * 0.9, f.footY - f.h * 0.25],
          ],
          {
            color: coatLane === -7.5 ? '#1b243b' : '#0e121e',
            width: 9.8,
            alpha: 0.94,
            waviness: 1.0,
            phase: fIdx + coatLane,
            bristles: 3,
            dryness: 0.22,
            taper: false,
          }
        );
      }

      // Faceless pale ochre-sallow smear head (painterly vertical dab, NO geometric ellipse)
      drawDryPastelRibbon(
        ctx,
        [
          [hx - 1, headY - 7],
          [hx + 0.5, headY + 1],
          [hx - 0.5, headY + 8],
        ],
        { color: '#d7bc8a', width: 11.5, alpha: 0.9, waviness: 0.8, bristles: 3, dryness: 0.28 }
      );

      // Top-hat brim & crown painted with dry charcoal strokes (NO fillRect!)
      drawDryPastelRibbon(
        ctx,
        [
          [hx - 13, headY - 5.5],
          [hx, headY - 7],
          [hx + 13, headY - 6.2],
        ],
        { color: '#0b0d15', width: 5.2, alpha: 0.96, waviness: 0.7, bristles: 2, dryness: 0.18, taper: true }
      );
      for (const crownOff of [-3.5, 0, 3.5]) {
        drawDryPastelRibbon(
          ctx,
          [
            [hx + crownOff, headY - 6],
            [hx + crownOff * 1.05, headY - 21],
          ],
          { color: '#0c0e17', width: 6.8, alpha: 0.95, waviness: 0.6, bristles: 2, dryness: 0.2, taper: false }
        );
      }
    }
  });
}

/**
 * Evaluates a cubic Bezier point for the Screamer's boneless S-curved Munch spine.
 */
function cubicPt(p0, p1, p2, p3, u) {
  const iu = 1 - u;
  return [
    iu * iu * iu * p0[0] + 3 * iu * iu * u * p1[0] + 3 * iu * u * u * p2[0] + u * u * u * p3[0],
    iu * iu * iu * p0[1] + 3 * iu * iu * u * p1[1] + 3 * iu * u * u * p2[1] + u * u * u * p3[1],
  ];
}

/**
 * Computes the Screamer's posture & open-mouth acoustic origin so both the dynamic
 * field-warped sky/fjord bands and the Screamer figure share the exact shock epicenter!
 */
function computeScreamerState(localT, boilT) {
  const shockRise = smootherstep(1.72, 2.22, localT);
  const shockHold = 1 - 0.22 * smoothstep(4.35, 5.75, localT);
  const shock = shockRise * shockHold;

  const tremble = shock * Math.sin(boilT * 24) * 3.2;
  const footX = 374 - shock * 18;
  const footY = 594 + shock * 4;

  const pFoot = [footX, footY];
  const pHipCtrl = [footX + 26 + shock * 18 + Math.sin(boilT * 4) * 3, footY - 68];
  const pChestCtrl = [footX - 18 - shock * 48 - tremble, footY - 144 + shock * 12];
  const pNeckTop = [footX - 8 - shock * 42 + tremble * 0.8, footY - 196 + shock * 16];

  const [chestX, chestY] = cubicPt(pFoot, pHipCtrl, pChestCtrl, pNeckTop, 0.78);
  const headX = pNeckTop[0] - shock * 6;
  const headY = pNeckTop[1] - 18;
  const mouthWorldX = headX - Math.sin(-0.28 * shock) * 18;
  const mouthWorldY = headY + Math.cos(-0.28 * shock) * 18;

  return {
    shock,
    tremble,
    footX,
    footY,
    pFoot,
    pHipCtrl,
    pChestCtrl,
    pNeckTop,
    chestX,
    chestY,
    headX,
    headY,
    mouthWorldX,
    mouthWorldY,
  };
}

/**
 * Renders dynamic field-warping sky & fjord pastel ribbons!
 * In Bar 2 (`localT 2..4s`), instead of artificial floating neon rings, the blood-red sky clouds
 * and dark Oslo Fjord currents themselves heave, compress, and convulse around the Screamer's shriek!
 */
function drawFieldWarpingSkyAndFjord(ctx, st, boilT) {
  const { shock, mouthWorldX, mouthWorldY } = st;

  const liveSkyBands = [
    { y: 26, col: '#9e1913', w: 12.5, ph: 0.2 },
    { y: 54, col: '#da3b1d', w: 11.0, ph: 0.9 },
    { y: 86, col: '#f27c28', w: 10.0, ph: 1.6 },
    { y: 118, col: '#f6c844', w: 11.5, ph: 2.3 },
    { y: 152, col: '#cb2a1a', w: 12.0, ph: 3.0 },
    { y: 186, col: '#eb6222', w: 10.5, ph: 3.7 },
    { y: 218, col: '#f7dc64', w: 11.5, ph: 4.4 },
    { y: 252, col: '#b88f5e', w: 7.5, ph: 5.0 }, // raw cardboard gap breathing with the sky!
    { y: 282, col: '#df4a20', w: 11.0, ph: 5.6 },
    { y: 314, col: '#f59832', w: 10.5, ph: 6.3 },
    { y: 344, col: '#f8e16c', w: 9.8, ph: 7.0 },
    { y: 372, col: '#523452', w: 9.0, ph: 7.7 },
  ];

  for (let i = 0; i < liveSkyBands.length; i++) {
    const b = liveSkyBands[i];
    const pts = [];
    for (let x = -24; x <= PANEL_SIZE + 24; x += 28) {
      const drift = Math.sin(x * 0.011 - boilT * 2.2 + b.ph) * 4.2;
      const rawY = skyWaveY(x, b.y, b.ph) + drift;
      pts.push(warpFieldAroundScream(x, rawY, mouthWorldX, mouthWorldY, shock, boilT));
    }
    drawDryPastelRibbon(ctx, pts, {
      color: b.col,
      width: b.w + shock * 4.8,
      alpha: (b.col === '#b88f5e' ? 0.36 : 0.48) + shock * 0.32,
      waviness: 2.0 + shock * 2.1,
      freq: 0.08,
      phase: boilT * 2.6 + i * 1.3,
      bristles: 3,
      dryness: 0.34,
      crumbs: shock > 0.35 && i % 2 === 0,
      taper: false,
    });
  }

  // Sympathetic convulsing fjord & harbor reflection strokes warping outward from the bridge!
  const fjordBands = [
    { x0: 260, x1: 720, y: 392, col: '#f4cc56', w: 5.5 },
    { x0: 235, x1: 755, y: 418, col: '#254269', w: 8.0 },
    { x0: 295, x1: 740, y: 444, col: '#df5624', w: 5.8 },
    { x0: 335, x1: 765, y: 472, col: '#dfd094', w: 6.5 },
    { x0: 365, x1: 785, y: 502, col: '#88b29a', w: 6.2 },
    { x0: 390, x1: 790, y: 534, col: '#14233f', w: 8.5 },
  ];
  for (let k = 0; k < fjordBands.length; k++) {
    const fb = fjordBands[k];
    const pts = [];
    for (let x = fb.x0; x <= fb.x1; x += 26) {
      const wy =
        fb.y +
        Math.sin(x * 0.02 + k * 1.2 + boilT * 2.0) * 9.5 +
        Math.cos(x * 0.045 - k) * 4.0;
      pts.push(warpFieldAroundScream(x, wy, mouthWorldX, mouthWorldY, shock * 0.88, boilT));
    }
    drawDryPastelRibbon(ctx, pts, {
      color: fb.col,
      width: fb.w + shock * 3.0,
      alpha: 0.52 + shock * 0.28,
      waviness: 1.8 + shock * 1.4,
      phase: boilT * 3.0 + k * 1.7,
      bristles: 2,
      dryness: 0.28,
      taper: true,
    });
  }
}

/**
 * Draws Munch's Screamer sculpted strictly from rubbed casein washes & dry pastel gouges:
 * - Boneless kelp-like S-curved dark overcoat melting into bridge shadow
 * - Asymmetrical cadaverous death-mask skull with deeply sunken bruised orbital smears (ZERO crisp cartoon ovals!)
 * - Cavernous dry-charcoal "O" scream mouth & skeletal pastel hands clamped onto both cheeks!
 */
function drawScreamerFigure(ctx, st, pelicanLocalX, boilT) {
  const {
    shock,
    footX,
    footY,
    pFoot,
    pHipCtrl,
    pChestCtrl,
    pNeckTop,
    chestX,
    chestY,
    headX,
    headY,
  } = st;

  // 1. Rubbed Prussian-charcoal shadow pooling along the plank grain beneath robe hem
  drawDryPastelRibbon(
    ctx,
    [
      [footX - 20, footY - 3],
      [footX + 20, footY + 13],
      [footX + 68, footY + 42],
      [footX + 108, footY + 62],
    ],
    { color: '#141020', width: 24, alpha: 0.64, waviness: 2.6, phase: boilT * 2, bristles: 4, dryness: 0.32 }
  );

  // 2. Serpentine S-Curved Munch Robe built from 9 writhing casein/charcoal bristle strands (no flat cutout!)
  const robeCols = [
    '#0d101d', '#1b2642', '#111524', '#3d283b', '#0c0f1b',
    '#253554', '#131929', '#564134', '#0e1220',
  ];
  for (let sIdx = -4; sIdx <= 4; sIdx++) {
    const lane = sIdx / 4.0;
    const strandPts = [];
    for (let i = 0; i <= 11; i++) {
      const u = i / 11;
      const [sx, sy] = cubicPt(pFoot, pHipCtrl, pChestCtrl, pNeckTop, u);
      const halfW =
        (6.5 + 21 * Math.sin(Math.PI * Math.pow(u, 0.68)) + 8.5 * u) *
        (1 + 0.08 * Math.sin(u * 8 + boilT * 4.5));
      strandPts.push([sx + lane * halfW, sy + (1 - u) * Math.abs(sIdx) * 2.2]);
    }
    drawDryPastelRibbon(ctx, strandPts, {
      color: robeCols[sIdx + 4],
      width: Math.abs(sIdx) === 4 ? 6.2 : 10.5,
      alpha: 0.94,
      waviness: 2.1,
      phase: sIdx * 1.3 + boilT * 3.2,
      bristles: 3,
      dryness: Math.abs(sIdx) >= 3 ? 0.34 : 0.16,
      taper: true,
    });
  }

  // 3. Cadaverous Rubbed-Casein Death-Mask Skull (ZERO cartoon white ovals or geometric circles!)
  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(-0.28 * shock + Math.sin(boilT * 16) * 0.035 * shock);

  const jawDrop = 7 + shock * 18.5;

  // Rubbed casein skull mass built from overlapping vertical/curved painterly strokes
  const skullLanes = [
    { xOff: -15, col: '#838f74', w: 13 },
    { xOff: -7, col: '#c6cba0', w: 15 },
    { xOff: 1, col: '#e5d398', w: 16 },
    { xOff: 9, col: '#b8c098', w: 14 },
    { xOff: 16, col: '#6e7664', w: 12 },
  ];
  for (let k = 0; k < skullLanes.length; k++) {
    const sl = skullLanes[k];
    const pinch = 1 - Math.abs(sl.xOff) / 26;
    drawDryPastelRibbon(
      ctx,
      [
        [sl.xOff * 0.72, -30 + (1 - pinch) * 7],
        [sl.xOff * 1.16, -9],
        [sl.xOff * 0.78, 9],
        [sl.xOff * 0.45, 26 + jawDrop * pinch],
      ],
      {
        color: sl.col,
        width: sl.w,
        alpha: 0.92,
        waviness: 1.5,
        phase: k * 1.4 + boilT * 2,
        bristles: 3,
        dryness: 0.24,
        taper: true,
      }
    );
  }

  // Gaunt sunken cheek & temple casein contour gouges
  drawDryPastelRibbon(
    ctx,
    [
      [-20, -16],
      [-22, -3],
      [-14, 11],
      [-8, 25 + jawDrop],
      [0, 29 + jawDrop],
      [9, 25 + jawDrop],
      [15, 11],
      [22, -3],
      [19, -17],
    ],
    { color: '#484d41', width: 4.4, alpha: 0.88, waviness: 1.5, phase: boilT * 2, bristles: 3, dryness: 0.34 }
  );
  drawDryPastelRibbon(
    ctx,
    [
      [-16, -26],
      [0, -32],
      [16, -25],
    ],
    { color: '#f3e1a4', width: 5.2, alpha: 0.88, waviness: 1.2, bristles: 2, dryness: 0.36, crumbs: true }
  );

  // Sunken, Hollow Rubbed-Casein Eye Sockets (Munch's ghostly death-mask hollows, tracking pelican!)
  const lookDir = clamp((pelicanLocalX - footX) / 200, -0.7, 1.0);
  for (const side of [-1, 1]) {
    const ex = side * 9.5 + lookDir * 1.5;
    const ey = -8 + side * 0.6;
    const sockH = 5.5 + shock * 5.2;

    // Bruised plum-olive sunken orbital hollow smear
    drawDryPastelRibbon(
      ctx,
      [
        [ex - 7.5, ey - 1.5],
        [ex, ey - sockH * 0.45],
        [ex + 7.5, ey + 0.5],
        [ex, ey + sockH * 0.55],
        [ex - 6.5, ey - 0.5],
      ],
      { color: '#3b3346', width: 6.2, alpha: 0.86, waviness: 1.1, phase: side, bristles: 3, dryness: 0.28 }
    );

    // Pale chalky-parchment haunted socket interior smudge (broken & irregular, NOT a cartoon white oval!)
    drawDryPastelRibbon(
      ctx,
      [
        [ex - 4.8, ey - sockH * 0.22],
        [ex + 0.5, ey - sockH * 0.32],
        [ex + 4.8, ey + sockH * 0.12],
        [ex - 2.2, ey + sockH * 0.28],
      ],
      { color: '#e8dec0', width: 4.8 + shock * 2.2, alpha: 0.78, waviness: 0.9, bristles: 2, dryness: 0.35 }
    );

    // Trembling dark pinprick gaze point tracking the speeding pelican
    const px = ex + lookDir * 2.8;
    drawDryPastelRibbon(
      ctx,
      [
        [px - 1.8, ey - 0.6],
        [px + 1.8, ey + 1.1],
      ],
      { color: '#120f19', width: 3.8, alpha: 0.94, waviness: 0.5, bristles: 2, dryness: 0.15, taper: false }
    );

    // Arched anguished brow charcoal slash
    drawDryPastelRibbon(
      ctx,
      [
        [ex - 8.5, ey - sockH - 2 + side * 1.6],
        [ex, ey - sockH - 5.5 - shock * 4.2],
        [ex + 8.5, ey - sockH - 2 - side * 1.6],
      ],
      { color: '#271e26', width: 3.1, alpha: 0.88, waviness: 0.9, bristles: 2, dryness: 0.34 }
    );
  }

  // Two vertical charcoal nostril slashes
  drawDryPastelRibbon(ctx, [[-2.5, 1.2], [-2.0, 5.2]], {
    color: '#342928', width: 2.3, alpha: 0.82, waviness: 0.4, bristles: 1, dryness: 0.28, taper: false,
  });
  drawDryPastelRibbon(ctx, [[2.5, 1.2], [2.0, 5.2]], {
    color: '#342928', width: 2.3, alpha: 0.82, waviness: 0.4, bristles: 1, dryness: 0.28, taper: false,
  });

  // Cavernous Asymmetric Dry-Charcoal & Burnt-Crimson "O" Scream Mouth!
  const mRx = lerp(4.2, 9.6, shock);
  const mRy = lerp(2.8, 16.5, shock);
  const mY = lerp(14, 21.5, shock);
  const mouthRing = [];
  for (let k = 0; k <= 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const asym = 1 + 0.12 * Math.sin(a * 3 + 0.6);
    mouthRing.push([Math.cos(a) * mRx * asym, mY + Math.sin(a) * mRy * asym]);
  }
  // Fill dark hollow throat & rim with dry crimson-umber pastel
  drawDryPastelRibbon(
    ctx,
    [
      [0, mY - mRy * 0.72],
      [-0.8, mY],
      [0.6, mY + mRy * 0.72],
    ],
    { color: '#110c15', width: mRx * 1.95, alpha: 0.96, waviness: 0.8, bristles: 3, dryness: 0.12, taper: true }
  );
  drawDryPastelRibbon(ctx, mouthRing, {
    color: '#7e2920',
    width: 3.4,
    alpha: 0.88,
    waviness: 1.0,
    phase: boilT * 3,
    bristles: 2,
    dryness: 0.32,
    taper: false,
  });

  ctx.restore();

  // 4. Curved Sleeves & Long Skeletal Pastel Hands Clamped Tightly onto Both Cheeks!
  const rot = -0.28 * shock;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  const cheekL = [headX + (-20) * cosR - 4 * sinR, headY + (-20) * sinR + 4 * cosR];
  const cheekR = [headX + 20 * cosR - 4 * sinR, headY + 20 * sinR + 4 * cosR];

  const lHandX = lerp(chestX - 20, cheekL[0], shock);
  const lHandY = lerp(chestY + 18, cheekL[1], shock);
  const rHandX = lerp(chestX + 22, cheekR[0], shock);
  const rHandY = lerp(chestY + 14, cheekR[1], shock);

  drawDryPastelRibbon(
    ctx,
    [
      [chestX - 20, chestY + 2],
      [chestX - 42 - shock * 12, chestY + 20 - shock * 18],
      [lHandX - 2, lHandY + 22],
    ],
    { color: '#121728', width: 12.0, alpha: 0.95, waviness: 1.8, bristles: 3, dryness: 0.22, taper: false }
  );
  drawDryPastelRibbon(
    ctx,
    [
      [lHandX - 4, lHandY + 25],
      [lHandX - 1.5, lHandY + 3],
      [lHandX + 4.5, lHandY - 19 * shock],
    ],
    { color: '#e7d59b', width: 7.6, alpha: 0.94, waviness: 1.2, bristles: 3, dryness: 0.3 }
  );

  drawDryPastelRibbon(
    ctx,
    [
      [chestX + 20, chestY + 2],
      [chestX + 40 + shock * 10, chestY + 22 - shock * 16],
      [rHandX + 2, rHandY + 22],
    ],
    { color: '#121728', width: 12.0, alpha: 0.95, waviness: 1.8, bristles: 3, dryness: 0.22, taper: false }
  );
  drawDryPastelRibbon(
    ctx,
    [
      [rHandX + 4, rHandY + 25],
      [rHandX + 1.5, rHandY + 3],
      [rHandX - 4.5, rHandY - 19 * shock],
    ],
    { color: '#e7d59b', width: 7.6, alpha: 0.94, waviness: 1.2, bristles: 3, dryness: 0.3 }
  );
}

/**
 * Draws the Expressionist Pastel/Casein Pelican & Bicycle:
 * - NO capsule drop-shadow: uses raked Prussian-blue & raw-umber dry-chalk wood-seam shadows!
 * - NO mechanical steel tubes or `ctx.arc` round eye: reconstructed from broken, intertwining
 *   Prussian-blue, burnt-vermilion & celadon pastel short-arcs topped with DENSE Sulfur-Yellow
 *   (#fcef68) + Zinc-White (#fffbe6) highlight ridges (#85 Director Contrast Guard!)
 * - Deadpan calm pelican eye painted purely with dry orbital smears & a wet zinc-white dab!
 */
function drawMunchPelicanAndBike(ctx, rig, boilT) {
  const s = rig.root.scale;
  const t = boilT;

  ctx.save();

  // 0. Raked Dry-Chalk Wood-Seam Shadows along the perspective plank grain (ZERO capsule drop-shadow!)
  const shadowSpanX0 = rig.rearWheel.x - 62 * s;
  const shadowSpanX1 = rig.frontWheel.x + 64 * s;
  for (let row = -3; row <= 3; row++) {
    const sy0 = rig.root.y + row * 4.2 * s;
    const slopeShift = (shadowSpanX1 - shadowSpanX0) * 0.085;
    drawDryPastelRibbon(
      ctx,
      [
        [shadowSpanX0 + Math.abs(row) * 8 * s, sy0 - slopeShift * 0.35],
        [(shadowSpanX0 + shadowSpanX1) * 0.5, sy0 + 2 * s],
        [shadowSpanX1 - Math.abs(row) * 6 * s, sy0 + slopeShift * 0.65],
      ],
      {
        color: row % 2 === 0 ? '#0c1226' : '#26181f',
        width: (6.8 - Math.abs(row) * 0.8) * s,
        alpha: 0.68 - Math.abs(row) * 0.08,
        waviness: 1.8 * s,
        phase: t * 3 + row,
        bristles: 3,
        dryness: 0.38,
        crumbs: true,
        taper: true,
      }
    );
  }

  // Expressive sulfur-yellow & celadon dry-pastel slipstream strokes trailing behind rear wheel & tail
  for (let wIdx = 0; wIdx < 4; wIdx++) {
    const wy = rig.bodyCenter.y - 20 * s + wIdx * 23 * s;
    drawDryPastelRibbon(
      ctx,
      [
        [rig.tailTip.x - 8 * s, wy],
        [rig.tailTip.x - 56 * s, wy + Math.sin(t * 8 + wIdx) * 8 * s],
        [rig.tailTip.x - 114 * s, wy - Math.cos(t * 6 + wIdx) * 10 * s],
      ],
      {
        color: wIdx % 2 === 0 ? '#fcef68' : '#a8dfc4',
        width: 4.5 * s,
        alpha: 0.72,
        waviness: 2.4 * s,
        phase: t * 7 + wIdx,
        bristles: 2,
        dryness: 0.42,
        crumbs: true,
      }
    );
  }

  // Helper: Broken Interlocking Pastel Arc Wheel with Dense Sulfur-Yellow + Zinc-White Bright Ridge (#85 Guard!)
  const drawPastelWheel = (wheel) => {
    const numSpokes = 10;
    for (let i = 0; i < numSpokes; i++) {
      const a = wheel.angle + (i * Math.PI * 2) / numSpokes;
      const bow = Math.sin(i * 1.9 + t * 5) * 0.11;
      const mx = wheel.x + Math.cos(a + bow) * wheel.r * 0.52;
      const my = wheel.y + Math.sin(a + bow) * wheel.r * 0.52;
      const ex = wheel.x + Math.cos(a) * (wheel.r - 3.5 * s);
      const ey = wheel.y + Math.sin(a) * (wheel.r - 3.5 * s);

      // Prussian-blue shadow spoke
      drawDryPastelRibbon(
        ctx,
        [
          [wheel.x + 1 * s, wheel.y + 1.5 * s],
          [mx + 1.5 * s, my + 1.5 * s],
          [ex, ey],
        ],
        { color: '#0b1126', width: 3.6 * s, alpha: 0.88, waviness: 1.2 * s, phase: i, bristles: 2, dryness: 0.25 }
      );
      // Bright sulfur-yellow & zinc-white chalk spoke highlight
      drawDryPastelRibbon(
        ctx,
        [
          [wheel.x, wheel.y],
          [mx, my],
          [ex, ey],
        ],
        {
          color: i % 2 === 0 ? '#fcef68' : '#fffbe6',
          width: 2.5 * s,
          alpha: 0.95,
          waviness: 1.3 * s,
          phase: i + t * 4,
          bristles: 2,
          dryness: 0.34,
        }
      );
    }

    // Break wheel circumference into 5 overlapping eccentric hand-drawn pastel short-arcs!
    const arcCount = 5;
    for (let seg = 0; seg < arcCount; seg++) {
      const aStart = (seg / arcCount) * Math.PI * 2 - 0.18 + wheel.angle * 0.15;
      const aEnd = ((seg + 1) / arcCount) * Math.PI * 2 + 0.22 + wheel.angle * 0.15;
      const ecc = Math.sin(seg * 2.3 + t * 3.5) * 2.4 * s;

      const shadowArc = [];
      const warmArc = [];
      const brightSulfurArc = [];
      const zincCrestArc = [];

      for (let k = 0; k <= 7; k++) {
        const a = lerp(aStart, aEnd, k / 7);
        const dr = Math.sin(a * 3 + t * 4 + seg) * 2.1 * s + ecc * Math.cos(a);
        const rx = Math.cos(a);
        const ry = Math.sin(a);
        shadowArc.push([
          wheel.x + rx * (wheel.r + 2.2 * s + dr),
          wheel.y + ry * (wheel.r + 2.8 * s + dr),
        ]);
        warmArc.push([
          wheel.x + rx * (wheel.r - 0.8 * s + dr),
          wheel.y + ry * (wheel.r - 0.8 * s + dr),
        ]);
        brightSulfurArc.push([
          wheel.x + rx * (wheel.r - 3.2 * s + dr * 0.8),
          wheel.y + ry * (wheel.r - 3.8 * s + dr * 0.8),
        ]);
        zincCrestArc.push([
          wheel.x + rx * (wheel.r - 4.2 * s + dr * 0.7),
          wheel.y + ry * (wheel.r - 5.0 * s + dr * 0.7),
        ]);
      }

      // 1. Deep Prussian-blue outer shadow tire gouge
      drawDryPastelRibbon(ctx, shadowArc, {
        color: '#0a1024',
        width: 8.2 * s,
        alpha: 0.96,
        waviness: 1.4 * s,
        phase: seg + t * 3,
        bristles: 3,
        dryness: 0.22,
      });
      // 2. Burnt-vermilion / Munch-celadon expressionist rim undertone
      drawDryPastelRibbon(ctx, warmArc, {
        color: seg % 2 === 0 ? '#df4b20' : '#6ec2a8',
        width: 5.0 * s,
        alpha: 0.88,
        waviness: 1.3 * s,
        phase: seg * 1.7 + t * 3,
        bristles: 2,
        dryness: 0.32,
      });
      // 3. Blazing Sulfur-Yellow pastel highlight ridge!
      drawDryPastelRibbon(ctx, brightSulfurArc, {
        color: '#fcef68',
        width: 4.8 * s,
        alpha: 0.96,
        waviness: 1.1 * s,
        phase: seg * 2.1 + t * 3,
        bristles: 3,
        dryness: 0.3,
        crumbs: true,
      });
      // 4. Dense Zinc-White top-lit chalk spine (strongest on upper wheel hemisphere!)
      if (Math.sin((aStart + aEnd) * 0.5) < 0.45) {
        drawDryPastelRibbon(ctx, zincCrestArc, {
          color: '#fffbe8',
          width: 2.8 * s,
          alpha: 0.94,
          waviness: 0.9 * s,
          phase: seg + 1.5,
          bristles: 2,
          dryness: 0.35,
          crumbs: true,
        });
      }
    }

    // Painterly pastel hub dab (NO ctx.arc circle!)
    drawDryPastelRibbon(
      ctx,
      [
        [wheel.x - 6 * s, wheel.y + 1 * s],
        [wheel.x, wheel.y - 2 * s],
        [wheel.x + 6 * s, wheel.y + 1 * s],
      ],
      { color: '#0b1126', width: 9.5 * s, alpha: 0.96, waviness: 0.8 * s, bristles: 3, dryness: 0.18 }
    );
    drawDryPastelRibbon(
      ctx,
      [
        [wheel.x - 4 * s, wheel.y - 0.5 * s],
        [wheel.x + 4 * s, wheel.y - 1.2 * s],
      ],
      { color: '#fffbe6', width: 5.6 * s, alpha: 0.96, waviness: 0.7 * s, bristles: 2, dryness: 0.25 }
    );
  };

  // Helper for crank arm + pedal gouge
  const drawMunchCrank = (pedalPt) => {
    drawDryPastelRibbon(
      ctx,
      [
        [rig.bb.x, rig.bb.y],
        [(rig.bb.x + pedalPt.x) * 0.5, (rig.bb.y + pedalPt.y) * 0.5],
        [pedalPt.x, pedalPt.y],
      ],
      { color: '#0b1124', width: 6.8 * s, alpha: 0.95, waviness: 1.0 * s, bristles: 2, dryness: 0.2, taper: false }
    );
    drawDryPastelRibbon(
      ctx,
      [
        [rig.bb.x, rig.bb.y - 1 * s],
        [pedalPt.x, pedalPt.y - 1 * s],
      ],
      { color: '#fff8d8', width: 3.2 * s, alpha: 0.94, waviness: 0.9 * s, bristles: 2, dryness: 0.3, taper: false }
    );
    drawDryPastelRibbon(
      ctx,
      [
        [pedalPt.x - 10 * s, pedalPt.y + 2.5 * s],
        [pedalPt.x + 10 * s, pedalPt.y + 2.5 * s],
      ],
      { color: '#fcef68', width: 4.6 * s, alpha: 0.96, waviness: 0.7 * s, bristles: 2, dryness: 0.28, taper: false }
    );
  };

  // 1. Far leg & far arm (behind bicycle frame) — Abstract Expressionist Dry-Pastel Naiwa
  drawMunchCrank(rig.leftPedal);
  drawAbstractExpressionistNaiwa(ctx, rig, 'back', t);

  // 2. Both wheels
  drawPastelWheel(rig.rearWheel);
  drawPastelWheel(rig.frontWheel);

  // 3. Hand-drawn pastel chainring & undulating chain (NO ctx.arc circle!)
  const ringPts = [];
  for (let k = 0; k <= 10; k++) {
    const a = (k / 10) * Math.PI * 2 + rig.pedalAngle * 0.5;
    ringPts.push([
      rig.bb.x + Math.cos(a) * 12.5 * s,
      rig.bb.y + Math.sin(a) * 12.5 * s,
    ]);
  }
  drawDryPastelRibbon(ctx, ringPts, {
    color: '#0c1226', width: 5.2 * s, alpha: 0.94, waviness: 1.0 * s, bristles: 2, dryness: 0.2, taper: false,
  });
  drawDryPastelRibbon(ctx, ringPts, {
    color: '#fcef68', width: 2.8 * s, alpha: 0.95, waviness: 0.9 * s, bristles: 2, dryness: 0.32, taper: false,
  });
  for (const chainSign of [-1, 1]) {
    drawDryPastelRibbon(
      ctx,
      [
        [rig.rearWheel.x, rig.rearWheel.y + chainSign * 5 * s],
        [
          (rig.rearWheel.x + rig.bb.x) * 0.5,
          (rig.rearWheel.y + rig.bb.y) * 0.5 + chainSign * 9 * s,
        ],
        [rig.bb.x, rig.bb.y + chainSign * 12 * s],
      ],
      { color: '#e6faf0', width: 2.5 * s, alpha: 0.92, waviness: 1.3 * s, phase: t * 10 + chainSign, bristles: 2, dryness: 0.34, taper: false }
    );
  }

  // 4. Interlocking Short-Arc Pastel Bicycle Frame + Dense Sulfur-Yellow & Zinc-White Ridges (#85 Contrast Guard!)
  const drawPastelFrameContour = (a, b, midCol, wTube = 6.2, bowDir = 1) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    // Keep upper normal pointing toward sky (`uy <= 0`) so highlight ridge always sits on top!
    const upSign = ny <= 0 ? 1 : -1;
    const ux = nx * upSign;
    const uy = ny * upSign;

    const p1 = [
      lerp(a.x, b.x, 0.34) + nx * bowDir * 2.6 * s,
      lerp(a.y, b.y, 0.34) + ny * bowDir * 2.6 * s,
    ];
    const p2 = [
      lerp(a.x, b.x, 0.68) - nx * bowDir * 2.1 * s,
      lerp(a.y, b.y, 0.68) - ny * bowDir * 2.1 * s,
    ];

    // Underside deep Prussian-blue rubbed shadow casing
    drawDryPastelRibbon(
      ctx,
      [
        [a.x - ux * 2.2 * s, a.y - uy * 2.2 * s],
        [p1[0] - ux * 2.4 * s, p1[1] - uy * 2.4 * s],
        [p2[0] - ux * 2.4 * s, p2[1] - uy * 2.4 * s],
        [b.x - ux * 2.2 * s, b.y - uy * 2.2 * s],
      ],
      { color: '#090f24', width: (wTube + 5.6) * s, alpha: 0.96, waviness: 1.5 * s, phase: a.x * 0.04, bristles: 3, dryness: 0.2, taper: false }
    );

    // Two overlapping broken pastel strokes for the organic expressionist iron core
    drawDryPastelRibbon(
      ctx,
      [[a.x, a.y], p1, [lerp(a.x, b.x, 0.62), lerp(a.y, b.y, 0.62)]],
      { color: midCol, width: wTube * s, alpha: 0.95, waviness: 1.5 * s, phase: a.y * 0.05, bristles: 3, dryness: 0.3, taper: true }
    );
    drawDryPastelRibbon(
      ctx,
      [[lerp(a.x, b.x, 0.32), lerp(a.y, b.y, 0.32)], p2, [b.x, b.y]],
      { color: midCol, width: wTube * s, alpha: 0.95, waviness: 1.5 * s, phase: b.y * 0.05 + 1.4, bristles: 3, dryness: 0.3, taper: true }
    );

    // Dense Sulfur-Yellow + Zinc-White top-edge pastel ridge (#85 Mandatory Contrast Guard!)
    drawDryPastelRibbon(
      ctx,
      [
        [a.x + ux * 1.8 * s, a.y + uy * 1.8 * s],
        [p1[0] + ux * 2.1 * s, p1[1] + uy * 2.1 * s],
        [p2[0] + ux * 2.1 * s, p2[1] + uy * 2.1 * s],
        [b.x + ux * 1.8 * s, b.y + uy * 1.8 * s],
      ],
      { color: '#fcef68', width: 3.8 * s, alpha: 0.98, waviness: 1.2 * s, phase: a.x * 0.07, bristles: 2, dryness: 0.28, crumbs: true, taper: false }
    );
    drawDryPastelRibbon(
      ctx,
      [
        [lerp(a.x, b.x, 0.12) + ux * 2.6 * s, lerp(a.y, b.y, 0.12) + uy * 2.6 * s],
        [p1[0] + ux * 2.8 * s, p1[1] + uy * 2.8 * s],
        [lerp(a.x, b.x, 0.86) + ux * 2.6 * s, lerp(a.y, b.y, 0.86) + uy * 2.6 * s],
      ],
      { color: '#fffdf0', width: 2.2 * s, alpha: 0.94, waviness: 1.0 * s, phase: a.x * 0.09 + 2, bristles: 2, dryness: 0.35, crumbs: true }
    );
  };

  drawPastelFrameContour(rig.rearWheel, rig.seatCluster, '#4ba398', 5.2, 1);
  drawPastelFrameContour(rig.rearWheel, rig.bb, '#3c8a86', 5.0, -1);
  drawPastelFrameContour(rig.seatCluster, rig.bb, '#e84c20', 5.8, 1);
  drawPastelFrameContour(rig.seatCluster, rig.headTop, '#f47424', 6.2, -1);
  drawPastelFrameContour(rig.bb, rig.headBot, '#4ba398', 6.0, 1);
  drawPastelFrameContour(rig.headTop, rig.headBot, '#f6c844', 6.0, 1);
  drawPastelFrameContour(rig.headBot, rig.frontWheel, '#f26d22', 5.4, -1);

  // Seatpost, expressionist leather saddle & swept pastel handlebars
  drawPastelFrameContour(rig.seatCluster, rig.saddle, '#86ccb8', 4.2, 1);
  drawDryPastelRibbon(
    ctx,
    [
      [rig.saddle.x - 17 * s, rig.saddle.y + 1 * s],
      [rig.saddle.x, rig.saddle.y - 2.5 * s],
      [rig.saddle.x + 15 * s, rig.saddle.y + 2 * s],
    ],
    { color: '#101428', width: 8.8 * s, alpha: 0.98, waviness: 1.1 * s, bristles: 3, dryness: 0.22 }
  );
  drawDryPastelRibbon(
    ctx,
    [
      [rig.saddle.x - 13 * s, rig.saddle.y - 2 * s],
      [rig.saddle.x + 10 * s, rig.saddle.y - 1.5 * s],
    ],
    { color: '#f6c848', width: 2.6 * s, alpha: 0.88, waviness: 0.9 * s, bristles: 2, dryness: 0.36 }
  );

  drawDryPastelRibbon(
    ctx,
    [
      [rig.headTop.x, rig.headTop.y],
      [rig.stemTop.x, rig.stemTop.y],
      [rig.barRiser.x, rig.barRiser.y],
      [rig.handleGrip.x, rig.handleGrip.y],
    ],
    { color: '#0b1024', width: 8.0 * s, alpha: 0.96, waviness: 1.3 * s, bristles: 3, dryness: 0.2, taper: false }
  );
  drawDryPastelRibbon(
    ctx,
    [
      [rig.stemTop.x, rig.stemTop.y - 1 * s],
      [rig.farGrip.x, rig.farGrip.y],
    ],
    { color: '#4ba398', width: 4.5 * s, alpha: 0.92, waviness: 1.0 * s, bristles: 2, dryness: 0.25, taper: false }
  );
  drawDryPastelRibbon(
    ctx,
    [
      [rig.headTop.x, rig.headTop.y - 1 * s],
      [rig.stemTop.x, rig.stemTop.y - 1.5 * s],
      [rig.barRiser.x, rig.barRiser.y - 1.5 * s],
      [rig.handleGrip.x, rig.handleGrip.y - 1.5 * s],
    ],
    { color: '#fff8dc', width: 4.2 * s, alpha: 0.96, waviness: 1.2 * s, bristles: 2, dryness: 0.32, crumbs: true, taper: false }
  );

  // 5. Near Crank + Abstract Expressionist Dry-Pastel & Rubbed-Casein Naiwa (`孟克抽象表现派呐喊奶蛙`)!
  drawMunchCrank(rig.rightPedal);
  drawAbstractExpressionistNaiwa(ctx, rig, 'front', t);

  ctx.restore();
}

/**
 * Pure 1893 Munch / Abstract Expressionist Dry-Pastel & Rubbed-Casein Naiwa (`抽象表现派呐喊奶蛙`):
 * Warped acoustic S-wave silhouette, juxtaposed Expressionist color planes (bruised fjord-indigo,
 * fiery cadmium-vermilion, acidic sulfur-gold & sage-ochre), swirling concentric casein-cream belly,
 * bold undulating Prussian-charcoal contours, asymmetrical hollow orbital rings & oval "O" scream mouth!
 */
function drawAbstractExpressionistNaiwa(ctx, rig, layer, t = 0) {
  const s = rig.root.scale || 1;
  const wx = (y, mul = 1) => Math.sin(y * 0.054 - t * 4.2) * 3.6 * s * mul;
  const wy = (x, mul = 1) => Math.cos(x * 0.048 + t * 3.4) * 1.8 * s * mul;

  const sampleCurve = (p0, p1, p2, n = 7) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const mu = 1 - u;
      const x = mu * mu * p0.x + 2 * mu * u * p1.x + u * u * p2.x;
      const y = mu * mu * p0.y + 2 * mu * u * p1.y + u * u * p2.y;
      out.push([x + wx(y, 0.72), y + wy(x, 0.5)]);
    }
    return out;
  };

  if (layer === 'back') {
    // Sinuous boneless Expressionist far leg
    const farLegPts = [
      ...sampleCurve(
        rig.leftHip,
        { x: (rig.leftHip.x + rig.leftKnee.x) * 0.5 + 4 * s, y: (rig.leftHip.y + rig.leftKnee.y) * 0.5 - 3 * s },
        rig.leftKnee,
        5
      ),
      ...sampleCurve(
        rig.leftKnee,
        { x: (rig.leftKnee.x + rig.leftFoot.x) * 0.5 - 3 * s, y: (rig.leftKnee.y + rig.leftFoot.y) * 0.5 + 2 * s },
        rig.leftFoot,
        5
      ).slice(1),
    ];
    drawDryPastelRibbon(ctx, farLegPts, {
      color: '#0e142b', width: 15.5 * s, alpha: 0.96, waviness: 1.8 * s, phase: t * 3.1, bristles: 3, dryness: 0.22, taper: false,
    });
    drawDryPastelRibbon(ctx, farLegPts, {
      color: '#4e2b4b', width: 11.2 * s, alpha: 0.92, waviness: 1.6 * s, phase: t * 3.1 + 1.2, bristles: 3, dryness: 0.26, taper: false,
    });
    drawDryPastelRibbon(ctx, farLegPts, {
      color: '#d24d1e', width: 7.4 * s, alpha: 0.90, waviness: 1.5 * s, phase: t * 3.1 + 2.1, bristles: 2, dryness: 0.28, taper: false,
    });
    drawDryPastelRibbon(ctx, [
      [rig.leftFoot.x - 5 * s, rig.leftFoot.y + 2 * s],
      [rig.leftFoot.x + 13 * s, rig.leftFoot.y + 3 * s],
    ], {
      color: '#2e1d18', width: 6.5 * s, alpha: 0.95, waviness: 1.1 * s, bristles: 2, dryness: 0.24, taper: false,
    });

    // Sinuous Expressionist far arm
    const farArmPts = sampleCurve(
      rig.farShoulder,
      { x: rig.farElbow.x + 2 * s, y: rig.farElbow.y - 3 * s },
      rig.farHand,
      6
    );
    drawDryPastelRibbon(ctx, farArmPts, {
      color: '#0d1226', width: 11.8 * s, alpha: 0.95, waviness: 1.5 * s, phase: t * 3.5, bristles: 3, dryness: 0.24, taper: false,
    });
    drawDryPastelRibbon(ctx, farArmPts, {
      color: '#cf531f', width: 7.5 * s, alpha: 0.90, waviness: 1.4 * s, phase: t * 3.5 + 1.1, bristles: 2, dryness: 0.28, taper: false,
    });
    drawDryPastelRibbon(ctx, farArmPts.slice(3), {
      color: '#291a16', width: 6.8 * s, alpha: 0.95, waviness: 1.1 * s, bristles: 2, dryness: 0.22, taper: false,
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // FRONT LAYER: Abstract Expressionist Warped Pear-Gourd Torso, Swirl Belly & Scream Face
  // ---------------------------------------------------------------------------
  const hx = rig.head.x;
  const hy = rig.head.y;
  const bx = rig.bodyCenter.x;
  const by = rig.bodyCenter.y;
  const belX = rig.bellyPatch.x;
  const belY = rig.bellyPatch.y;

  // Fluid wave-warped Expressionist silhouette path
  const buildBodyPath = () => {
    ctx.beginPath();
    const pCrown = [hx - 3 * s + wx(hy - 22 * s), hy - 22.5 * s];
    ctx.moveTo(pCrown[0], pCrown[1]);
    // Back of skull -> concave S-warped spine -> upturned stubby tail
    ctx.bezierCurveTo(
      hx - 25 * s + wx(hy - 8 * s), hy - 14 * s,
      bx - 30 * s + wx(by - 22 * s), by - 24 * s,
      rig.tailBase.x - 2 * s + wx(rig.tailBase.y), rig.tailBase.y - 5 * s
    );
    ctx.quadraticCurveTo(
      rig.tailTip.x - 6 * s + wx(rig.tailTip.y), rig.tailTip.y - 6 * s,
      rig.tailTip.x + wx(rig.tailTip.y), rig.tailTip.y + 1 * s
    );
    ctx.quadraticCurveTo(
      rig.tailBase.x - 4 * s + wx(rig.tailBase.y + 10 * s), rig.tailBase.y + 13 * s,
      rig.hip.x - 8 * s + wx(rig.hip.y + 12 * s), rig.hip.y + 13 * s
    );
    // Underside of haunch -> bulging potbelly -> throat tuck -> snub snout -> brow
    ctx.bezierCurveTo(
      bx + 4 * s + wx(by + 30 * s), by + 31 * s,
      belX + 27 * s + wx(belY + 12 * s), belY + 18 * s,
      belX + 25.5 * s + wx(belY - 6 * s), belY - 7 * s
    );
    ctx.bezierCurveTo(
      belX + 22 * s + wx(rig.chest.y), rig.chest.y - 1 * s,
      rig.throatTuck.x + 2 * s + wx(rig.throatTuck.y), rig.throatTuck.y + 2 * s,
      rig.snubLip.x + 2 * s + wx(rig.snubLip.y), rig.snubLip.y - 1 * s
    );
    ctx.bezierCurveTo(
      rig.farEye.x + 5 * s + wx(rig.farEye.y), rig.farEye.y - 9 * s,
      hx + 12 * s + wx(hy - 21 * s), hy - 22 * s,
      pCrown[0], pCrown[1]
    );
    ctx.closePath();
  };

  // 1. Fractured Rubbed-Casein & Tempera Expressionist Color Planes (clipped inside warped silhouette)
  ctx.save();
  buildBodyPath();
  ctx.clip();

  // Base rubbed amber-ochre ground
  ctx.fillStyle = '#df8522';
  ctx.fillRect(bx - 95 * s, hy - 55 * s, 185 * s, 185 * s);

  // Dorsal & tail bruised fjord-indigo / violet shadow plane (curved organic S-boundary, zero straight cut!)
  ctx.fillStyle = 'rgba(34, 42, 82, 0.80)';
  ctx.beginPath();
  ctx.moveTo(hx - 6 * s, hy - 28 * s);
  ctx.bezierCurveTo(
    bx - 22 * s + wx(by - 12 * s), by - 10 * s,
    bx - 28 * s + wx(by + 14 * s), by + 16 * s,
    rig.hip.x - 10 * s, rig.hip.y + 24 * s
  );
  ctx.lineTo(bx - 95 * s, rig.hip.y + 26 * s);
  ctx.lineTo(bx - 95 * s, hy - 32 * s);
  ctx.closePath();
  ctx.fill();

  // Diagonal fiery cadmium-vermilion Expressionist anxiety plane
  ctx.fillStyle = 'rgba(226, 72, 28, 0.84)';
  ctx.beginPath();
  ctx.moveTo(hx + 2 * s, hy - 14 * s);
  ctx.bezierCurveTo(bx - 20 * s, by - 10 * s, bx - 30 * s, by + 16 * s, rig.tailBase.x + 2 * s, rig.hip.y + 18 * s);
  ctx.lineTo(belX + 10 * s, belY + 32 * s);
  ctx.bezierCurveTo(belX - 2 * s, belY + 2 * s, hx + 18 * s, hy + 8 * s, hx + 2 * s, hy - 14 * s);
  ctx.closePath();
  ctx.fill();

  // Interlocking dry-pastel dorsal-flank S-ribbons blending the indigo tail into the fiery vermilion-ochre torso!
  drawDryPastelRibbon(
    ctx,
    [
      [hx - 12 * s, hy - 10 * s],
      [bx - 20 * s + wx(by), by + 2 * s],
      [rig.tailBase.x + 8 * s, rig.tailBase.y + 4 * s],
      [rig.tailTip.x + 2 * s, rig.tailTip.y + 1 * s],
    ],
    { color: '#d9481e', width: 9.5 * s, alpha: 0.86, waviness: 2.0 * s, phase: t * 3.1 + 0.6, bristles: 3, dryness: 0.30, crumbs: true }
  );
  drawDryPastelRibbon(
    ctx,
    [
      [bx - 16 * s, by - 6 * s],
      [bx - 24 * s + wx(by + 8 * s), by + 10 * s],
      [rig.tailBase.x + 4 * s, rig.tailBase.y + 8 * s],
    ],
    { color: '#453263', width: 8.2 * s, alpha: 0.82, waviness: 1.9 * s, phase: t * 2.9 + 1.8, bristles: 3, dryness: 0.32, crumbs: true }
  );

  // Upper skull & chest acidic sulfur-gold + sickly citron-sage Munchian plane
  ctx.fillStyle = 'rgba(246, 198, 54, 0.90)';
  ctx.beginPath();
  ctx.ellipse(hx + 6 * s, hy + 4 * s, 26 * s, 30 * s, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(182, 194, 98, 0.56)';
  ctx.beginPath();
  ctx.ellipse(hx + 11 * s, hy - 2 * s, 16 * s, 15 * s, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Rubbed casein-parchment potbelly base before dry-pastel vortex arcs
  ctx.fillStyle = 'rgba(245, 232, 198, 0.88)';
  ctx.beginPath();
  ctx.ellipse(belX + 3 * s + wx(belY, 0.5), belY + 2 * s, 22 * s, 24.5 * s, -0.14, 0, Math.PI * 2);
  ctx.fill();

  // Sweeping internal dry-pastel Expressionist rib/wave bands across head, back & flank!
  const bandSpecs = [
    { col: '#fcef64', w: 8.8, dy0: -15, dy1: -8, xSpan: 0.95 },
    { col: '#eb501e', w: 8.2, dy0: -4, dy1: 4, xSpan: 1.0 },
    { col: '#f6b832', w: 9.2, dy0: 7, dy1: 15, xSpan: 1.05 },
    { col: '#313d6b', w: 7.4, dy0: 17, dy1: 24, xSpan: 0.92 },
    { col: '#fcef64', w: 8.4, dy0: 26, dy1: 33, xSpan: 0.98 },
    { col: '#d9441d', w: 7.8, dy0: 36, dy1: 42, xSpan: 0.90 },
  ];
  for (let i = 0; i < bandSpecs.length; i++) {
    const bs = bandSpecs[i];
    const yL = hy + bs.dy0 * s;
    const yR = hy + bs.dy1 * s;
    const yM = (yL + yR) * 0.5 + Math.sin(i * 1.7 + t * 3.6) * 5.5 * s;
    drawDryPastelRibbon(
      ctx,
      [
        [bx - 48 * s * bs.xSpan, yL + 6 * s],
        [bx - 8 * s, yM - 5 * s],
        [belX + 26 * s * bs.xSpan, yR],
      ],
      {
        color: bs.col,
        width: bs.w * s,
        alpha: 0.88,
        waviness: 2.1 * s,
        phase: t * 3.2 + i * 1.35,
        bristles: 3,
        dryness: 0.30,
        crumbs: true,
        taper: true,
      }
    );
  }

  // Concentric off-center swirling dry-pastel cream & sulfur vortex on Naiwa's potbelly!
  for (const [ringR, col, wR, phOff] of [
    [19.5, '#f49d2a', 5.2, 0.0],
    [14.5, '#fff7db', 5.8, 1.4],
    [9.2, '#e8be68', 4.6, 2.7],
    [4.6, '#fffdf2', 4.2, 3.9],
  ]) {
    const vPts = [];
    for (let k = 0; k <= 8; k++) {
      const a = -0.85 + (k / 8) * Math.PI * 1.65;
      vPts.push([
        belX + 4 * s + Math.cos(a) * ringR * 0.88 * s + wx(belY + Math.sin(a) * ringR, 0.35),
        belY + 2 * s + Math.sin(a) * ringR * 1.05 * s,
      ]);
    }
    drawDryPastelRibbon(ctx, vPts, {
      color: col,
      width: wR * s,
      alpha: 0.90,
      waviness: 1.4 * s,
      phase: t * 2.8 + phOff,
      bristles: 2,
      dryness: 0.28,
      crumbs: true,
      taper: true,
    });
  }
  ctx.restore();

  // 2. Bold Undulating Prussian-Charcoal & Sulfur Dry-Pastel Expressionist Outer Contours
  const dorsalContour = [
    [hx + 4 * s + wx(hy - 22 * s), hy - 22.5 * s],
    [hx - 18 * s + wx(hy - 12 * s), hy - 12 * s],
    [bx - 24 * s + wx(by - 18 * s), by - 18 * s],
    [rig.tailBase.x - 1 * s + wx(rig.tailBase.y), rig.tailBase.y - 4 * s],
    [rig.tailTip.x + wx(rig.tailTip.y), rig.tailTip.y],
    [rig.tailBase.x - 3 * s + wx(rig.tailBase.y + 10 * s), rig.tailBase.y + 11 * s],
    [rig.hip.x - 6 * s + wx(rig.hip.y + 12 * s), rig.hip.y + 12 * s],
  ];
  drawDryPastelRibbon(ctx, dorsalContour, {
    color: '#0a0f22', width: 6.4 * s, alpha: 0.96, waviness: 1.9 * s, phase: t * 3.0, bristles: 3, dryness: 0.24, crumbs: true, taper: false,
  });
  drawDryPastelRibbon(ctx, dorsalContour.slice(0, 5), {
    color: '#fcef64', width: 3.4 * s, alpha: 0.86, waviness: 1.6 * s, phase: t * 3.0 + 1.5, bristles: 2, dryness: 0.34, crumbs: true,
  });

  const ventralContour = [
    [hx + 6 * s + wx(hy - 22 * s), hy - 22 * s],
    [rig.farEye.x + 5 * s + wx(rig.farEye.y), rig.farEye.y - 6 * s],
    [rig.snubLip.x + 2 * s + wx(rig.snubLip.y), rig.snubLip.y],
    [rig.throatTuck.x + 1 * s + wx(rig.throatTuck.y), rig.throatTuck.y + 2 * s],
    [belX + 24 * s + wx(belY - 8 * s), belY - 8 * s],
    [belX + 26 * s + wx(belY + 10 * s), belY + 11 * s],
    [bx + 6 * s + wx(by + 29 * s), by + 29 * s],
    [rig.hip.x - 4 * s + wx(rig.hip.y + 12 * s), rig.hip.y + 12 * s],
  ];
  drawDryPastelRibbon(ctx, ventralContour, {
    color: '#0c1226', width: 5.4 * s, alpha: 0.95, waviness: 1.7 * s, phase: t * 2.9 + 0.8, bristles: 3, dryness: 0.26, taper: false,
  });

  // 3. Boneless Sinuous Expressionist Near Leg (`rightHip -> rightKnee -> rightFoot`)
  const nearLegPts = [
    ...sampleCurve(
      rig.rightHip,
      { x: (rig.rightHip.x + rig.rightKnee.x) * 0.5 + 5 * s, y: (rig.rightHip.y + rig.rightKnee.y) * 0.5 - 3 * s },
      rig.rightKnee,
      5
    ),
    ...sampleCurve(
      rig.rightKnee,
      { x: (rig.rightKnee.x + rig.rightFoot.x) * 0.5 - 3 * s, y: (rig.rightKnee.y + rig.rightFoot.y) * 0.5 + 2 * s },
      rig.rightFoot,
      5
    ).slice(1),
  ];
  drawDryPastelRibbon(ctx, nearLegPts, {
    color: '#0b1022', width: 16.5 * s, alpha: 0.96, waviness: 1.8 * s, phase: t * 3.3, bristles: 3, dryness: 0.22, taper: false,
  });
  drawDryPastelRibbon(ctx, nearLegPts, {
    color: '#e5561e', width: 11.4 * s, alpha: 0.94, waviness: 1.6 * s, phase: t * 3.3 + 1.1, bristles: 3, dryness: 0.26, taper: false,
  });
  drawDryPastelRibbon(ctx, nearLegPts, {
    color: '#fcef64', width: 6.2 * s, alpha: 0.92, waviness: 1.5 * s, phase: t * 3.3 + 2.2, bristles: 2, dryness: 0.30, crumbs: true, taper: true,
  });
  drawDryPastelRibbon(
    ctx,
    [
      [rig.rightFoot.x - 5 * s, rig.rightFoot.y + 1.5 * s],
      [rig.rightFoot.x + 15 * s, rig.rightFoot.y + 3 * s],
    ],
    { color: '#0c1124', width: 8.2 * s, alpha: 0.96, waviness: 1.1 * s, bristles: 2, dryness: 0.22, taper: false }
  );
  drawDryPastelRibbon(
    ctx,
    [
      [rig.rightFoot.x - 3 * s, rig.rightFoot.y + 1 * s],
      [rig.rightFoot.x + 13 * s, rig.rightFoot.y + 2.2 * s],
    ],
    { color: '#f29f24', width: 4.8 * s, alpha: 0.94, waviness: 1.0 * s, bristles: 2, dryness: 0.28, taper: false }
  );

  // 4. Boneless Sinuous Expressionist Near Arm + Burnt-Umber/Charcoal Clawed Hand
  const nearArmPts = sampleCurve(
    rig.wingShoulder,
    { x: rig.wingElbow.x - 1 * s, y: rig.wingElbow.y + 4 * s },
    rig.wingTip,
    7
  );
  drawDryPastelRibbon(ctx, nearArmPts, {
    color: '#0b1022', width: 13.5 * s, alpha: 0.96, waviness: 1.6 * s, phase: t * 3.7, bristles: 3, dryness: 0.22, taper: false,
  });
  drawDryPastelRibbon(ctx, nearArmPts.slice(0, 5), {
    color: '#eb641e', width: 9.2 * s, alpha: 0.94, waviness: 1.5 * s, phase: t * 3.7 + 0.9, bristles: 3, dryness: 0.26, taper: false,
  });
  drawDryPastelRibbon(ctx, nearArmPts.slice(0, 4), {
    color: '#fcef64', width: 4.6 * s, alpha: 0.90, waviness: 1.3 * s, phase: t * 3.7 + 1.9, bristles: 2, dryness: 0.32, crumbs: true, taper: true,
  });
  // Naiwa's dark umber-charcoal forearm gradient & splayed Expressionist fingers
  drawDryPastelRibbon(ctx, nearArmPts.slice(3), {
    color: '#241714', width: 8.6 * s, alpha: 0.96, waviness: 1.2 * s, phase: t * 3.7 + 2.5, bristles: 3, dryness: 0.22, taper: false,
  });
  for (let f = -1; f <= 1; f++) {
    drawDryPastelRibbon(
      ctx,
      [
        [rig.wingTip.x - 4 * s, rig.wingTip.y + f * 2.2 * s],
        [rig.wingTip.x + 5.5 * s, rig.wingTip.y + f * 3.4 * s + 1.5 * s],
      ],
      { color: '#140e12', width: 2.8 * s, alpha: 0.95, waviness: 0.8 * s, bristles: 2, dryness: 0.2, taper: true }
    );
  }

  // 5. Abstract Expressionist Munch × Naiwa Face:
  //    Asymmetrical hollow bruised-sage orbital sockets + wide-staring pupils + iconic oval "O" scream mouth!
  const eyeSpecs = [
    { cx: rig.farEye.x + 0.8 * s + wx(rig.farEye.y, 0.5), cy: rig.farEye.y - 0.8 * s, rx: 5.8 * s, ry: 7.4 * s, tilt: 0.20 },
    { cx: rig.nearEye.x - 1.2 * s + wx(rig.nearEye.y, 0.5), cy: rig.nearEye.y - 0.4 * s, rx: 7.8 * s, ry: 9.0 * s, tilt: -0.22 },
  ];
  for (let eIdx = 0; eIdx < eyeSpecs.length; eIdx++) {
    const e = eyeSpecs[eIdx];
    ctx.save();
    ctx.translate(e.cx, e.cy);
    ctx.rotate(e.tilt);
    // Bruised fjord-teal outer socket shadow
    ctx.fillStyle = 'rgba(32, 54, 68, 0.82)';
    ctx.beginPath();
    ctx.ellipse(0, 0, e.rx * 1.18, e.ry * 1.18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Sickly sage-citron Munch casein sclera
    ctx.fillStyle = eIdx === 1 ? '#b8cfa0' : '#9ab689';
    ctx.beginPath();
    ctx.ellipse(0, 0, e.rx * 0.88, e.ry * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();
    // Stark off-center abyssal pupil + chalk fleck
    ctx.fillStyle = '#080c1a';
    ctx.beginPath();
    ctx.ellipse(1.1 * s, 0.4 * s, e.rx * 0.44, e.ry * 0.48, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffdf0';
    ctx.fillRect(-1.4 * s, -2.6 * s, 2.3 * s, 2.1 * s);
    ctx.restore();

    // Jagged dry-pastel charcoal orbital ring
    const ringLoop = [];
    for (let k = 0; k <= 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      ringLoop.push([
        e.cx + Math.cos(a) * e.rx * 0.98,
        e.cy + Math.sin(a) * e.ry * 0.98,
      ]);
    }
    drawDryPastelRibbon(ctx, ringLoop, {
      color: '#0a0f22', width: 3.1 * s, alpha: 0.96, waviness: 1.0 * s, phase: eIdx * 2.1 + t * 3, bristles: 2, dryness: 0.25, taper: false,
    });
  }

  // Wavy anxious Munchian charcoal brow ridge above eyes
  drawDryPastelRibbon(
    ctx,
    [
      [rig.nearEye.x - 10 * s + wx(rig.nearEye.y - 11 * s, 0.5), rig.nearEye.y - 9.5 * s],
      [rig.nearEye.x + 2 * s + wx(rig.nearEye.y - 13 * s, 0.5), rig.nearEye.y - 12.8 * s],
      [rig.farEye.x + 6 * s + wx(rig.farEye.y - 11 * s, 0.5), rig.farEye.y - 10.2 * s],
    ],
    { color: '#0c1124', width: 3.2 * s, alpha: 0.92, waviness: 1.2 * s, phase: t * 3.8, bristles: 2, dryness: 0.28, taper: true }
  );

  // Iconic Munch hollow vertical-oval "O" silent-scream mouth!
  const mx = (rig.mouthStart.x + rig.mouthEnd.x) * 0.5 + 0.5 * s + wx(rig.mouthStart.y, 0.5);
  const my = (rig.mouthStart.y + rig.mouthEnd.y) * 0.5 + 2.6 * s;
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(0.12);
  ctx.fillStyle = '#f6e2b3';
  ctx.beginPath();
  ctx.ellipse(0, 0, 5.8 * s, 7.8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#080b18';
  ctx.beginPath();
  ctx.ellipse(0.3 * s, 0.3 * s, 3.8 * s, 5.8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function render(kit, slot, scene, params) {
  const {
    t,
    localT,
    pelicanLocalX,
    pedalAngle,
    speedScale,
    isOutroThumbnail = false,
  } = params;

  // Explicitly keep slot.usedFb = false so main.js & outro.js both composite 100% from slot.g2d!
  slot.usedFb = false;

  const g = slot.g2d;
  const ctx = g.drawingContext;
  ctx.save();
  ctx.clearRect(0, 0, PANEL_SIZE, PANEL_SIZE);

  // 12Hz hand-repainted brush-boil phase, converging smoothly to continuous time `t`
  // inside x < 90 and x > 910 (#85 Rule §0.3 cross-frame C1 continuity!)
  const edgeCalm =
    smoothstep(16, 92, pelicanLocalX) *
    smoothstep(PANEL_SIZE - 16, PANEL_SIZE - 92, pelicanLocalX);
  const q12 = Math.floor(t * 12 + 1e-5) / 12;
  const boilT = lerp(t, q12, edgeCalm);

  // 1. Baked 1893 Papp cardboard + Kubelka-Munk spectral casein/pastel + fjord + wooden bridge
  const bg = getBakedScreamBackdrop(kit);
  ctx.drawImage(bg.canvas, 0, 0);

  // 2. Shared Screamer posture & acoustic shock epicenter
  const screamerState = computeScreamerState(localT, boilT);

  // 3. Living field-warping sky & fjord pastel ribbons (spasming around Screamer's shriek in Bar 2!)
  drawFieldWarpingSkyAndFjord(ctx, screamerState, boilT);

  // 4. Midground Cadaverous Rubbed-Casein Screamer near the bridge railing
  drawScreamerFigure(ctx, screamerState, pelicanLocalX, boilT);

  // 5. Foreground Pastel/Casein Pelican & Sulfur-Highlighted Bicycle along y = 680
  if (pelicanLocalX > -240 && pelicanLocalX < PANEL_SIZE + 240) {
    const rig = computePelicanRig({
      x: pelicanLocalX,
      y: ROAD_EDGE_Y,
      pedalAngle,
      scale: 1.0,
      slope: 0,
      speedScale,
      poseMode: 'normal',
      time: t,
    });
    drawMunchPelicanAndBike(ctx, rig, boilT);
  }

  // 6. Subtle global unprimed Papp cardboard tooth breath over dynamic strokes
  const toothTile = getBakedCardboardToothTile(kit);
  ctx.save();
  ctx.globalAlpha = 0.42;
  for (let gx = 0; gx < PANEL_SIZE; gx += 256) {
    for (let gy = 0; gy < PANEL_SIZE; gy += 256) {
      ctx.drawImage(toothTile.canvas, gx, gy);
    }
  }
  ctx.restore();

  // 7. Pure Painting Canvas in Main Run (#85 §0.1: outer brass frame plaque carries title);
  //    retain crisp bottom label ONLY for `isOutroThumbnail`!
  if (isOutroThumbnail) {
    ctx.fillStyle = 'rgba(20, 14, 16, 0.84)';
    ctx.fillRect(0, PANEL_SIZE - 96, PANEL_SIZE, 96);
    ctx.strokeStyle = '#e65822';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, PANEL_SIZE - 96);
    ctx.lineTo(PANEL_SIZE, PANEL_SIZE - 96);
    ctx.stroke();
    ctx.fillStyle = '#faf0dc';
    ctx.font = '700 48px "PelicanSerif", serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${String(scene.num).padStart(2, '0')} ${scene.zh}`, 36, PANEL_SIZE - 48);
  }

  ctx.restore();
}
