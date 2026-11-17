// src/main.js
// Master pure-function frame scheduler `renderAt(t)` for 《奶蛙测试》 (The Naiwa Test — 9:16 Vertical HD).
// Built atop orbitoo/pelican-test's museum engine with native-medium Naiwa protagonist,
// continuous per-era background dynamics, 1080x1920 vertical exhibition hall, and concise 1.50x pacing.

import {
  TOTAL_DURATION,
  PLAYBACK_SPEED,
  REAL_DURATION,
  INTRO_SEC,
  SCENES_TOTAL_SEC,
  PANEL_SIZE,
  ROAD_EDGE_Y,
  SCENES,
  clamp,
  lerp,
  smootherstep,
  getBeatState,
  getPelicanWorldState,
} from './beat/timeline.js';
import {
  VIEW_W,
  VIEW_H,
  getCameraState,
  getVisiblePanelIndices,
} from './beat/camera.js';
import { createKit } from './kit/kit.js';
import { drawPanelFrame } from './kit/frame.js';
import { renderThresholdMicroPhysics } from './kit/transitions.js';
import {
  renderPanelAmbientLife,
  renderVerticalGalleryEnvironment,
} from './kit/ambient.js';
import { preloadWatermarkAssets, renderPanelWatermark } from './kit/watermark.js';
import { computePelicanRig, drawRig2D } from './rig/pelican.js';
import { renderIntroOverlay } from './scenes/intro.js';
import { renderScenePanel } from './scenes/index.js';
import { renderSongCyclistHiRes } from './scenes/s05_song.js';
import { preloadShortVideoAssets } from './scenes/s19_shortvideo.js';
import { renderOutro, preloadOutroAssets } from './scenes/outro.js';
import { createAudioEngine } from './audio/engine.js';

const params = new URLSearchParams(window.location.search);
const IS_RENDER_MODE = window.__PELICAN_RENDER_MODE__ === true || params.get('render') === '1';
const INITIAL_T = parseFloat(params.get('t') || '0') || 0;

let kit = null;
let overlay2D = null;
let audioEngine = null;
let currentT = clamp(INITIAL_T, 0, TOTAL_DURATION);
let isPlaying = false;
let lastWallMs = 0;

/**
 * Pure deterministic render of the entire 1080x1920 vertical HD film frame at sim time `t` in [0, 137.0].
 */
