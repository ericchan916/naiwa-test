// src/scenes/intro.js
// Intro (0.0s - 5.0s) for 9:16 Vertical HD (1080x1920):
// Archival museum rag-paper folio, upper facsimile plate "图一　奶蛙骑行图（摹本）",
// deadpan documentary serif subtitles hitting the strong beat, and a 1:1 world-projected
// single-Naiwa match-cut dissolving from sepia manuscript study directly into Frame #1!

import { VIEW_W, VIEW_H, BASE_PANEL_SCALE } from '../beat/camera.js';
import { ROAD_EDGE_Y, smoothstep, smootherstep, lerp } from '../beat/timeline.js';
import { computePelicanRig, drawRig2D } from '../rig/pelican.js';
import { drawStylizedWatermarkAt } from '../kit/watermark.js';

/**
 * Bakes the 1080x1920 archival documentary rag-paper folio + facsimile plate once.
 */
function getIntroBackdrop(kit) {
  return kit.bake2D('intro_archival_backdrop_9x16_v1', (_g, ctx, rng, w, h) => {
    // Warm museum rag-paper gradient
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.44, 90, w * 0.5, h * 0.5, h * 0.68);
    bg.addColorStop(0, '#f7f0e2');
    bg.addColorStop(0.65, '#ebe0c9');
    bg.addColorStop(1, '#d6c5a4');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle laid-paper horizontal chain lines & cotton fibers
    for (let y = 0; y < h; y += 6) {
      ctx.strokeStyle = `rgba(110, 88, 58, ${(0.022 + rng() * 0.018).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 1800; i++) {
      const fx = rng() * w;
      const fy = rng() * h;
      const len = 5 + rng() * 18;
      const a = rng() * Math.PI * 2;
      ctx.strokeStyle =
        rng() > 0.4
          ? `rgba(255, 252, 245, ${(0.14 + rng() * 0.16).toFixed(3)})`
          : `rgba(108, 84, 54, ${(0.04 + rng() * 0.07).toFixed(3)})`;
      ctx.lineWidth = 0.7 + rng() * 0.8;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + Math.cos(a) * len, fy + Math.sin(a) * len);
      ctx.stroke();
    }

    // Archival double folio border around 1080x1920 page margin
    ctx.strokeStyle = 'rgba(88, 70, 48, 0.36)';
    ctx.lineWidth = 2.4;
    ctx.strokeRect(48, 56, w - 96, h - 112);
    ctx.lineWidth = 1.0;
    ctx.strokeRect(58, 66, w - 116, h - 132);

    // Upper Folio Header Kicker
    ctx.fillStyle = 'rgba(92, 70, 46, 0.78)';
    ctx.font = '600 20px "PelicanMono", "PelicanSerif", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ARCHIVAL FOLIO · PLATE I  |  《 奶 蛙 测 试 》', w * 0.5, 118);

    // Centered Upper Facsimile Plate ("图一　奶蛙骑行图（摹本）") at `y = 162..648`
    const pw = 660;
    const ph = 476;
    const px = Math.round((w - pw) * 0.5);
    const py = 162;

    ctx.fillStyle = 'rgba(240, 230, 208, 0.88)';
    ctx.strokeStyle = 'rgba(78, 60, 40, 0.64)';
    ctx.lineWidth = 2.0;
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeRect(px, py, pw, ph);

    ctx.strokeStyle = 'rgba(78, 60, 40, 0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 10, py + 10, pw - 20, ph - 64);

    // Cross-hatched sepia ground lines inside the facsimile sketch
    const groundPy = py + 354;
    ctx.strokeStyle = 'rgba(92, 71, 48, 0.32)';
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 54; i++) {
      const lx = px + 44 + i * 10.6;
      const ly = groundPy + 2 + (rng() - 0.5) * 5;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx - 14, ly + 18);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(px + 34, groundPy);
    ctx.lineTo(px + pw - 34, groundPy);
    ctx.stroke();

    // Facsimile pencil-and-sepia anatomical sketch of Naiwa on archaic velocipede
    const sketchRig = computePelicanRig({
      x: px + pw * 0.5 + 8,
      y: groundPy,
      pedalAngle: 0.65,
      wheelAngle: 0.3,
      scale: 1.06,
      speedScale: 0.2,
    });

    // Da Vinci / encyclopedic construction measurement callouts
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(110, 82, 52, 0.36)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(sketchRig.frontWheel.x, sketchRig.frontWheel.y, sketchRig.frontWheel.r + 15, 0, Math.PI * 2);
    ctx.arc(sketchRig.bellyPatch.x, sketchRig.bellyPatch.y, sketchRig.bellyPatch.ry + 10, 0, Math.PI * 2);
    ctx.moveTo(px + 48, sketchRig.head.y);
    ctx.lineTo(px + pw - 48, sketchRig.head.y);
    ctx.stroke();
    ctx.restore();

    for (let pass = 0; pass < 2; pass++) {
      ctx.save();
      ctx.translate((pass - 0.5) * 1.3, (0.5 - pass) * 1.1);
      drawRig2D(ctx, sketchRig, {
        featherFill: pass === 0 ? 'rgba(236, 206, 134, 0.52)' : 'transparent',
        featherShade: 'rgba(186, 148, 86, 0.42)',
        wingTipDark: 'rgba(78, 58, 38, 0.74)',
        beakFill: 'rgba(142, 174, 138, 0.52)',
        pouchFill: 'rgba(244, 234, 208, 0.68)',
        legFill: 'rgba(110, 84, 56, 0.65)',
        frameStroke: 'rgba(76, 58, 40, 0.78)',
        metalStroke: 'rgba(86, 68, 48, 0.68)',
        tireStroke: 'rgba(62, 48, 34, 0.82)',
        inkOutline: pass === 0 ? 'rgba(58, 44, 30, 0.86)' : 'rgba(92, 70, 48, 0.42)',
        lineScale: pass === 0 ? 0.88 : 0.50,
      });
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(82, 62, 42, 0.74)';
    ctx.font = 'italic 18px "PelicanSerif", serif';
    ctx.textAlign = 'left';
    ctx.fillText('fig. α (双蛙目)', sketchRig.snubLip.x + 18, sketchRig.farEye.y - 4);
    ctx.fillText('fig. β (车把)', sketchRig.barRiser.x + 16, sketchRig.barRiser.y - 8);

    // Caption: 图一　奶蛙骑行图（摹本）
    ctx.fillStyle = '#3b2e20';
    ctx.font = '600 24px "PelicanSerif", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('图一　奶蛙骑行图（摹本）', px + pw / 2, py + ph - 28);
  }, VIEW_W, VIEW_H);
}

/**
 * Renders the Intro overlay (0.0s -> 5.0s) onto the 1080x1920 2D overlay canvas.
 */
export function renderIntroOverlay(kit, overlayG, t, cam = null, pelWorld = null) {
  if (t >= 5.0) return false;
  const ctx = overlayG.drawingContext;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  const pageAlpha = 1 - smootherstep(4.28, 4.96, t);
  const sketchPelAlpha = smoothstep(3.05, 3.45, t) * (1 - smootherstep(4.22, 4.92, t));
  if (pageAlpha <= 0.002 && sketchPelAlpha <= 0.002) return false;

  const camX = cam?.camX ?? -100;
  const camY = cam?.camY ?? 500;
  const scale = cam?.scale ?? BASE_PANEL_SCALE;

  // 1. Archival Rag-Paper Folio + Documentary Typography (`y = 740..1020`, above approaching Naiwa at y ≈ 1125!)
  if (pageAlpha > 0.002) {
    const backdrop = getIntroBackdrop(kit);
    ctx.save();
    ctx.globalAlpha = pageAlpha;
    ctx.drawImage(backdrop.canvas, 0, 0);
    // Top-left archival iron-gall folio watermark (`NONSTOP × ERC`)
    drawStylizedWatermarkAt(ctx, 'intro', 76, 80, 152, t);

    // Subtle opening fade-from-sepia-dark (0.0s -> 0.45s)
    const openFade = 1 - smoothstep(0.0, 0.45, t);
    if (openFade > 0.001) {
      ctx.fillStyle = `rgba(22, 18, 14, ${(openFade * 0.65).toFixed(3)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // Documentary Subtitles (Centered editorial typography sized cleanly for 1080px width!)
    const a1 = smoothstep(0.65, 1.08, t);
    if (a1 > 0.001) {
      ctx.save();
      ctx.globalAlpha = pageAlpha * a1;
      ctx.fillStyle = '#1f1913';
      ctx.font = '700 43px "PelicanSerif", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('「人类自古以来就痴迷于画奶蛙骑自行车。」', VIEW_W * 0.5, 768);
      ctx.restore();
    }

    const a2 = smoothstep(2.92, 3.12, t);
    if (a2 > 0.001) {
      const beatBump = t >= 2.98 && t < 3.45 ? Math.exp(-(t - 3.0) * 9) * 3.0 : 0;
      ctx.save();
      ctx.globalAlpha = pageAlpha * a2;
      ctx.fillStyle = '#241c15';
      ctx.font = '700 44px "PelicanSerif", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('「——早在自行车被发明之前。」', VIEW_W * 0.5, 848 - beatBump);
      ctx.restore();
    }

    const aCite = smoothstep(3.06, 3.28, t);
    if (aCite > 0.001) {
      ctx.save();
      ctx.globalAlpha = pageAlpha * aCite;
      ctx.fillStyle = '#3d2f20';
      ctx.font = '600 26px "PelicanSerif", serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('——《奶蛙骑行艺术通史》，卷一', VIEW_W - 118, 922);
      ctx.restore();
    }

    // Smooth right-to-left soft archival page reveal starting at 3.85s
    const wipeU = smootherstep(3.85, 4.94, t);
    if (wipeU > 0.002) {
      const edgeCenter = lerp(VIEW_W + 220, -240, wipeU);
      const featherHalf = 220;
      const gWipe = ctx.createLinearGradient(edgeCenter - featherHalf, 0, edgeCenter + featherHalf, 0);
      gWipe.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gWipe.addColorStop(0.5, 'rgba(0, 0, 0, 0.52)');
      gWipe.addColorStop(1, 'rgba(0, 0, 0, 1)');
      ctx.save();
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = gWipe;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }

    ctx.restore();
  }

  // 2. 1:1 World-Projected Sepia Manuscript Study Naiwa & Road Line (3.05s -> 4.92s)
  if (sketchPelAlpha > 0.002 && pelWorld) {
    ctx.save();
    ctx.translate(VIEW_W * 0.5, VIEW_H * 0.5);
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);

    ctx.beginPath();
    ctx.rect(-1400, -400, 1400, 1800);
    ctx.clip();

    ctx.globalAlpha = sketchPelAlpha * 0.72;
    ctx.strokeStyle = 'rgba(72, 56, 38, 0.68)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-900, ROAD_EDGE_Y);
    ctx.lineTo(0, ROAD_EDGE_Y);
    ctx.stroke();

    ctx.lineWidth = 1.0;
    ctx.strokeStyle = 'rgba(92, 71, 48, 0.36)';
    for (let hx = -620; hx <= -12; hx += 18) {
      ctx.beginPath();
      ctx.moveTo(hx, ROAD_EDGE_Y);
      ctx.lineTo(hx - 9, ROAD_EDGE_Y + 12);
      ctx.stroke();
    }

    const worldX = pelWorld.worldX;
    const msRig = computePelicanRig({
      x: worldX,
      y: ROAD_EDGE_Y,
      pedalAngle: pelWorld.pedalAngle,
      wheelAngle: worldX / 46,
      scale: 1.0,
      speedScale: pelWorld.speedScale,
      time: t,
    });

    const guideAlpha = sketchPelAlpha * (1 - smoothstep(3.6, 4.35, t));
    if (guideAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = guideAlpha;
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(110, 82, 52, 0.42)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(msRig.frontWheel.x, msRig.frontWheel.y, msRig.frontWheel.r + 10, 0, Math.PI * 2);
      ctx.arc(msRig.rearWheel.x, msRig.rearWheel.y, msRig.rearWheel.r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalAlpha = sketchPelAlpha;
    for (let pass = 0; pass < 2; pass++) {
      ctx.save();
      ctx.translate((pass - 0.5) * 1.1, (0.5 - pass) * 0.9);
      drawRig2D(ctx, msRig, {
        featherFill: pass === 0 ? '#eed284' : 'transparent',
        featherShade: 'rgba(196, 148, 68, 0.65)',
        wingTipDark: 'rgba(72, 56, 38, 0.82)',
        beakFill: 'rgba(139, 181, 142, 0.72)',
        pouchFill: 'rgba(247, 234, 206, 0.82)',
        legFill: 'rgba(110, 84, 56, 0.78)',
        frameStroke: '#5c4228',
        metalStroke: '#6e5438',
        tireStroke: '#3e2e1e',
        inkOutline: pass === 0 ? '#2f2317' : 'rgba(92, 70, 48, 0.45)',
        lineScale: pass === 0 ? 0.94 : 0.52,
      });
      ctx.restore();
    }

    ctx.restore();
  }

  return true;
}
