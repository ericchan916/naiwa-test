// src/rig/pelican.js
// Parametric skeletal & anatomical rig for Naiwa (`呆滞大肚版奶龙 / 奶蛙`) + High-Visibility Bicycle
// with exact analytical two-bone leg IK and 0.0px grounded wheel contact.
// Preserves full backward-compatible joint aliases across all 20 era scenes & transitions.

/**
 * Solves 2D two-bone analytical IK from `root` to `target` with limb lengths `L1`, `L2`.
 * `bendSign` (-1 bends cyclist knee forward +X in Canvas2D +Y-down coords) without frame popping.
 */
export function solveTwoBoneIK(rx, ry, tx, ty, L1, L2, bendSign = -1) {
  let dx = tx - rx;
  let dy = ty - ry;
  let d = Math.hypot(dx, dy);
  const minD = Math.abs(L1 - L2) + 1e-3;
  const maxD = L1 + L2 - 1e-3;
  if (d < minD) d = minD;
  if (d > maxD) {
    const k = maxD / d;
    dx *= k;
    dy *= k;
    d = maxD;
  }
  const cosA = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
  const clampedCos = Math.max(-1, Math.min(1, cosA));
  const angleBase = Math.atan2(dy, dx);
  const angleOffset = bendSign * Math.acos(clampedCos);
  const kneeAngle = angleBase + angleOffset;
  return {
    x: rx + L1 * Math.cos(kneeAngle),
    y: ry + L1 * Math.sin(kneeAngle),
    hipAngle: kneeAngle,
  };
}

/**
 * Computes full deterministic joint & contour rig for Naiwa + Bicycle at `(x, groundY)`.
 */