function renderFilmFrame(p, _brush, t) {
  const clampedT = clamp(t, 0, TOTAL_DURATION);
  const beatState = getBeatState(clampedT);

  const frameSeed = ((Math.round(clampedT * 1000) + 1) * 2654435761) >>> 0;
  p.randomSeed(frameSeed);
  p.noiseSeed(frameSeed);

  // ---------------------------------------------------------------------------
  // Case A: Pure Outro (> 125.16s -> 137.0s) — 3x7 Vertical Exhibition Wall & Belly-Laugh Press Conference
  // ---------------------------------------------------------------------------
  const outroStart = INTRO_SEC + SCENES_TOTAL_SEC; // 125.0s
  if (clampedT > outroStart + 0.16) {
    overlay2D.clear();
    renderOutro(kit, overlay2D, clampedT, renderScenePanel);
    p.background(20, 18, 16);
    p.push();
    p.imageMode(p.CORNER);
    p.noTint();
    p.image(overlay2D, -VIEW_W / 2, -VIEW_H / 2, VIEW_W, VIEW_H);
    p.pop();
    return beatState;
  }

  // ---------------------------------------------------------------------------
  // Case B: Scroll World (0.0s -> 125.16s) + Vertical Gallery Hall + Intro/Outro Match-Cuts
  // ---------------------------------------------------------------------------
  const cam = getCameraState(clampedT);
  const pelWorld = getPelicanWorldState(clampedT);
  const visibleIndices = getVisiblePanelIndices(cam);

  // 1. Render each visible 1000x1000 era panel + per-era ambient background dynamics!
  const renderedPanels = visibleIndices.map((panelIdx, slotIdx) => {
    const scene = SCENES[panelIdx];
    const slot = kit.getSlot(slotIdx);
    slot.usedFb = false;
    slot.g2d.clear();

    const rawLocalT = clampedT - scene.t0;
    const panelLocalT = clamp(rawLocalT, 0, 6.0);
    const pelicanLocalX = pelWorld.worldX - scene.worldX0;

    renderScenePanel(kit, slot, scene, {
      t: clampedT,
      localT: panelLocalT,
      rawLocalT,
      pelicanLocalX,
      pedalAngle: pelWorld.pedalAngle,
      speedScale: pelWorld.speedScale,
      isOutroThumbnail: false,
    });

    renderPanelAmbientLife(slot.g2d.drawingContext, scene, clampedT, panelLocalT);
    renderPanelWatermark(slot.g2d.drawingContext, scene, panelLocalT);

    return { scene, slot };
  });

  // 2. Gallery Wall Backdrop on 1080x1920 WEBGL canvas
  p.background(28, 24, 20);

  p.push();
  p.scale(cam.scale);
  p.translate(-cam.camX, -cam.camY);

  // Warm museum gallery wall strip behind scrolling frames
  p.noStroke();
  p.fill(38, 33, 28);
  p.rect(-1400, -180, 22500, 1380);
  p.stroke(66, 58, 48);
  p.strokeWeight(2);
  p.line(-1400, 1028, 21200, 1028);

  // Pre-Frame-1 Entry Road (worldX in [-900, 0]) so Intro -> Frame #1 crossing is 100% continuous!
  if (cam.camX < 1200) {
    p.stroke(118, 96, 68);
    p.strokeWeight(4);
    p.line(-900, ROAD_EDGE_Y, 0, ROAD_EDGE_Y);

    if (pelWorld.visibleInScroll && pelWorld.worldX < 220) {
      const preSlot = kit.getSlot(3);
      preSlot.g2d.clear();
      const preCtx = preSlot.g2d.drawingContext;
      preCtx.save();
      const preRig = computePelicanRig({
        x: pelWorld.worldX + PANEL_SIZE,
        y: ROAD_EDGE_Y,
        pedalAngle: pelWorld.pedalAngle,
        wheelAngle: pelWorld.worldX / 46,
        scale: 1.0,
        speedScale: pelWorld.speedScale,
        time: clampedT,
      });
      drawRig2D(preCtx, preRig, {
        featherFill: '#e8b038',
        featherShade: '#b87d20',
        wingTipDark: '#4a3b28',
        beakFill: '#8bb58e',
        pouchFill: '#f4e6c2',
        frameStroke: '#6d3920',
        inkOutline: '#292018',
      });
      preCtx.restore();
      p.imageMode(p.CORNER);
      p.image(preSlot.g2d, -PANEL_SIZE, 0, PANEL_SIZE, PANEL_SIZE);
    }
  }

  // 3. Composite visible 1000x1000 panel canvases onto the gallery wall
  p.imageMode(p.CORNER);
  p.noTint();
  for (const { scene, slot } of renderedPanels) {
    if (slot.usedFb) {
      p.image(slot.fb, scene.worldX0, 0, PANEL_SIZE, PANEL_SIZE);
    }
    p.image(slot.g2d, scene.worldX0, 0, PANEL_SIZE, PANEL_SIZE);
  }

  // 4. Period-Authentic Mountings & Borders (`画框/装裱/硬件外框`)
  for (const { scene } of renderedPanels) {
    const isActive = beatState.sceneIndex === scene.index;
    if (scene.id === 's19_shortvideo' && cam.surroundDim > 0.6) continue;
    drawPanelFrame(p, scene, isActive, cam.framePulse, kit);
  }

  // 5. Cinema Velvet Side Masking during #19 Full-Screen 9:16 Expansion
  if (cam.surroundDim > 0.005) {
    const panel19X0 = SCENES[18].worldX0; // 18000
    const vxLeft = panel19X0 + 219;
    const vxRight = panel19X0 + 781;
    const halfViewWorldW = (VIEW_W * 0.56) / cam.scale;
    const curtainSlide = smootherstep(0.0, 0.72, cam.curtainProgress ?? 1);
    const leftEdgeX = lerp(cam.camX - halfViewWorldW, vxLeft, curtainSlide);
    const rightEdgeX = lerp(cam.camX + halfViewWorldW, vxRight, curtainSlide);
    const curtainAlpha = Math.round(cam.surroundDim * 252);

    p.noStroke();
    p.fill(5, 5, 8, curtainAlpha);
    p.rect(leftEdgeX - 3000, -600, 3000, 2200);
    p.rect(rightEdgeX, -600, 3000, 2200);
  }

  // 6. Localized Cross-Frame Medium Micro-Physics (`k = 0..19`)
  renderThresholdMicroPhysics(p, kit, clampedT, cam, pelWorld);

  p.pop();

  // 6b. Native 1080x1920 High-Resolution Song Cyclist & Watermark Overlay (#05 `s05_song`)
  //     Eliminates zoom pixelation on miniature Naiwa during the 2.75x valley macro push-in!
  if (visibleIndices.includes(4)) {
    overlay2D.clear();
    const drewSongHiRes = renderSongCyclistHiRes(
      kit,
      overlay2D.drawingContext,
      cam,
      SCENES[4],
      pelWorld,
      clampedT,
      VIEW_W,
      VIEW_H
    );
    if (drewSongHiRes) {
      p.push();
      p.imageMode(p.CORNER);
      p.noTint();
      p.image(overlay2D, -VIEW_W / 2, -VIEW_H / 2, VIEW_W, VIEW_H);
      p.pop();
    }
  }

  // 7. Living 9:16 Vertical Museum Exhibition Hall Upper & Lower Architecture + Curator Plaque
  renderVerticalGalleryEnvironment(p, kit, overlay2D, beatState, cam, clampedT);

  // 8. Intro Archival Documentary Overlay & 1:1 Single-Naiwa Match-Cut (0.0s -> 5.0s)
  if (clampedT < INTRO_SEC) {
    overlay2D.clear();
    const drewIntro = renderIntroOverlay(kit, overlay2D, clampedT, cam, pelWorld);
    if (drewIntro) {
      p.push();
      p.imageMode(p.CORNER);
      p.noTint();
      p.image(overlay2D, -VIEW_W / 2, -VIEW_H / 2, VIEW_W, VIEW_H);
      p.pop();
    }
  }

  // 9. #20 -> Outro 1:1 Registered Live-Continuation Cross-Dissolve (124.86s -> 125.14s)
  if (clampedT >= outroStart - 0.14) {
    const outroBlend = smootherstep(outroStart - 0.14, outroStart + 0.14, clampedT);
    if (outroBlend > 0.002) {
      overlay2D.clear();
      renderOutro(kit, overlay2D, clampedT, renderScenePanel);
      p.push();
      p.imageMode(p.CORNER);
      p.tint(255, Math.round(outroBlend * 255));
      p.image(overlay2D, -VIEW_W / 2, -VIEW_H / 2, VIEW_W, VIEW_H);
      p.noTint();
      p.pop();
    }
  }

  return beatState;
}

