// src/kit/ambient.js
// 1. Per-era continuous background micro-dynamics (`renderPanelAmbientLife`) enhancing naturalness
//    and visual delicacy across all 20 eras without disturbing foreground readability.
// 2. Vertical 9:16 (1080x1920) Museum Exhibition Hall (`renderVerticalGalleryEnvironment`) framing
//    the 920x920px center panel with a 2900K brass picture-lamp, volumetric Tyndall light cone,
//    chronological 20-era progress header, and mobile-legible brushed-brass curator plaque.

import {
  PANEL_SIZE,
  NUM_SCENES,
  SCENES,
  BEAT_SEC,
  clamp,
  lerp,
  smoothstep,
} from '../beat/timeline.js';
import { VIEW_W, VIEW_H, BASE_PANEL_SCALE } from '../beat/camera.js';

/**
 * Deterministic hash in [0, 1) for stable continuous particle trajectories.
 */
function h01(seed) {
  let x = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/**
 * Renders delicate, era-authentic continuous ambient motion inside each 1000x1000 panel (`slot.g2d`).
 */
export function renderPanelAmbientLife(ctx, scene, t, localT) {
  if (!ctx || !scene) return;
  const idx = scene.index;
  ctx.save();

  switch (scene.id) {
    case 's01_sahara': {
      // Warm Tassili desert sunlight shaft + drifting ochre sandstone dust motes
      const g = ctx.createLinearGradient(120, 0, 680, 620);
      const pulse = 0.045 + 0.018 * Math.sin(t * 1.9);
      g.addColorStop(0, `rgba(255, 224, 158, ${pulse.toFixed(3)})`);
      g.addColorStop(1, 'rgba(255, 210, 130, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, PANEL_SIZE, 680);

      for (let i = 0; i < 22; i++) {
        const u = (h01(i * 17 + 3) + t * (0.045 + h01(i * 31) * 0.035)) % 1;
        const px = u * PANEL_SIZE;
        const py = 90 + h01(i * 43) * 540 + Math.sin(t * 2.2 + i) * 14;
        const r = 1.2 + h01(i * 59) * 2.1;
        const a = Math.sin(u * Math.PI) * 0.34;
        ctx.fillStyle = `rgba(255, 232, 182, ${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 's02_egypt': {
      // Sanctuary clerestory sunbeam + shimmering Nile water glints in lower predella
      const beamX = 280 + Math.sin(t * 0.8) * 22;
      const bg = ctx.createLinearGradient(beamX, 0, beamX + 260, 680);
      bg.addColorStop(0, 'rgba(255, 230, 162, 0.075)');
      bg.addColorStop(1, 'rgba(255, 230, 162, 0)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(beamX, 0);
      ctx.lineTo(beamX + 190, 0);
      ctx.lineTo(beamX + 360, 680);
      ctx.lineTo(beamX + 80, 680);
      ctx.closePath();
      ctx.fill();

      for (let i = 0; i < 18; i++) {
        const px = (h01(i * 23 + 200) * 940 + t * 28) % 960 + 20;
        const py = 740 + h01(i * 41 + 200) * 210;
        const gl = Math.max(0, Math.sin(t * 4.2 + i * 1.7));
        if (gl > 0.25) {
          ctx.strokeStyle = `rgba(255, 238, 178, ${(gl * 0.32).toFixed(3)})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(px - 10 * gl, py);
          ctx.lineTo(px + 10 * gl, py);
          ctx.stroke();
        }
      }
      break;
    }

    case 's03_han': {
      // Subtle stone-chamber torchlight warmth + drifting cinnabar/pine-soot motes
      for (let i = 0; i < 20; i++) {
        const u = (h01(i * 19 + 300) + t * (0.038 + h01(i * 29) * 0.03)) % 1;
        const px = (1 - u) * PANEL_SIZE;
        const py = 110 + h01(i * 53 + 300) * 530 + Math.cos(t * 2.4 + i) * 12;
        const isRed = i % 5 === 0;
        const a = Math.sin(u * Math.PI) * (isRed ? 0.38 : 0.22);
        ctx.fillStyle = isRed
          ? `rgba(208, 68, 48, ${a.toFixed(3)})`
          : `rgba(240, 234, 220, ${a.toFixed(3)})`;
        ctx.fillRect(px, py, 2.2, 2.2);
      }
      break;
    }

    case 's04_tang': {
      // Soaring Dunhuang/Chang'an silk-cloud wisps + drifting crimson/apricot blossom petals
      for (let i = 0; i < 14; i++) {
        const u = (h01(i * 37 + 400) + t * (0.075 + (i % 3) * 0.02)) % 1;
        const px = PANEL_SIZE - u * (PANEL_SIZE + 120) + 60;
        const py = 120 + h01(i * 61 + 400) * 480 + Math.sin(t * 3.1 + i * 1.4) * 20;
        const rot = t * 2.6 + i;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rot);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(198, 72, 56, 0.34)' : 'rgba(224, 172, 84, 0.32)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 5.2, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 's05_song': {
      // Drifting Northern Song mountain valley mist ribbons (`山岚云气`) + waterfall spray
      for (let m = 0; m < 4; m++) {
        const mx = ((t * (18 + m * 6) + m * 270) % 1360) - 180;
        const my = 250 + m * 95 + Math.sin(t * 0.9 + m) * 10;
        const mg = ctx.createRadialGradient(mx, my, 12, mx, my, 185);
        mg.addColorStop(0, 'rgba(242, 235, 218, 0.14)');
        mg.addColorStop(0.6, 'rgba(242, 235, 218, 0.05)');
        mg.addColorStop(1, 'rgba(242, 235, 218, 0)');
        ctx.fillStyle = mg;
        ctx.fillRect(mx - 190, my - 70, 380, 140);
      }
      break;
    }

    case 's06_qingming': {
      // Sparkling Bian River ripples (`汴河波光`) + spring willow catkins (`柳絮`)
      for (let i = 0; i < 20; i++) {
        const rx = 60 + h01(i * 29 + 600) * 880 + Math.sin(t * 1.8 + i) * 14;
        const ry = 705 + h01(i * 47 + 600) * 255;
        const tw = Math.max(0, Math.sin(t * 4.6 + i * 2.1));
        if (tw > 0.2) {
          ctx.strokeStyle = `rgba(255, 248, 224, ${(tw * 0.36).toFixed(3)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(rx - 9 * tw, ry);
          ctx.lineTo(rx + 9 * tw, ry);
          ctx.stroke();
        }
      }
      for (let k = 0; k < 12; k++) {
        const u = (h01(k * 71 + 610) + t * 0.055) % 1;
        const cx = (1 - u) * PANEL_SIZE;
        const cy = 90 + h01(k * 83 + 610) * 430 + Math.sin(t * 2.5 + k) * 16;
        ctx.fillStyle = 'rgba(255, 252, 242, 0.46)';
        ctx.beginPath();
        ctx.arc(cx, cy, 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 's07_maya': {
      // Rising golden copal incense embers & sacred Maya-blue jade pollen
      for (let i = 0; i < 20; i++) {
        const u = (h01(i * 31 + 700) + t * 0.065) % 1;
        const px = 80 + h01(i * 53 + 700) * 840 + Math.sin(t * 3.0 + i) * 18;
        const py = 660 - u * 560;
        const a = Math.sin(u * Math.PI) * 0.48;
        ctx.fillStyle = i % 3 === 0
          ? `rgba(46, 178, 158, ${a.toFixed(3)})`
          : `rgba(255, 206, 78, ${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 's08_mughal': {
      // Royal Mughal `Zar-afshan` (sprinkled 24k gold-leaf dust) glinting in warm twilight
      for (let i = 0; i < 24; i++) {
        const px = 70 + h01(i * 37 + 800) * 860 + Math.sin(t * 1.4 + i) * 8;
        const py = 75 + h01(i * 67 + 800) * 575 + Math.cos(t * 1.7 + i) * 8;
        const tw = Math.pow(Math.max(0, Math.sin(t * 3.8 + i * 1.9)), 2);
        if (tw > 0.1) {
          ctx.fillStyle = `rgba(255, 232, 138, ${(tw * 0.55).toFixed(3)})`;
          ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
        }
      }
      break;
    }

    case 's09_bada': {
      // Zen breathing Xuan-paper ink humidity + 3 slow-drifting dry autumn spores
      for (let i = 0; i < 5; i++) {
        const u = (h01(i * 43 + 900) + t * 0.028) % 1;
        const px = 140 + u * 720;
        const py = 180 + i * 92 + Math.sin(t * 1.5 + i * 2) * 14;
        ctx.fillStyle = `rgba(42, 38, 34, ${(Math.sin(u * Math.PI) * 0.18).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 's10_wayang': {
      // Flickering Blencong coconut-oil flame warmth + rising golden shadow-screen sparks
      const flick = 0.04 + 0.028 * Math.sin(t * 13.5) + 0.015 * Math.cos(t * 23.1);
      const bg = ctx.createRadialGradient(500, 260, 20, 500, 420, 540);
      bg.addColorStop(0, `rgba(255, 196, 84, ${flick.toFixed(3)})`);
      bg.addColorStop(1, 'rgba(255, 150, 40, 0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, PANEL_SIZE, PANEL_SIZE);
      break;
    }

    case 's11_ukiyoe': {
      // Tokaido gusting sakura petals sweeping across Hokusai/Hiroshige sky
      for (let i = 0; i < 16; i++) {
        const u = (h01(i * 29 + 1100) + t * (0.11 + (i % 4) * 0.02)) % 1;
        const px = PANEL_SIZE - u * (PANEL_SIZE + 140) + 70;
        const py = 95 + h01(i * 59 + 1100) * 510 + Math.sin(u * 9 + i) * 22;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(t * 3.8 + i);
        ctx.fillStyle = 'rgba(252, 224, 228, 0.65)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 5.5, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 's12_starry': {
      // Pulsing Van Gogh citron-yellow starlight halos & swirling night fireflies
      for (let i = 0; i < 14; i++) {
        const px = 80 + h01(i * 41 + 1200) * 840 + Math.cos(t * 2.1 + i) * 16;
        const py = 70 + h01(i * 73 + 1200) * 440 + Math.sin(t * 2.1 + i) * 12;
        const tw = 0.25 + 0.25 * Math.sin(t * 4.4 + i * 1.6);
        const sg = ctx.createRadialGradient(px, py, 0.5, px, py, 14);
        sg.addColorStop(0, `rgba(255, 244, 152, ${tw.toFixed(3)})`);
        sg.addColorStop(1, 'rgba(255, 244, 152, 0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 's13_scream': {
      // Acoustic blood-orange sky tremor pulse synchronized to the 120/180 BPM beat
      const beatP = Math.exp(-((localT / BEAT_SEC) % 1) * 4.5) * 0.055;
      const sg = ctx.createLinearGradient(0, 0, 0, 480);
      sg.addColorStop(0, `rgba(255, 94, 36, ${beatP.toFixed(3)})`);
      sg.addColorStop(1, 'rgba(255, 94, 36, 0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, PANEL_SIZE, 480);
      break;
    }

    case 's14_nosferatu': {
      // 1922 Silent-Film Nitrate Gate Flicker & Vertical Celluloid Hairline Scratches
      const gate = 0.03 + 0.025 * Math.sin(t * 29.0) * Math.cos(t * 17.0);
      ctx.fillStyle = `rgba(232, 214, 174, ${Math.max(0, gate).toFixed(3)})`;
      ctx.fillRect(0, 0, PANEL_SIZE, PANEL_SIZE);
      for (let s = 0; s < 2; s++) {
        const sx = ((Math.floor(t * 14) * 317 + s * 431) % 880) + 60;
        ctx.strokeStyle = 'rgba(240, 228, 198, 0.11)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(sx, 20);
        ctx.lineTo(sx + 2, PANEL_SIZE - 20);
        ctx.stroke();
      }
      break;
    }

    case 's15_oscilloscope': {
      // Travelling P1 phosphor refresh scanband across spherical CRT dome
      const scanY = 120 + ((t * 190) % 740);
      const pg = ctx.createLinearGradient(0, scanY - 28, 0, scanY + 28);
      pg.addColorStop(0, 'rgba(57, 255, 122, 0)');
      pg.addColorStop(0.5, 'rgba(57, 255, 122, 0.055)');
      pg.addColorStop(1, 'rgba(57, 255, 122, 0)');
      ctx.save();
      ctx.beginPath();
      ctx.arc(500, 492, 408, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = pg;
      ctx.fillRect(80, scanY - 28, 840, 56);
      ctx.restore();
      break;
    }

    case 's18_vaporwave': {
      // Floating holographic cyan/magenta synthwave horizon sparkles
      for (let i = 0; i < 16; i++) {
        const u = (h01(i * 47 + 1800) + t * 0.07) % 1;
        const px = 70 + h01(i * 89 + 1800) * 860;
        const py = 540 - u * 430;
        const a = Math.sin(u * Math.PI) * 0.45;
        ctx.fillStyle = i % 2 === 0 ? `rgba(0, 245, 255, ${a.toFixed(3)})` : `rgba(255, 42, 157, ${a.toFixed(3)})`;
        ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      }
      break;
    }

    case 's19_shortvideo': {
      // Sunlit coastal lens bokeh orbs drifting inside the 9:16 viewport [219..781]
      ctx.save();
      ctx.beginPath();
      ctx.rect(219, 0, 562, PANEL_SIZE);
      ctx.clip();
      for (let i = 0; i < 8; i++) {
        const u = (h01(i * 53 + 1900) + t * 0.08) % 1;
        const bx = 781 - u * 620;
        const by = 180 + h01(i * 79 + 1900) * 440 + Math.sin(t * 2 + i) * 15;
        const r = 14 + (i % 3) * 9;
        const bg = ctx.createRadialGradient(bx, by, 1, bx, by, r);
        bg.addColorStop(0, 'rgba(255, 244, 206, 0.14)');
        bg.addColorStop(0.7, 'rgba(255, 198, 130, 0.06)');
        bg.addColorStop(1, 'rgba(255, 198, 130, 0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }

    case 's20_code': {
      // Subtle floating vector vertex glints on the OLED dark optical workbench
      for (let i = 0; i < 14; i++) {
        const u = (h01(i * 61 + 2000) + t * 0.05) % 1;
        const px = 80 + h01(i * 97 + 2000) * 860;
        const py = 660 - u * 560;
        const a = Math.sin(u * Math.PI) * 0.35;
        ctx.fillStyle = i % 2 === 0 ? `rgba(88, 166, 255, ${a.toFixed(3)})` : `rgba(253, 224, 71, ${a.toFixed(3)})`;
        ctx.fillRect(px - 1.2, py - 1.2, 2.4, 2.4);
      }
      break;
    }

    default:
      break;
  }

  void idx;
  ctx.restore();
}

/**
 * Bakes the static 1080x1920 Belgian-linen & oiled-walnut vertical museum hall shell once (`kit.bake2D`).
 * Leaves the center band around the 920x920px panel transparent so live scrolling panels shine through!
 */
function getBakedVerticalHallBackdrop(kit) {
  return kit.bake2D(
    'vertical_museum_hall_9x16_v1',
    (_g, ctx, rng, w, h) => {
      ctx.clearRect(0, 0, w, h);

      // 1. Upper Museum Gallery Wall (`y = 0..478`)
      const topG = ctx.createLinearGradient(0, 0, 0, 478);
      topG.addColorStop(0.0, '#110f0d');
      topG.addColorStop(0.22, '#1d1915');
      topG.addColorStop(0.78, '#26211c');
      topG.addColorStop(1.0, '#221e19');
      ctx.fillStyle = topG;
      ctx.fillRect(0, 0, w, 478);

      // Subtle Belgian-linen weave on upper wall
      for (let i = 0; i < 1600; i++) {
        const fx = rng() * w;
        const fy = rng() * 474;
        const len = 5 + rng() * 18;
        ctx.strokeStyle =
          rng() > 0.48
            ? `rgba(255, 242, 218, ${(0.018 + rng() * 0.026).toFixed(3)})`
            : `rgba(8, 7, 6, ${(0.05 + rng() * 0.06).toFixed(3)})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + len, fy);
        ctx.stroke();
      }

      // Architectural Ceiling Cornice & Brass Track Rail (`y = 48..66`)
      const cornG = ctx.createLinearGradient(0, 44, 0, 68);
      cornG.addColorStop(0, '#0a0908');
      cornG.addColorStop(0.45, '#352d24');
      cornG.addColorStop(1, '#181410');
      ctx.fillStyle = cornG;
      ctx.fillRect(0, 44, w, 22);
      ctx.strokeStyle = 'rgba(218, 186, 128, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 65.5);
      ctx.lineTo(w, 65.5);
      ctx.stroke();

      // Brushed-Brass Picture-Lamp Hood mounted at `(540, 418)` illuminating the center frame!
      const lampCx = w * 0.5;
      const lampY = 414;
      ctx.strokeStyle = '#6e5530';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(lampCx - 64, lampY + 14);
      ctx.lineTo(lampCx - 64, 466);
      ctx.moveTo(lampCx + 64, lampY + 14);
      ctx.lineTo(lampCx + 64, 466);
      ctx.stroke();

      const hoodG = ctx.createLinearGradient(lampCx - 150, lampY, lampCx + 150, lampY + 18);
      hoodG.addColorStop(0.0, '#46351c');
      hoodG.addColorStop(0.28, '#b89450');
      hoodG.addColorStop(0.50, '#f0d490');
      hoodG.addColorStop(0.74, '#9a783d');
      hoodG.addColorStop(1.0, '#3b2b15');
      ctx.fillStyle = hoodG;
      ctx.beginPath();
      ctx.roundRect(lampCx - 150, lampY, 300, 18, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 240, 196, 0.72)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(lampCx - 136, lampY + 18.5);
      ctx.lineTo(lampCx + 136, lampY + 18.5);
      ctx.stroke();

      // 2. Lower Museum Dado Rail & Oiled-Walnut Wainscoting (`y = 1456..1920`)
      const dadoY = 1462;
      const dadoG = ctx.createLinearGradient(0, dadoY, 0, dadoY + 22);
      dadoG.addColorStop(0.0, '#4d4134');
      dadoG.addColorStop(0.28, '#382f26');
      dadoG.addColorStop(0.75, '#211c17');
      dadoG.addColorStop(1.0, '#120f0d');
      ctx.fillStyle = dadoG;
      ctx.fillRect(0, dadoY, w, 22);

      ctx.strokeStyle = 'rgba(232, 202, 150, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, dadoY + 1.5);
      ctx.lineTo(w, dadoY + 1.5);
      ctx.stroke();

      const wainG = ctx.createLinearGradient(0, dadoY + 22, 0, h);
      wainG.addColorStop(0.0, '#191613');
      wainG.addColorStop(0.72, '#12100e');
      wainG.addColorStop(1.0, '#0a0908');
      ctx.fillStyle = wainG;
      ctx.fillRect(0, dadoY + 22, w, h - (dadoY + 22));

      // Three recessed architectural walnut coffers behind the lower curator plaque
      for (let c = 0; c < 3; c++) {
        const cx0 = 56 + c * 332;
        const cw = 304;
        const cy0 = 1512;
        const ch = 336;
        ctx.fillStyle = 'rgba(9, 8, 7, 0.45)';
        ctx.fillRect(cx0, cy0, cw, ch);
        ctx.strokeStyle = 'rgba(6, 5, 4, 0.88)';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx0, cy0, cw, ch);
        ctx.strokeStyle = 'rgba(204, 174, 122, 0.10)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx0 + 4, cy0 + 4, cw - 8, ch - 8);
      }
    },
    VIEW_W,
    VIEW_H
  );
}

/**
 * Renders the living 9:16 (1080x1920) Museum Exhibition Hall upper & lower bands,
 * volumetric 2900K spotlight dust motes, 20-era timeline bar, and Curator Plaque!
 */
export function renderVerticalGalleryEnvironment(p, kit, overlayG, beatState, cam, clampedT) {
  // Fade out smoothly during Intro (t < 5.0), #19 full-screen 9:16 expansion, and Outro
  const hallVis = (1 - (cam.surroundDim ?? 0)) * smoothstep(4.15, 4.95, clampedT);
  if (hallVis <= 0.005) return;

  // Also fade out slightly when zooming deep into #05 Song landscape (`cam.scale > 1.15`)
  const songZoomFade = 1 - smoothstep(BASE_PANEL_SCALE * 1.08, BASE_PANEL_SCALE * 1.85, cam.scale);
  const alpha = hallVis * songZoomFade;
  if (alpha <= 0.005) return;

  const ctx = overlayG.drawingContext;
  overlayG.clear();
  ctx.save();
  ctx.globalAlpha = alpha;

  // 1. Static Baked Belgian-Linen Upper Wall + Lower Walnut Wainscoting
  const hallBg = getBakedVerticalHallBackdrop(kit);
  ctx.drawImage(hallBg.canvas, 0, 0);

  // 2. Volumetric 2900K Tyndall Picture-Lamp Wash Cone + Floating Golden Dust Motes (`y = 430..660`)
  const breath = 0.92 + 0.08 * Math.sin(clampedT * 2.1);
  const coneG = ctx.createRadialGradient(VIEW_W * 0.5, 432, 18, VIEW_W * 0.5, 520, 480);
  coneG.addColorStop(0.0, `rgba(255, 236, 184, ${(0.22 * breath).toFixed(3)})`);
  coneG.addColorStop(0.45, `rgba(255, 214, 142, ${(0.08 * breath).toFixed(3)})`);
  coneG.addColorStop(1.0, 'rgba(255, 214, 142, 0)');
  ctx.fillStyle = coneG;
  ctx.fillRect(40, 418, VIEW_W - 80, 260);

  for (let i = 0; i < 18; i++) {
    const u = (h01(i * 37 + 91) + clampedT * (0.032 + (i % 4) * 0.008)) % 1;
    const mx = 160 + h01(i * 73 + 19) * 760 + Math.sin(clampedT * 1.4 + i) * 22;
    const my = 110 + u * 355;
    const ma = Math.sin(u * Math.PI) * 0.34;
    ctx.fillStyle = `rgba(255, 234, 182, ${ma.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(mx, my, 1.4 + (i % 3) * 0.65, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Upper Exhibition Header (`y = 104..358`): Title + Chronological 20-Era Progress Track
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(218, 188, 134, 0.78)';
  ctx.font = '600 20px "PelicanMono", "PelicanSans", sans-serif';
  ctx.fillText('THE NAIWA TEST · 6000 YEARS OF VISUAL ART', VIEW_W * 0.5, 128);

  ctx.fillStyle = '#f6efe0';
  ctx.font = '700 58px "PelicanSerif", serif';
  ctx.fillText('《 奶 蛙 测 试 》', VIEW_W * 0.5, 198);

  ctx.fillStyle = 'rgba(214, 198, 170, 0.72)';
  ctx.font = '500 23px "PelicanSerif", serif';
  ctx.fillText('一只呆滞大肚奶蛙横穿人类六千年二十道画框', VIEW_W * 0.5, 258);

  // 20-Era Chronological Timeline Progress Track (`y = 324`)
  const trackX0 = 114;
  const trackX1 = VIEW_W - 114;
  const trackY = 326;
  const sceneProg = clamp((clampedT - 5.0) / 120.0, 0, 1);

  ctx.strokeStyle = 'rgba(212, 180, 124, 0.24)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(trackX0, trackY);
  ctx.lineTo(trackX1, trackY);
  ctx.stroke();

  ctx.strokeStyle = '#e5c178';
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(trackX0, trackY);
  ctx.lineTo(lerp(trackX0, trackX1, sceneProg), trackY);
  ctx.stroke();

  const activeIdx = clamp(beatState.sceneIndex ?? 0, 0, NUM_SCENES - 1);
  for (let i = 0; i < NUM_SCENES; i++) {
    const dx = lerp(trackX0, trackX1, i / (NUM_SCENES - 1));
    const isPast = i <= activeIdx;
    const isCur = i === activeIdx;
    ctx.fillStyle = isCur ? '#fff4d2' : isPast ? '#d8b268' : 'rgba(160, 140, 110, 0.38)';
    ctx.beginPath();
    ctx.arc(dx, trackY, isCur ? 6.8 : 3.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = '600 17px "PelicanMono", monospace';
  ctx.fillStyle = 'rgba(214, 192, 152, 0.68)';
  ctx.textAlign = 'left';
  ctx.fillText('6000 BCE', trackX0, trackY + 28);
  ctx.textAlign = 'right';
  ctx.fillText('2020s CE', trackX1, trackY + 28);

  // 4. Lower Brushed-Brass & Ebonized-Walnut Curator Plaque (`y = 1546..1808`)
  const curScene = SCENES[activeIdx] || SCENES[0];
  const px = 78;
  const py = 1548;
  const pw = VIEW_W - 156; // 924px wide for crystal-clear mobile legibility!
  const ph = 248;

  ctx.fillStyle = 'rgba(4, 3, 3, 0.68)';
  ctx.beginPath();
  ctx.roundRect(px + 6, py + 9, pw, ph, 12);
  ctx.fill();

  const cardG = ctx.createLinearGradient(px, py, px + pw, py + ph);
  cardG.addColorStop(0.0, '#261e15');
  cardG.addColorStop(0.45, '#362a1d');
  cardG.addColorStop(1.0, '#1e1710');
  ctx.fillStyle = cardG;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 12);
  ctx.fill();

  ctx.strokeStyle = '#c8a25c';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.roundRect(px + 2, py + 2, pw - 4, ph - 4, 10);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(245, 222, 172, 0.25)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(px + 10, py + 10, pw - 20, ph - 20, 7);
  ctx.stroke();

  // Four brass corner rivets
  for (const [rx, ry] of [
    [px + 22, py + 22],
    [px + pw - 22, py + 22],
    [px + 22, py + ph - 22],
    [px + pw - 22, py + ph - 22],
  ]) {
    ctx.fillStyle = '#e2bf78';
    ctx.beginPath();
    ctx.arc(rx, ry, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Era Number Pill + Chinese Title + Era Date
  const numStr = String(curScene.num).padStart(2, '0');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8c47a';
  ctx.font = '700 23px "PelicanMono", monospace';
  ctx.fillText(`EXHIBIT NO.${numStr}  ·  ${curScene.era}`, VIEW_W * 0.5, py + 48);

  ctx.fillStyle = '#fbf4e4';
  ctx.font = '700 46px "PelicanSerif", serif';
  ctx.fillText(curScene.zh, VIEW_W * 0.5, py + 108);

  ctx.fillStyle = 'rgba(226, 206, 170, 0.82)';
  ctx.font = '500 22px "PelicanSans", sans-serif';
  ctx.fillText(curScene.en, VIEW_W * 0.5, py + 158);

  // Subtle gold rule + Bar-2 Gag / Curatorial Note
  ctx.strokeStyle = 'rgba(208, 172, 108, 0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 90, py + 184);
  ctx.lineTo(px + pw - 90, py + 184);
  ctx.stroke();

  const beatFlash = Math.exp(-((clampedT / BEAT_SEC) % 1) * 5.0);
  ctx.fillStyle = `rgba(246, 214, 142, ${(0.78 + 0.22 * beatFlash).toFixed(3)})`;
  ctx.font = '600 22px "PelicanSerif", serif';
  ctx.fillText(`馆藏看点：${curScene.gag}`, VIEW_W * 0.5, py + 214, pw - 72);

  ctx.restore();

  // Composite onto the main WEBGL canvas
  p.push();
  p.imageMode(p.CORNER);
  p.noTint();
  p.image(overlayG, -VIEW_W / 2, -VIEW_H / 2, VIEW_W, VIEW_H);
  p.pop();
}