export function computePelicanRig({
  x = 500,
  y = 680,
  pedalAngle = 0,
  wheelAngle = null,
  scale = 1.0,
  slope = 0,
  speedScale = 1.0,
  poseMode = 'normal',
  lissajousMix = 0,
  time = 0,
} = {}) {
  const wheelR = 46;
  const wAngle = wheelAngle !== null ? wheelAngle : x / wheelR;

  // Subtle 1-per-beat saddle bounce & elastic potbelly jiggle
  const motionAmp = Math.min(1.2, Math.max(0.08, speedScale));
  const bob = -3.1 * Math.sin(2 * pedalAngle) * motionAmp;
  const bellyJiggle = 2.8 * Math.sin(2 * pedalAngle - 0.85) * motionAmp;
  const nod = 0.028 * Math.sin(2 * pedalAngle - 0.4) * motionAmp;
  const tailWag = 2.4 * Math.sin(2 * pedalAngle - 1.1) * motionAmp;

  // Exact 0.0px grounded wheel centers relative to ground origin (0, 0), facing +X:
  const rearWheel = { x: -86, y: -wheelR, r: wheelR, angle: wAngle };
  const frontWheel = { x: 86, y: -wheelR, r: wheelR, angle: wAngle };
  const bb = { x: -8, y: -wheelR }; // Bottom bracket
  const crankR = 21;

  const rightPedal = {
    x: bb.x + crankR * Math.cos(pedalAngle),
    y: bb.y + crankR * Math.sin(pedalAngle),
  };
  const leftPedal = {
    x: bb.x - crankR * Math.cos(pedalAngle),
    y: bb.y - crankR * Math.sin(pedalAngle),
  };

  // Classic diamond frame + HIGH-VISIBILITY gooseneck stem & 3/4 dual-horn riser handlebars
  // Positioned cleanly ahead of Naiwa's potbelly (belly front ~ x=+13, handlebars at x=+39..+59!)
  const seatCluster = { x: -36, y: -108 };
  const saddle = { x: -40, y: -115 };
  const headTop = { x: 58, y: -113 };
  const headBot = { x: 64, y: -90 };
  const stemTop = { x: 58, y: -139 };
  const barRiser = { x: 50, y: -148 };
  const handleGrip = { x: 39, y: -142 }; // Near rubber grip wrapped by Naiwa's 4-fingered hand
  const farGrip = { x: 47, y: -151 };    // Far 3/4 handlebar grip horn clearly visible!
  const brakeTip = { x: 50, y: -134 };   // Front brake lever
  const bellPos = { x: 56, y: -145 };    // Handlebar brass bell

  // Naiwa (`呆滞大肚版奶龙 / 奶蛙`) pear-gourd anatomy
  const isEgypt = poseMode === 'egypt_freeze';
  const hip = { x: -37, y: -123 + bob };
  const bodyCenter = {
    x: -25,
    y: -146 + bob,
    rx: 38,
    ry: 34,
    tilt: -0.06,
  };
  const bellyPatch = {
    x: -13,
    y: -145 + bob + bellyJiggle * 0.45,
    rx: 25,
    ry: 27,
  };
  // Low, plump upturned stubby dinosaur tail
  const tailBase = { x: -58, y: -132 + bob * 0.85 };
  const tailTip = { x: -83, y: -139 + bob * 0.75 + tailWag };

  // Seamless pear upper-torso / neckless transition into rounded dome head
  const chest = { x: -10, y: -170 + bob };
  const neckC1 = { x: -15, y: -179 + bob };
  const neckC2 = { x: -19, y: -189 + bob * 1.03 };
  const head = {
    x: isEgypt ? -20 : -22,
    y: -198 + bob * 1.06,
    r: 21.0,
    angle: isEgypt ? 0 : nod,
  };

  // Side-3/4 Dual Bulging Sage-Green Frog Eyes + Snub Lip + Flat Deadpan Mouth `—` + Throat Tuck
  const farEye = {
    x: head.x + 18.8,
    y: head.y - 5.6 + Math.sin(head.angle) * 4,
    rx: 5.0,
    ry: 6.3,
  };
  const nearEye = {
    x: head.x + 7.2,
    y: head.y - 4.8 + Math.sin(head.angle) * 2,
    rx: 6.8,
    ry: 7.2,
  };
  const snubLip = {
    x: head.x + 21.8,
    y: head.y + 4.4 + Math.sin(head.angle) * 6,
  };
  const mouthStart = {
    x: head.x + 10.2,
    y: head.y + 5.8 + Math.sin(head.angle) * 4,
  };
  const mouthEnd = {
    x: head.x + 21.4,
    y: head.y + 5.5 + Math.sin(head.angle) * 6,
  };
  const throatTuck = {
    x: head.x + 14.2,
    y: head.y + 13.8 + Math.sin(head.angle) * 4,
  };

  // Plump arms emerging outside the cream belly & reaching cleanly to the handlebars
  const farShoulder = { x: -14, y: -172 + bob };
  const farElbow = { x: 14, y: -160 + bob * 0.7 };
  const farHand = { x: farGrip.x - 1, y: farGrip.y + 1 };

  const wingShoulder = { x: -27, y: -166 + bob };
  const wingElbow = { x: 3, y: -152 + bob * 0.65 };
  const wingTip = { x: handleGrip.x, y: handleGrip.y + 1 };

  // Backward-compatible aliases so legacy scene code (e.g. #02 cubit check, #14 plasma, #20 Bezier handle)
  // anchors naturally onto Naiwa's snub nose and elastic potbelly!
  const beakUpperBase = { x: head.x + 15, y: head.y + 0.5 };
  const beakLowerBase = throatTuck;
  const beakTip = snubLip;
  const pouchBelly = {
    x: bellyPatch.x + 24,
    y: bellyPatch.y + 4 + bellyJiggle,
  };
  const crest1 = { x: head.x - 16, y: head.y - 11 - 1.5 * Math.sin(time * 8) };
  const crest2 = { x: head.x - 20, y: head.y - 4 - 1.5 * Math.cos(time * 8) };

  // Analytical two-bone leg IK to left & right pedals (forward knee bend!)
  const footPadOffsetY = -5;
  const leftHipLocal = { x: hip.x + 4, y: hip.y + 4 };
  const rightHipLocal = { x: hip.x - 2, y: hip.y + 5 };
  const leftKnee = solveTwoBoneIK(
    leftHipLocal.x,
    leftHipLocal.y,
    leftPedal.x,
    leftPedal.y + footPadOffsetY,
    49,
    51,
    -1
  );
  const rightKnee = solveTwoBoneIK(
    rightHipLocal.x,
    rightHipLocal.y,
    rightPedal.x,
    rightPedal.y + footPadOffsetY,
    49,
    51,
    -1
  );

  const cosS = Math.cos(slope) * scale;
  const sinS = Math.sin(slope) * scale;
  const xf = (pt) => {
    let px = pt.x;
    let py = pt.y;
    if (lissajousMix > 0.001) {
      const ph = time * 14 + px * 0.045 + py * 0.035;
      const lx = 115 * Math.sin(3 * time * 5.0 + px * 0.03);
      const ly = 115 * Math.sin(4 * time * 5.0 + py * 0.03 + 0.9) - 115;
      px = px * (1 - lissajousMix) + lx * lissajousMix + Math.sin(ph) * 6 * lissajousMix;
      py = py * (1 - lissajousMix) + ly * lissajousMix;
    }
    return {
      ...pt,
      x: x + px * cosS - py * sinS,
      y: y + px * sinS + py * cosS,
    };
  };

  return {
    root: { x, y, scale, slope },
    poseMode,
    pedalAngle,
    wheelAngle: wAngle,
    bellyJiggle,
    time,
    rearWheel: { ...xf(rearWheel), r: wheelR * scale },
    frontWheel: { ...xf(frontWheel), r: wheelR * scale },
    bb: xf(bb),
    leftPedal: xf(leftPedal),
    rightPedal: xf(rightPedal),
    seatCluster: xf(seatCluster),
    saddle: xf(saddle),
    headTop: xf(headTop),
    headBot: xf(headBot),
    stemTop: xf(stemTop),
    barRiser: xf(barRiser),
    handleGrip: xf(handleGrip),
    farGrip: xf(farGrip),
    brakeTip: xf(brakeTip),
    bellPos: xf(bellPos),
    hip: xf(hip),
    bodyCenter: {
      ...xf(bodyCenter),
      rx: bodyCenter.rx * scale,
      ry: bodyCenter.ry * scale,
      tilt: bodyCenter.tilt + slope,
    },
    bellyPatch: {
      ...xf(bellyPatch),
      rx: bellyPatch.rx * scale,
      ry: bellyPatch.ry * scale,
    },
    tailBase: xf(tailBase),
    tailTip: xf(tailTip),
    chest: xf(chest),
    neckC1: xf(neckC1),
    neckC2: xf(neckC2),
    head: { ...xf(head), r: head.r * scale, angle: head.angle + slope },
    farEye: { ...xf(farEye), rx: farEye.rx * scale, ry: farEye.ry * scale },
    nearEye: { ...xf(nearEye), rx: nearEye.rx * scale, ry: nearEye.ry * scale },
    snubLip: xf(snubLip),
    mouthStart: xf(mouthStart),
    mouthEnd: xf(mouthEnd),
    throatTuck: xf(throatTuck),
    farShoulder: xf(farShoulder),
    farElbow: xf(farElbow),
    farHand: xf(farHand),
    beakUpperBase: xf(beakUpperBase),
    beakLowerBase: xf(beakLowerBase),
    beakTip: xf(beakTip),
    pouchBelly: xf(pouchBelly),
    crest1: xf(crest1),
    crest2: xf(crest2),
    wingShoulder: xf(wingShoulder),
    wingElbow: xf(wingElbow),
    wingTip: xf(wingTip),
    leftHip: xf(leftHipLocal),
    rightHip: xf(rightHipLocal),
    leftKnee: xf(leftKnee),
    rightKnee: xf(rightKnee),
    leftFoot: xf({ x: leftPedal.x, y: leftPedal.y + footPadOffsetY }),
    rightFoot: xf({ x: rightPedal.x, y: rightPedal.y + footPadOffsetY }),
  };
}