// =============================================================================
// Bootstrapping p5.js + p5.brush & UI Binding
// =============================================================================
async function boot() {
  await Promise.all([
    document.fonts?.ready ? document.fonts.ready : Promise.resolve(),
    preloadOutroAssets(),
    preloadWatermarkAssets(),
    preloadShortVideoAssets(),
  ]);

  const brush = window.brush;
  const P5 = window.p5;

  const sketch = (p) => {
    if (brush?.instance) {
      brush.instance(p);
    }

    p.setup = () => {
      p.pixelDensity(1);
      const cnv = p.createCanvas(VIEW_W, VIEW_H, p.WEBGL);
      const host = document.getElementById('canvas-host');
      if (host) cnv.parent(host);

      kit = createKit(p, brush);
      window.__PELICAN_KIT__ = kit;
      overlay2D = p.createGraphics(VIEW_W, VIEW_H);
      overlay2D.pixelDensity(1);

      if (IS_RENDER_MODE) {
        p.noLoop();
      } else {
        p.frameRate(60);
      }

      const st = renderFilmFrame(p, brush, currentT);
      updatePreviewHUD(st);
      window.__PELICAN_READY__ = true;
    };

    p.draw = () => {
      if (!IS_RENDER_MODE && isPlaying) {
        if (audioEngine && audioEngine.isPlaying()) {
          currentT = audioEngine.getCurrentTime();
          lastWallMs = performance.now();
        } else {
          const now = performance.now();
          const dt = Math.min(0.1, (now - lastWallMs) / 1000);
          lastWallMs = now;
          currentT += dt * PLAYBACK_SPEED;
        }
        if (currentT >= TOTAL_DURATION) {
          currentT = TOTAL_DURATION;
          setPlaying(false, { fromEnded: true });
        }
      }
      const st = renderFilmFrame(p, brush, currentT);
      if (!IS_RENDER_MODE) {
        updatePreviewHUD(st);
      }
    };

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = VIEW_W;
    exportCanvas.height = VIEW_H;
    const exportCtx = exportCanvas.getContext('2d');

    window.renderAt = async (t) => {
      currentT = clamp(Number(t) || 0, 0, TOTAL_DURATION);
      if (!IS_RENDER_MODE && audioEngine) {
        audioEngine.seek(currentT);
      }
      await p.redraw();
      return getBeatState(currentT);
    };

    window.renderFrameAt = async (t) => {
      currentT = clamp(Number(t) || 0, 0, TOTAL_DURATION);
      await p.redraw();
      const gl = p.drawingContext;
      if (gl?.finish) gl.finish();
      exportCtx.clearRect(0, 0, VIEW_W, VIEW_H);
      exportCtx.drawImage(p.canvas, 0, 0, VIEW_W, VIEW_H);
      return getBeatState(currentT);
    };

    window.captureFrameAt = async (t, mime = 'image/png', quality = 0.94) => {
      await window.renderFrameAt(t);
      const dataUrl = exportCanvas.toDataURL(mime, quality);
      return dataUrl.split(',')[1];
    };

    window.__PELICAN_EXPORT_CANVAS__ = exportCanvas;
  };

  // eslint-disable-next-line no-new
  new P5(sketch);
  if (!IS_RENDER_MODE) {
    audioEngine = createAudioEngine();
    window.__pelicanAudioEngine = audioEngine;
    if (currentT > 0) {
      audioEngine.seek(currentT);
    }
    initPreviewControls();
    updateAudioHUD();
    audioEngine.onReady(() => updateAudioHUD());
    audioEngine.onEnded(() => {
      currentT = TOTAL_DURATION;
      setPlaying(false, { fromEnded: true });
    });
    audioEngine.init().catch((err) => {
      console.warn('[audio] background soundtrack hydration warning:', err);
    });
  }
}

function formatMMSS(sec) {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
}

function updateAudioHUD() {
  const muteBtn = document.getElementById('btn-mute');
  const volSlider = document.getElementById('volume-slider');
  const statusEl = document.getElementById('audio-status');
  if (!audioEngine) return;

  const muted = audioEngine.isMuted();
  const vol = audioEngine.getVolume();
  if (muteBtn) {
    const icon = muted || vol <= 0.001 ? '🔇' : vol < 0.45 ? '🔉' : '🔊';
    muteBtn.textContent = muted || vol <= 0.001 ? `${icon} 静音` : `${icon} 音量`;
  }
  if (volSlider && document.activeElement !== volSlider) {
    volSlider.value = muted ? '0' : vol.toFixed(2);
  }
  if (statusEl) {
    if (audioEngine.isReady()) {
      statusEl.textContent = '合成音轨就绪';
      statusEl.classList.remove('is-loading');
      statusEl.classList.add('is-ready');
    } else {
      statusEl.textContent = '音轨合成中…';
      statusEl.classList.add('is-loading');
      statusEl.classList.remove('is-ready');
    }
  }
}

function setPlaying(nextState, opts = {}) {
  if (nextState && currentT >= TOTAL_DURATION - 0.01) {
    currentT = 0;
    if (audioEngine) audioEngine.seek(0);
  }
  isPlaying = nextState;
  lastWallMs = performance.now();
  const btn = document.getElementById('btn-play');
  if (btn) btn.textContent = isPlaying ? '暂停 ⏸' : '播放 ▶';

  if (audioEngine) {
    if (isPlaying) {
      audioEngine.play(currentT).catch((err) => {
        console.warn('[audio] play warning:', err);
      });
    } else if (!opts.fromEnded) {
      audioEngine.pause();
    }
  }
}