/**
 * Draws Naiwa (`呆滞大肚版奶龙 / 奶蛙`) + High-Visibility Bicycle on a 2D `CanvasRenderingContext2D`.
 * Supports archival sepia sketch (Intro), pre-frame entry, outro corridor streak, shadow mode, & wireframe.
 */
export function drawRig2D(ctx, rig, style = {}) {
  const s = rig.root.scale;
  const {
    silhouetteColor = null,
    wireframeColor = null,
    bodyFill = style.featherFill === 'transparent' ? 'transparent' : (style.bodyFill || '#f4be3c'),
    bodyShade = style.bodyShade || '#df961f',
    bellyFill = style.featherFill === 'transparent' ? 'transparent' : (style.bellyFill || '#f7e6be'),
    eyeSclera = style.eyeSclera || '#8bb58e',
    eyePupil = style.eyePupil || '#121614',
    pawFill = style.pawFill || '#4a3b28',
    frameStroke = '#b63b2e',
    metalStroke = '#3a3835',
    tireStroke = '#23211f',
    inkOutline = '#1d1b18',
    lineScale = 1.0,
    eyeMode = rig.poseMode === 'bada_eye' ? 'bada' : 'normal',
    sketchMode = style.featherFill === 'transparent',
  } = style;

  // If caller passed sepia manuscript palette (e.g. Intro sketch), harmonize Naiwa's warm tones
  const isManuscript = Boolean(style.featherFill && style.featherFill !== '#f8f5ec' && !style.bodyFill);
  const effBodyFill = sketchMode
    ? 'transparent'
    : isManuscript
      ? '#ead08f'
      : bodyFill;
  const effBodyShade = isManuscript ? '#c99e52' : bodyShade;
  const effBellyFill = sketchMode
    ? 'transparent'
    : isManuscript
      ? '#f5ebd2'
      : bellyFill;
  const effEyeSclera = sketchMode ? 'transparent' : isManuscript ? '#9ab696' : eyeSclera;
  const effPawFill = sketchMode ? 'transparent' : isManuscript ? '#59452f' : pawFill;

  const isSil = Boolean(silhouetteColor);
  const isWire = Boolean(wireframeColor);
  const strokeMain = isWire ? wireframeColor : isSil ? silhouetteColor : inkOutline;
  const lw = (w) => Math.max(0.75, w * s * lineScale);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const drawWheel = (w) => {
    ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : metalStroke;
    ctx.lineWidth = lw(isWire ? 1.4 : 1.35);
    const numSpokes = 12;
    for (let i = 0; i < numSpokes; i++) {
      const a = w.angle + (i * Math.PI * 2) / numSpokes;
      ctx.beginPath();
      ctx.moveTo(w.x, w.y);
      ctx.lineTo(w.x + Math.cos(a) * (w.r - 3 * s), w.y + Math.sin(a) * (w.r - 3 * s));
      ctx.stroke();
    }
    if (!isSil && !isWire && !sketchMode) {
      ctx.strokeStyle = '#cfc8b8';
      ctx.lineWidth = lw(3.0);
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r - 2.6 * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : tireStroke;
    ctx.lineWidth = lw(isWire ? 2.6 : 4.8);
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = strokeMain;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 4.2 * s, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawPlumpLeg = (hipPt, kneePt, footPt, pedalPt, isFar = false) => {
    // Crank arm + pedal spindle collar
    ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : metalStroke;
    ctx.lineWidth = lw(3.4);
    ctx.beginPath();
    ctx.moveTo(rig.bb.x, rig.bb.y);
    ctx.lineTo(pedalPt.x, pedalPt.y);
    ctx.stroke();

    // Seamless single-surface leg -> rounded golden heel (`金黄脚跟一体成形`) -> airbrushed 3-toed foot!
    const dx1 = kneePt.x - hipPt.x;
    const dy1 = kneePt.y - hipPt.y;
    const l1 = Math.hypot(dx1, dy1) || 1;
    const nx1 = (-dy1 / l1) * 9.0 * s;
    const ny1 = (dx1 / l1) * 9.0 * s;

    const dx2 = footPt.x - kneePt.x;
    const dy2 = footPt.y - kneePt.y;
    const l2 = Math.hypot(dx2, dy2) || 1;
    const nx2 = (-dy2 / l2) * 5.2 * s;
    const ny2 = (dx2 / l2) * 5.2 * s;

    const traceUnifiedLegFoot = (openTopHip = false) => {
      ctx.beginPath();
      if (openTopHip) {
        // Start slightly below hip socket so ZERO closed ring cuts across the hip/belly!
        ctx.moveTo(
          hipPt.x + nx1 * 0.92 + dx1 * 0.14,
          hipPt.y + ny1 * 0.92 + dy1 * 0.14
        );
      } else {
        ctx.moveTo(hipPt.x + nx1, hipPt.y + ny1);
      }
      // Front thigh -> rounded knee -> front shin -> smooth instep arch -> 3 rounded dinosaur toes
      ctx.quadraticCurveTo(
        kneePt.x + nx1 * 0.82,
        kneePt.y + ny1 * 0.82,
        footPt.x + 2.5 * s,
        footPt.y - 2.2 * s
      );
      ctx.quadraticCurveTo(footPt.x + 9.5 * s, footPt.y - 2.4 * s, footPt.x + 15.2 * s, footPt.y + 1.4 * s);
      ctx.quadraticCurveTo(footPt.x + 16.0 * s, footPt.y + 3.2 * s, footPt.x + 12.6 * s, footPt.y + 4.3 * s);
      ctx.quadraticCurveTo(footPt.x + 15.4 * s, footPt.y + 5.6 * s, footPt.x + 13.8 * s, footPt.y + 6.6 * s);
      ctx.quadraticCurveTo(footPt.x + 11.2 * s, footPt.y + 7.6 * s, footPt.x + 7.5 * s, footPt.y + 7.2 * s);
      // Plantar sole -> smooth rounded golden heel (`脚跟圆润过渡回小腿肚`) -> calf -> back of thigh!
      ctx.lineTo(footPt.x - 3.8 * s, footPt.y + 6.4 * s);
      ctx.quadraticCurveTo(
        footPt.x - 7.8 * s,
        footPt.y + 5.6 * s,
        footPt.x - nx2 * 0.88 - 1.2 * s,
        footPt.y - ny2 * 0.88 - 2.2 * s
      );
      if (openTopHip) {
        ctx.quadraticCurveTo(
          kneePt.x - nx1 * 0.72,
          kneePt.y - ny1 * 0.72,
          hipPt.x - nx1 * 0.88 + dx1 * 0.22,
          hipPt.y - ny1 * 0.88 + dy1 * 0.22
        );
      } else {
        ctx.quadraticCurveTo(
          kneePt.x - nx1 * 0.72,
          kneePt.y - ny1 * 0.72,
          hipPt.x - nx1,
          hipPt.y - ny1
        );
        ctx.closePath();
      }
    };

    if (!isWire && !sketchMode) {
      traceUnifiedLegFoot(false);
      if (isSil) {
        ctx.fillStyle = silhouetteColor;
      } else {
        // Golden yellow from hip through calf AND entire heel (`stop 0.62`), airbrushed into dark umber ONLY on front toes!
        const baseSkin = isFar ? effBodyShade : effBodyFill;
        const lg = ctx.createLinearGradient(
          footPt.x - 5.5 * s,
          footPt.y - 3 * s,
          footPt.x + 14.5 * s,
          footPt.y + 5 * s
        );
        lg.addColorStop(0.0, baseSkin);
        lg.addColorStop(0.32, baseSkin);
        lg.addColorStop(0.76, effPawFill);
        lg.addColorStop(1.0, effPawFill);
        ctx.fillStyle = lg;
      }
      ctx.fill();
    }

    // Open contour stroke (fuses seamlessly into lower torso/rump with zero hip ring & zero heel cut!)
    ctx.strokeStyle = strokeMain;
    ctx.lineWidth = lw(2.1);
    traceUnifiedLegFoot(!isWire);
    ctx.stroke();

    // Detailed mechanical pedal cage & spindle bearing
    ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : metalStroke;
    ctx.lineWidth = lw(3.6);
    ctx.beginPath();
    ctx.moveTo(pedalPt.x - 9.0 * s, pedalPt.y + 2.4 * s);
    ctx.lineTo(pedalPt.x + 9.0 * s, pedalPt.y + 2.4 * s);
    ctx.stroke();
  };

  // 0. Far Arm reaching to far handlebar horn + Far Handlebar Horn
  ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : metalStroke;
  ctx.lineWidth = lw(3.4);
  ctx.beginPath();
  ctx.moveTo(rig.stemTop.x, rig.stemTop.y);
  ctx.quadraticCurveTo(rig.stemTop.x - 2 * s, rig.farGrip.y - 3 * s, rig.farGrip.x, rig.farGrip.y);
  ctx.stroke();
  // Dark grip on far horn
  ctx.strokeStyle = strokeMain;
  ctx.lineWidth = lw(5.2);
  ctx.beginPath();
  ctx.moveTo(rig.farGrip.x + 4 * s, rig.farGrip.y - 1.5 * s);
  ctx.lineTo(rig.farGrip.x - 4 * s, rig.farGrip.y + 1 * s);
  ctx.stroke();

  // Far arm (golden-shaded)
  ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : effBodyShade;
  ctx.lineWidth = lw(9.5);
  ctx.beginPath();
  ctx.moveTo(rig.farShoulder.x, rig.farShoulder.y);
  ctx.quadraticCurveTo(rig.farElbow.x, rig.farElbow.y, rig.farHand.x, rig.farHand.y);
  ctx.stroke();
  if (!isSil && !isWire) {
    ctx.strokeStyle = strokeMain;
    ctx.lineWidth = lw(1.8);
    ctx.stroke();
  }
  ctx.fillStyle = isWire ? 'transparent' : isSil ? silhouetteColor : effPawFill;
  ctx.beginPath();
  ctx.arc(rig.farHand.x, rig.farHand.y, 4.6 * s, 0, Math.PI * 2);
  if (!isWire && !sketchMode) ctx.fill();
  ctx.stroke();

  // 1. Far Leg & Crank
  drawPlumpLeg(rig.leftHip, rig.leftKnee, rig.leftFoot, rig.leftPedal, true);

  // 2. Grounded Wheels
  drawWheel(rig.rearWheel);
  drawWheel(rig.frontWheel);

  // 3. Chainring & Chain
  ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : metalStroke;
  ctx.lineWidth = lw(1.8);
  ctx.beginPath();
  ctx.arc(rig.bb.x, rig.bb.y, 12 * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y - 5 * s);
  ctx.lineTo(rig.bb.x, rig.bb.y - 12 * s);
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y + 5 * s);
  ctx.lineTo(rig.bb.x, rig.bb.y + 12 * s);
  ctx.stroke();

  // 4. Diamond Bicycle Frame + Fork
  ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : frameStroke;
  ctx.lineWidth = lw(4.6);
  ctx.beginPath();
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y);
  ctx.lineTo(rig.seatCluster.x, rig.seatCluster.y);
  ctx.lineTo(rig.bb.x, rig.bb.y);
  ctx.closePath();
  ctx.moveTo(rig.seatCluster.x, rig.seatCluster.y);
  ctx.lineTo(rig.headTop.x, rig.headTop.y);
  ctx.lineTo(rig.headBot.x, rig.headBot.y);
  ctx.lineTo(rig.bb.x, rig.bb.y);
  ctx.moveTo(rig.headTop.x, rig.headTop.y);
  ctx.lineTo(rig.headBot.x, rig.headBot.y);
  ctx.lineTo(rig.frontWheel.x, rig.frontWheel.y);
  ctx.stroke();

  // Seatpost & Saddle
  ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : metalStroke;
  ctx.lineWidth = lw(3.6);
  ctx.beginPath();
  ctx.moveTo(rig.seatCluster.x, rig.seatCluster.y);
  ctx.lineTo(rig.saddle.x, rig.saddle.y);
  ctx.stroke();

  ctx.strokeStyle = strokeMain;
  ctx.lineWidth = lw(5.8);
  ctx.beginPath();
  ctx.moveTo(rig.saddle.x - 14 * s, rig.saddle.y);
  ctx.lineTo(rig.saddle.x + 12 * s, rig.saddle.y + 1 * s);
  ctx.stroke();

  // 5. Naiwa Seamless Pear/Gourd Body + Upturned Stubby Tail + Round Cream Belly
  const hd = rig.head;
  const bp = rig.bellyPatch;
  const bc = rig.bodyCenter;

  ctx.fillStyle = isWire ? 'transparent' : isSil ? silhouetteColor : effBodyFill;
  ctx.strokeStyle = strokeMain;
  ctx.lineWidth = lw(2.6);
  ctx.beginPath();
  // Start at snub upper lip -> forehead -> crown -> seamless pear back -> upturned stubby tail -> rump -> potbelly -> throat tuck!
  ctx.moveTo(rig.snubLip.x, rig.snubLip.y);
  ctx.quadraticCurveTo(hd.x + 21 * s, hd.y - 4 * s, hd.x + 13 * s, hd.y - 16 * s);
  ctx.bezierCurveTo(hd.x + 2 * s, hd.y - 24 * s, hd.x - 16 * s, hd.y - 22 * s, hd.x - 21 * s, hd.y - 6 * s);
  // Smooth neckless pear back sweeping into lower spine & upturned stubby tail
  ctx.bezierCurveTo(
    hd.x - 26 * s,
    hd.y + 18 * s,
    bc.x - 35 * s,
    bc.y - 16 * s,
    rig.tailBase.x,
    rig.tailBase.y - 4 * s
  );
  ctx.quadraticCurveTo(rig.tailTip.x + 8 * s, rig.tailTip.y - 6 * s, rig.tailTip.x, rig.tailTip.y);
  ctx.quadraticCurveTo(rig.tailTip.x + 6 * s, rig.tailTip.y + 13 * s, rig.hip.x - 16 * s, rig.hip.y + 10 * s);
  // Plump lower belly curving smoothly around to front potbelly & concave throat tuck
  ctx.bezierCurveTo(
    bc.x - 8 * s,
    bc.y + 34 * s,
    bp.x + bp.rx + 4 * s,
    bp.y + 24 * s,
    bp.x + bp.rx + 1 * s,
    bp.y - 2 * s
  );
  ctx.quadraticCurveTo(bp.x + bp.rx - 2 * s, rig.throatTuck.y + 10 * s, rig.throatTuck.x, rig.throatTuck.y);
  ctx.quadraticCurveTo(rig.snubLip.x + 1 * s, rig.snubLip.y + 5 * s, rig.snubLip.x, rig.snubLip.y);
  ctx.closePath();
  if (!isWire && !sketchMode) {
    ctx.fill();
    // Subtle warm 3D dorsal/rump shading inside golden pear body
    if (!isSil) {
      ctx.save();
      ctx.clip();
      const bg = ctx.createLinearGradient(bc.x - 36 * s, hd.y - 20 * s, bp.x + 24 * s, bc.y + 30 * s);
      bg.addColorStop(0, 'rgba(255, 244, 190, 0.25)');
      bg.addColorStop(0.55, 'rgba(244, 190, 60, 0)');
      bg.addColorStop(1, 'rgba(186, 108, 16, 0.28)');
      ctx.fillStyle = bg;
      ctx.fillRect(rig.tailTip.x - 10 * s, hd.y - 30 * s, 140 * s, 160 * s);
      ctx.restore();
    }
  }
  ctx.stroke();

  // Large Circular/Oval Warm-Cream Belly Patch (`#f7e6be`)
  if (!isSil) {
    ctx.fillStyle = isWire ? 'transparent' : effBellyFill;
    ctx.strokeStyle = isWire ? wireframeColor : 'rgba(168, 122, 42, 0.42)';
    ctx.lineWidth = lw(isWire ? 1.8 : 1.5);
    ctx.beginPath();
    ctx.ellipse(bp.x + 3 * s, bp.y + 1 * s, bp.rx * 0.92, bp.ry * 0.96, -0.10 + rig.root.slope, 0, Math.PI * 2);
    if (!isWire && !sketchMode) ctx.fill();
    ctx.stroke();
  }

  // 6. Dual Side-Visible Bulging Sage-Green Frog Eyes + Crisp Horizontal Flat Mouth `—`
  if (!isSil) {
    const drawFrogEye = (ey, isFarEye = false) => {
      ctx.fillStyle = isWire ? 'transparent' : effEyeSclera;
      ctx.strokeStyle = strokeMain;
      ctx.lineWidth = lw(1.9);
      ctx.beginPath();
      ctx.ellipse(ey.x, ey.y, ey.rx, ey.ry, (isFarEye ? 0.08 : -0.06) + rig.root.slope, 0, Math.PI * 2);
      if (!isWire && !sketchMode) ctx.fill();
      ctx.stroke();

      // Large round deep-black pupil
      const prx = ey.rx * (isFarEye ? 0.56 : 0.58);
      const pry = ey.ry * (isFarEye ? 0.58 : 0.58);
      const px = eyeMode === 'bada' ? ey.x - 0.5 * s : ey.x + (isFarEye ? 1.1 : 1.2) * s;
      const py = eyeMode === 'bada' ? ey.y - ey.ry * 0.42 : ey.y + 0.2 * s;
      ctx.fillStyle = isWire ? wireframeColor : eyePupil;
      ctx.beginPath();
      ctx.ellipse(px, py, prx, pry, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!isWire && !sketchMode && !isFarEye) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
        ctx.beginPath();
        ctx.arc(px - 1.2 * s, py - 1.5 * s, 1.15 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Far frog eye peeking past forehead contour FIRST, then near cheek frog eye
    drawFrogEye(rig.farEye, true);
    drawFrogEye(rig.nearEye, false);

    // Crisp horizontal flat deadpan mouth `—`
    ctx.strokeStyle = strokeMain;
    ctx.lineWidth = lw(2.3);
    ctx.beginPath();
    ctx.moveTo(rig.mouthStart.x, rig.mouthStart.y);
    ctx.lineTo(rig.mouthEnd.x, rig.mouthEnd.y);
    ctx.stroke();
  }

  // 7. Near Leg & Crank
  drawPlumpLeg(rig.rightHip, rig.rightKnee, rig.rightFoot, rig.rightPedal, false);

  // 8. HIGH-VISIBILITY Gooseneck Stem, Curved Riser Handlebar, Brake Lever, Bell & Near Grip!
  // Drawn in front of frame & clear of potbelly so handlebars are 100% unmistakable!
  ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : metalStroke;
  ctx.lineWidth = lw(4.2);
  ctx.beginPath();
  ctx.moveTo(rig.headTop.x, rig.headTop.y);
  ctx.lineTo(rig.stemTop.x, rig.stemTop.y);
  ctx.quadraticCurveTo(rig.barRiser.x, rig.barRiser.y, rig.handleGrip.x, rig.handleGrip.y);
  ctx.stroke();

  // Brake lever & cable arc in front of handlebar
  if (!isWire) {
    ctx.strokeStyle = isSil ? silhouetteColor : metalStroke;
    ctx.lineWidth = lw(2.0);
    ctx.beginPath();
    ctx.moveTo(rig.handleGrip.x + 4 * s, rig.handleGrip.y - 1 * s);
    ctx.lineTo(rig.brakeTip.x, rig.brakeTip.y);
    ctx.stroke();
  }

  // Brass handlebar bell dome on stem/riser
  ctx.fillStyle = isWire ? 'transparent' : isSil ? silhouetteColor : isManuscript ? '#d4b270' : '#f2c96b';
  ctx.strokeStyle = strokeMain;
  ctx.lineWidth = lw(1.6);
  ctx.beginPath();
  ctx.arc(rig.bellPos.x, rig.bellPos.y, 4.4 * s, Math.PI, 0);
  ctx.closePath();
  if (!isWire && !sketchMode) ctx.fill();
  ctx.stroke();

  // Dark rubber near handlebar grip bar
  ctx.strokeStyle = strokeMain;
  ctx.lineWidth = lw(6.0);
  ctx.beginPath();
  ctx.moveTo(rig.handleGrip.x + 6 * s, rig.handleGrip.y - 2 * s);
  ctx.lineTo(rig.handleGrip.x - 6 * s, rig.handleGrip.y + 1.5 * s);
  ctx.stroke();

  // 9. Seamless Single-Surface Near Arm -> Airbrushed Wrist -> Dark-Umber 4-Fingered Hand wrapping Grip!
  const sh = rig.wingShoulder;
  const el = rig.wingElbow;
  const wr = {
    x: rig.wingTip.x - 6.2 * s,
    y: rig.wingTip.y + 0.8 * s,
  };

  // Fill seamless shoulder-to-hand silhouette (broad overlap at shoulder merges 100% smoothly into golden torso!)
  if (!isWire && !sketchMode) {
    ctx.beginPath();
    ctx.moveTo(sh.x - 8 * s, sh.y - 7.5 * s);
    ctx.quadraticCurveTo(el.x + 2 * s, el.y - 8.2 * s, rig.wingTip.x + 4.2 * s, rig.wingTip.y - 3.6 * s);
    ctx.quadraticCurveTo(rig.wingTip.x + 6.0 * s, rig.wingTip.y + 1.2 * s, rig.wingTip.x - 1.5 * s, rig.wingTip.y + 5.2 * s);
    ctx.quadraticCurveTo(el.x - 3 * s, el.y + 9.2 * s, sh.x - 7 * s, sh.y + 9.5 * s);
    ctx.closePath();

    if (isSil) {
      ctx.fillStyle = silhouetteColor;
    } else {
      const ag = ctx.createLinearGradient(el.x + 2 * s, el.y, rig.wingTip.x + 2 * s, rig.wingTip.y);
      ag.addColorStop(0.0, effBodyFill);
      ag.addColorStop(0.45, effBodyFill);
      ag.addColorStop(0.86, effPawFill);
      ag.addColorStop(1.0, effPawFill);
      ctx.fillStyle = ag;
    }
    ctx.fill();
  }

  // Open anatomical contour: starts ONLY past the upper-front elbow & short inner armpit crease (ZERO shoulder ring & ZERO wrist cut!)
  ctx.strokeStyle = strokeMain;
  ctx.lineWidth = lw(2.15);
  ctx.beginPath();
  ctx.moveTo(sh.x + 6.5 * s, sh.y - 5.2 * s);
  ctx.quadraticCurveTo(el.x + 2.5 * s, el.y - 7.8 * s, wr.x + 4.5 * s, wr.y - 4.4 * s);
  ctx.moveTo(wr.x + 2.5 * s, wr.y + 4.6 * s);
  ctx.quadraticCurveTo(el.x - 2.5 * s, el.y + 8.8 * s, sh.x + 2.5 * s, sh.y + 8.4 * s);
  ctx.stroke();

  if (!isSil && !isWire) {
    // 4 sculpted rounded dark-umber fingers curling around handlebar grip
    ctx.fillStyle = effPawFill;
    ctx.lineWidth = lw(1.55);
    for (let f = 0; f < 4; f++) {
      const fx = rig.wingTip.x + (3.4 - f * 2.2) * s;
      const fy = rig.wingTip.y + (-1.8 + f * 1.05) * s;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 2.15 * s, 3.1 * s, 0.24, 0, Math.PI * 2);
      if (!sketchMode) ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}