function updatePreviewHUD(beatState) {
  const scrubber = document.getElementById('scrubber');
  const timeEl = document.getElementById('time-readout');
  const badgeEl = document.getElementById('era-badge');
  if (scrubber && document.activeElement !== scrubber) {
    scrubber.value = beatState.t.toFixed(3);
  }
  if (timeEl) {
    timeEl.textContent = `${formatMMSS(beatState.t / PLAYBACK_SPEED)} / ${formatMMSS(REAL_DURATION)}`;
  }
  if (badgeEl) {
    if (beatState.section === 'intro') {
      badgeEl.textContent = 'Intro · 奶蛙骑行艺术通史';
    } else if (beatState.section === 'outro') {
      badgeEl.textContent = 'Outro · 奶蛙新闻发布会（20 份答卷）';
    } else if (beatState.scene) {
      const s = beatState.scene;
      badgeEl.textContent = `#${String(s.num).padStart(2, '0')} ${s.zh} (${s.era}) · 第${beatState.barInScene + 1}小节`;
    }
  }
}

function initPreviewControls() {
  const btn = document.getElementById('btn-play');
  const scrubber = document.getElementById('scrubber');
  const jump = document.getElementById('scene-jump');
  const muteBtn = document.getElementById('btn-mute');
  const volSlider = document.getElementById('volume-slider');
  const fsBtn = document.getElementById('btn-fullscreen');
  const stageWrap = document.getElementById('stage-wrap');

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }
  if (fsBtn) {
    fsBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', () => {
      fsBtn.textContent = document.fullscreenElement ? '⛶ 退出全屏' : '⛶ 全屏';
    });
  }
  if (stageWrap) {
    stageWrap.addEventListener('click', () => setPlaying(!isPlaying));
  }

  if (jump) {
    const optIntro = document.createElement('option');
    optIntro.value = '0';
    optIntro.textContent = '00 · Intro (00:00.0)';
    jump.appendChild(optIntro);

    for (const s of SCENES) {
      const opt = document.createElement('option');
      opt.value = String(s.t0);
      opt.textContent = `${String(s.num).padStart(2, '0')} · ${s.zh} (${formatMMSS(s.t0 / PLAYBACK_SPEED)})`;
      jump.appendChild(opt);
    }

    const optOutro = document.createElement('option');
    optOutro.value = '125';
    optOutro.textContent = `21 · Outro 奶蛙发布会 (${formatMMSS(125 / PLAYBACK_SPEED)})`;
    jump.appendChild(optOutro);

    jump.addEventListener('change', () => {
      const targetT = parseFloat(jump.value) || 0;
      window.renderAt(targetT);
    });
  }

  if (btn) {
    btn.addEventListener('click', () => setPlaying(!isPlaying));
  }
  if (scrubber) {
    scrubber.max = String(TOTAL_DURATION);
    scrubber.addEventListener('input', () => {
      if (isPlaying) setPlaying(false);
      window.renderAt(parseFloat(scrubber.value) || 0);
    });
  }
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      if (!audioEngine) return;
      audioEngine.toggleMute();
      updateAudioHUD();
    });
  }
  if (volSlider) {
    volSlider.addEventListener('input', () => {
      if (!audioEngine) return;
      const v = parseFloat(volSlider.value);
      audioEngine.setVolume(Number.isFinite(v) ? v : 0.9);
      if (v <= 0.001) audioEngine.setMuted(true);
      updateAudioHUD();
    });
  }
  window.addEventListener('keydown', (e) => {
    const tag = e.target?.tagName;
    const inFormControl = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
    if (e.code === 'Space' && !inFormControl) {
      e.preventDefault();
      setPlaying(!isPlaying);
    } else if (e.code === 'KeyF' && !inFormControl && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      toggleFullscreen();
    } else if (e.code === 'KeyM' && !inFormControl) {
      e.preventDefault();
      if (audioEngine) {
        audioEngine.toggleMute();
        updateAudioHUD();
      }
    } else if (e.code === 'ArrowRight' && !inFormControl) {
      e.preventDefault();
      const target = clamp(currentT + (e.shiftKey ? 2.0 : 0.5), 0, TOTAL_DURATION);
      if (isPlaying) {
        currentT = target;
        audioEngine?.seek(target);
      } else {
        window.renderAt(target);
      }
    } else if (e.code === 'ArrowLeft' && !inFormControl) {
      e.preventDefault();
      const target = clamp(currentT - (e.shiftKey ? 2.0 : 0.5), 0, TOTAL_DURATION);
      if (isPlaying) {
        currentT = target;
        audioEngine?.seek(target);
      } else {
        window.renderAt(target);
      }
    }
  });
}

boot();
