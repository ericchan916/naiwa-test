// src/rig/naiwa.js
// Upgraded Real-Time WebGL2 3D Sculpted SDF Raymarcher + 20-Era Native Artistic Medium Engine
// & Seamless-Anatomy Vector Toolkit for Naiwa (`呆滞大肚版奶龙 / 奶蛙`) + Precision 3D Bicycle Cockpit.
//
// Key Modeling & Artistic Upgrades:
//   1. True 3D Volumetric `smin`-Metaball Anatomy (704x704 supersampled orthographic WebGL2 FBO
//      locked at 0.00px mathematical identity to `computePelicanRig` wheel/pedal/grip coordinates).
//   2. Zero Joint Seams (`手臂和脚跟与身体的分界彻底自然融合`):
//      - Smooth continuous `smin` fusion across outer shoulders & hips (unified `MAT_BODY`, zero
//        closed joint rings; natural 3D depth/AO creases only where forearm overlaps belly or inner groin).
//      - Entire ankle & rounded calcaneus heel (`脚跟`) remain 100% golden yellow continuous with
//        the calf, airbrushing smoothly into matte dark-umber (`#3e3020`) ONLY across the front
//        instep & 3 plump dinosaur toes; wrists airbrush smoothly into 4 sculpted fingers + thumb.
//   3. Finer 3D Sculptural Details (`所有建模再更精细一版`):
//      - Sculpted 3D upper/lower sage-green eyelid cuffs cradling glossy wet eyeballs + dual catchlights,
//        forward snub upper lip, recessed deadpan mouth groove (`—`) with corner dimples, feathered
//        warm-cream belly patch, and multi-component 3D riser handlebars (headset locknut, quill stem,
//        forged clamp + hex bolt, contoured leather grips + end-caps, brake lever + cable, spun-brass bell).
//   4. Preserves & Enhances All 20 Era Stylizations (`保留这一版更好的风格化`) with `'back'` / `'front'`
//      depth sandwiching around every scene's authentic period bicycle!

// ============================================================================
// WebGL2 3D Sculpted SDF Raymarcher + 20-Era Native Medium Shader Engine
// ============================================================================

const GL_SIZE = 704;
// Orthographic box in rig-local units (`1.0` = `100` rig px, `+X` right, `+Y` UP from ground):
// X in [-1.42, +1.18] (width 2.60 -> -142px..+118px), Y in [+0.02, +2.62] (height 2.60 -> -262px..-2px)
const BOX_X0 = -1.42;
const BOX_Y0 = 0.02;
const BOX_SPAN = 2.60;

const VERT_3D_SRC = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

// Pass 1: 3D Sculpted SDF Raymarcher -> 3x RGBA8 MRT G-Buffer
//   outAlbedo  : rgb = base material albedo, a = coverage
//   outNormDep : rgb = view-space normal * 0.5 + 0.5, a = normalized Z depth
//   outMatInfo : r = matId / 16.0, g = AO, b = bellyOrPatternMask, a = eyelidOrRim
const PASS1_3D_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
layout(location = 0) out vec4 outAlbedo;
layout(location = 1) out vec4 outNormDep;
layout(location = 2) out vec4 outMatInfo;

uniform int   uEra;
uniform int   uLayer; // 0 = all, 1 = back (far limbs + far bar), 2 = front (body + near limbs + near bar)
uniform float uTime;

// Exact 2D rig-local landmarks (in 100px units, +Y UP) from computePelicanRig:
uniform vec2 uHead;
uniform vec2 uSnubLip;
uniform vec2 uThroatTuck;
uniform vec2 uMouthStart;
uniform vec2 uMouthEnd;
uniform vec2 uNearEye;
uniform vec2 uFarEye;
uniform vec2 uBodyCenter;
uniform vec2 uBellyPatch;
uniform vec2 uBellyRad;
uniform vec2 uHip;
uniform vec2 uTailBase;
uniform vec2 uTailTip;

uniform vec2 uNearShoulder;
uniform vec2 uNearElbow;
uniform vec2 uNearHand;
uniform vec2 uFarShoulder;
uniform vec2 uFarElbow;
uniform vec2 uFarHand;

uniform vec2 uRightHip;
uniform vec2 uRightKnee;
uniform vec2 uRightFoot;
uniform vec2 uRightPedal;
uniform vec2 uLeftHip;
uniform vec2 uLeftKnee;
uniform vec2 uLeftFoot;
uniform vec2 uLeftPedal;

uniform vec2 uHeadTop;
uniform vec2 uStemTop;
uniform vec2 uBarRiser;
uniform vec2 uHandleGrip;
uniform vec2 uFarGrip;
uniform vec2 uBrakeTip;
uniform vec2 uBellPos;

// Material IDs (NO artificial MAT_LIMB split -> zero shoulder/hip/heel seam lines!)
const float MAT_NONE       = 0.0;
const float MAT_BODY       = 1.0; // Unified golden skin, limbs, heels, & airbrushed paws
const float MAT_EYE_IRIS   = 3.0; // Bulging sage-green frog iris / sclera
const float MAT_EYE_PUPIL  = 4.0; // Deep glossy black pupil
const float MAT_MOUTH      = 5.0; // Recessed deadpan mouth groove
const float MAT_BIKE_METAL = 8.0; // Stem, clamp, riser bar, brake lever
const float MAT_BIKE_GRIP  = 7.0; // Contoured leather/rubber grip & cable
const float MAT_BIKE_BELL  = 10.0;// Spun-brass bell dome & gold accents
const float MAT_GARMENT1   = 9.0; // Era hats / crowns / sashes
const float MAT_CLAW       = 11.0;// Tiny rounded keratin toe-tips

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / max(k, 1e-4), 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float smax(float a, float b, float k) {
  return -smin(-a, -b, k);
}

float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdEllipsoid(vec3 p, vec3 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / max(k1, 1e-4);
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

vec2 sdTaperedCapsule(vec3 p, vec3 a, vec3 b, float ra, float rb) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return vec2(length(pa - ba * h) - mix(ra, rb, h), h);
}

float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

// Evaluates sculpted leg + GOLDEN HEEL + airbrushed 3-toed dinosaur foot:
// Returns vec3(d, pawDarkMix, dClaws)
vec3 evalSeamlessLegAndFoot(vec3 p, vec3 hp, vec3 kn, vec3 ft, vec3 pd, float zSign) {
  vec3 ak = ft + vec3(-0.032, 0.036, 0.0);
  vec2 thigh = sdTaperedCapsule(p, hp, kn, 0.118, 0.082);
  vec2 calf  = sdTaperedCapsule(p, kn, ak, 0.081, 0.052);
  float dLeg = smin(thigh.x, calf.x, 0.034);

  // Rounded GOLDEN calcaneus heel seamlessly continuing the back of the calf/Achilles!
  vec3 heelC = ft + vec3(-0.045, 0.012, 0.0);
  float dHeel = sdEllipsoid(p - heelC, vec3(0.046, 0.034, 0.042));
  dLeg = smin(dLeg, dHeel, 0.034);

  // Plantar arch & forefoot pad resting flat on the pedal
  vec3 archC = ft + vec3(0.032, 0.004, 0.0);
  float dFootPad = sdRoundBox(p - archC, vec3(0.068, 0.018, 0.044), 0.016);
  dLeg = smin(dLeg, dFootPad, 0.030);

  // 3 plump splayed rounded dinosaur toes + tiny keratin toe claws
  float dClaws = 1e5;
  for (int ti = -1; ti <= 1; ti++) {
    float fz = float(ti) * 0.028;
    float fxLen = (ti == 0) ? 0.138 : 0.122;
    vec3 tA = ft + vec3(0.068, 0.002, fz * 0.82);
    vec3 tB = ft + vec3(fxLen, -0.004, fz * 1.12);
    dLeg = smin(dLeg, sdTaperedCapsule(p, tA, tB, 0.021, 0.016).x, 0.014);
    dClaws = min(dClaws, sdEllipsoid(p - (tB + vec3(0.012, -0.002, 0.0)), vec3(0.010, 0.007, 0.008)));
  }

  // Airbrushed dark-umber gradient ONLY on the front instep & 3 toes;
  // ankle & entire rounded heel (p.x < ft.x - 0.005) stay 100% golden yellow!
  float fwd = p.x - (ft.x - 0.005);
  float lowMask = 1.0 - smoothstep(ft.y + 0.025, ft.y + 0.095, p.y);
  float pawMix = smoothstep(0.00, 0.105, fwd) * lowMask;
  return vec3(dLeg, pawMix, dClaws);
}

// Evaluates sculpted arm + airbrushed wrist + 4-fingered hand & thumb:
// Returns vec2(dArm, pawDarkMix)
vec2 evalSeamlessArmAndHand(vec3 p, vec3 sh, vec3 el, vec3 hd, float zSign) {
  vec3 wr = hd + vec3(-0.052, 0.010, 0.0);
  vec2 uArm = sdTaperedCapsule(p, sh, el, 0.080, 0.064);
  vec2 fArm = sdTaperedCapsule(p, el, wr, 0.063, 0.047);
  float dArm = smin(uArm.x, fArm.x, 0.028);
  float arcU = (uArm.x < fArm.x) ? (uArm.y * 0.45) : (0.45 + fArm.y * 0.55);

  // Plump rounded palm + opposing thumb + 4 distinct sculpted fingers curled over handlebar grip!
  vec3 palmC = hd + vec3(-0.010, 0.004, zSign * 0.008);
  float dPaw = sdEllipsoid(p - palmC, vec3(0.048, 0.038, 0.042));

  // Thumb tucking under grip
  vec3 thA = palmC + vec3(-0.012, -0.018, -zSign * 0.010);
  vec3 thB = palmC + vec3( 0.026, -0.026, -zSign * 0.018);
  dPaw = smin(dPaw, sdCapsule(p, thA, thB, 0.014), 0.010);

  // 4 chubby rounded fingers wrapping over top/front of grip
  for (int fi = 0; fi < 4; fi++) {
    float u = (float(fi) - 1.5) * 0.019;
    vec3 fA = hd + vec3(u * 0.65 + 0.012, 0.022 - float(fi) * 0.004, zSign * 0.012);
    vec3 fB = hd + vec3(u * 0.72 + 0.032, -0.016 - float(fi) * 0.004, -zSign * 0.014);
    dPaw = smin(dPaw, sdTaperedCapsule(p, fA, fB, 0.0145, 0.0115).x, 0.008);
  }

  float dMerged = smin(dArm, dPaw, 0.024);
  // Smooth airbrushed gradient from mid-forearm into dark-umber palm & fingers (ZERO wrist seam!)
  float wristFwd = smoothstep(wr.x - 0.095, hd.x + 0.010, p.x);
  float pawMix = clamp(max(smoothstep(0.56, 0.96, arcU), wristFwd * 0.92), 0.0, 1.0);
  return vec2(dMerged, pawMix);
}

// Evaluates BACK layer (far arm + far handlebar horn/grip + far leg/golden-heel/foot)
vec4 mapBackLayer(vec3 p) {
  float d = 1e5;
  float mat = MAT_BODY;
  float pawMix = 0.0;

  // 1. Far 3D Handlebar Horn & Flanged Leather Grip (z = -0.155)
  if (uEra != 14) {
    vec3 stem3 = vec3(uStemTop, 0.0);
    vec3 farMid = vec3(mix(uStemTop.x, uFarGrip.x, 0.45), uFarGrip.y + 0.025, -0.095);
    vec3 farG   = vec3(uFarGrip, -0.155);
    float dBarF = smin(
      sdCapsule(p, stem3, farMid, 0.019),
      sdCapsule(p, farMid, farG + vec3(-0.055, -0.012, -0.015), 0.018),
      0.014
    );
    if (dBarF < d) { d = dBarF; mat = MAT_BIKE_METAL; }

    vec3 fgA = farG + vec3( 0.038, 0.012, 0.0);
    vec3 fgB = farG + vec3(-0.058, -0.014, -0.012);
    float dGripF = sdCapsule(p, fgA, fgB, 0.028);
    dGripF = min(dGripF, sdSphere(p - fgB, 0.032));
    if (dGripF < d) { d = dGripF; mat = MAT_BIKE_GRIP; }
  }

  // 2. Far Arm + Airbrushed Dark-Umber Hand
  vec3 shF = vec3(uFarShoulder, -0.145);
  vec3 elF = vec3(uFarElbow,    -0.195);
  vec3 hdF = vec3(uFarHand,     -0.155);
  vec2 armF = evalSeamlessArmAndHand(p, shF, elF, hdF, -1.0);
  if (armF.x < d) {
    d = armF.x;
    mat = MAT_BODY;
    pawMix = armF.y;
  }

  // 3. Far Pedaling Leg + Golden Heel + 3-Toed Foot
  vec3 hpF = vec3(uLeftHip + vec2(0.0, 0.03), -0.115);
  vec3 knF = vec3(uLeftKnee,  -0.135);
  vec3 ftF = vec3(uLeftFoot,  -0.105);
  vec3 pdF = vec3(uLeftPedal, -0.105);
  vec3 legF = evalSeamlessLegAndFoot(p, hpF, knF, ftF, pdF, -1.0);
  if (legF.x < d) {
    d = legF.x;
    mat = MAT_BODY;
    pawMix = legF.y;
  }
  if (legF.z < d) {
    d = legF.z;
    mat = MAT_CLAW;
    pawMix = 1.0;
  }

  return vec4(d, mat, pawMix, 0.0);
}

// Evaluates FRONT layer (3D pear body, head, dual frog eyes + eyelid cuffs, mouth,
// era 3D headgear, near leg + golden heel, near 3D cockpit/bell/brake, near arm + 4-fingered hand)
vec4 mapFrontLayer(vec3 p, out float outEyelidMix) {
  outEyelidMix = 0.0;
  if (uEra == 13) {
    p.x += 0.018 * sin(p.y * 9.5 + uTime * 4.5);
  }

  // 1. SEAMLESS NECKLESS GOLDEN PEAR/GOURD BODY + SNUB LIP + THROAT TUCK + UPTURNED TAIL
  vec3 headC  = vec3(uHead, 0.0);
  vec3 snoutC = vec3(uSnubLip.x - 0.072, uSnubLip.y + 0.012, 0.038);
  vec3 bodyC  = vec3(uBodyCenter.x + 0.055, uBodyCenter.y + 0.005, 0.015);
  vec3 gluteC = vec3(uHip.x - 0.045, uHip.y + 0.085, -0.010);

  // Rounded yellow cranium dome + cute protruding snub upper lip shelf
  float dHead  = sdEllipsoid(p - headC, vec3(0.218, 0.212, 0.208));
  float dSnout = sdEllipsoid(p - snoutC, vec3(0.086, 0.044, 0.098));
  dHead = smin(dHead, dSnout, 0.048);

  // Thick, fleshy, completely neckless pear column into round potbelly
  vec2 neckCol = sdTaperedCapsule(
    p,
    headC + vec3(-0.018, -0.065, -0.005),
    bodyC + vec3(-0.035,  0.035,  0.005),
    0.188,
    0.342
  );
  float dTorso = smin(dHead, neckCol.x, 0.082);

  float dBelly = sdEllipsoid(p - (bodyC + vec3(0.045, -0.015, 0.018)), vec3(0.348, 0.338, 0.318));
  dTorso = smin(dTorso, dBelly, 0.092);

  // Signature concave throat tuck under snub chin (infinite Z cylinder -> zero back-Z rim artifact!)
  vec2 throatQ = (p.xy - (uThroatTuck + vec2(0.104, -0.006))) / vec2(0.094, 0.066);
  float dThroatCyl = (length(throatQ) - 1.0) * 0.075;
  dTorso = smax(dTorso, -dThroatCyl, 0.040);

  // Plump rounded rump resting naturally on saddle + upturned stubby dinosaur tail
  float dGlute = sdEllipsoid(p - gluteC, vec3(0.235, 0.215, 0.235));
  dTorso = smin(dTorso, dGlute, 0.088);

  vec3 tailMid = vec3(mix(uTailBase.x, uTailTip.x, 0.58), uTailBase.y - 0.022, 0.0);
  float dTail = smin(
    sdTaperedCapsule(p, vec3(uTailBase, 0.0), tailMid, 0.094, 0.044).x,
    sdTaperedCapsule(p, tailMid, vec3(uTailTip, 0.0), 0.044, 0.020).x,
    0.028
  );
  dTorso = smin(dTorso, dTail, 0.068);

  // 2. SCULPTED 3D SAGE-GREEN EYELID CUFFS (立体蛙眼包边) FUSED ONTO BROW!
  vec3 eyeNearC = vec3(uNearEye, 0.162);
  vec3 eyeFarC  = vec3(uFarEye + vec2(0.008, 0.0), 0.022);
  float lidN = sdEllipsoid(p - (eyeNearC + vec3(-0.008, 0.004, -0.014)), vec3(0.078, 0.082, 0.074));
  float lidF = sdEllipsoid(p - (eyeFarC  + vec3(-0.008, 0.003, -0.010)), vec3(0.066, 0.074, 0.064));
  float dLids = min(lidN, lidF);
  // Carve inner orbital aperture so glossy eyeball sits inside a crisp 3D eyelid rim!
  float dEyeCutN = sdSphere(p - (eyeNearC + vec3(0.010, -0.002, 0.012)), 0.064);
  float dEyeCutF = sdSphere(p - (eyeFarC  + vec3(0.012, -0.002, 0.008)), 0.055);
  float dCuff = smax(dLids, -min(dEyeCutN, dEyeCutF), 0.008);

  float prevTorso = dTorso;
  dTorso = smin(dTorso, dCuff, 0.024);
  outEyelidMix = 1.0 - smoothstep(-0.005, 0.032, dCuff - prevTorso);

  // 3. RECESSED 3D HORIZONTAL DEADPAN MOUTH GROOVE (—) + SUBTLE CORNER DIMPLES
  float mY = mix(uMouthStart.y, uMouthEnd.y, 0.5);
  float bandY = 1.0 - smoothstep(0.0085, 0.0155, abs(p.y - mY));
  float spanX = smoothstep(uMouthStart.x - 0.015, uMouthStart.x + 0.012, p.x)
              * (1.0 - smoothstep(uMouthEnd.x - 0.005, uMouthEnd.x + 0.018, p.x));
  float spanZ = smoothstep(-0.03, 0.01, p.z);
  float mouthMask = bandY * spanX * spanZ;
  // Subtle cheek dimple at near mouth corner
  float dimple = exp(-length(p.xy - uMouthStart) * 38.0) * smoothstep(0.02, 0.12, p.z);
  dTorso += mouthMask * 0.0085 + dimple * 0.004;

  float d = dTorso;
  float mat = (mouthMask > 0.38) ? MAT_MOUTH : MAT_BODY;
  float pawMix = 0.0;

  // Soft-feathered warm milk-cream circular belly patch
  vec3 bpCenter = vec3(uBellyPatch + vec2(0.035, -0.008), 0.155);
  vec3 bpScale  = vec3(uBellyRad.x * 0.98, uBellyRad.y * 1.02, 0.255);
  float bellyMask = (1.0 - smoothstep(0.80, 1.03, length((p - bpCenter) / bpScale)))
                  * smoothstep(-0.02, 0.08, p.z);

  // 4. SEAMLESS NEAR PEDALING LEG + GOLDEN HEEL + AIRBRUSHED 3-TOED FOOT
  // Generous smin right around hip socket (kHip up to 0.088) -> ZERO hip ring on outer thigh/glutes!
  vec3 hpN = vec3(uRightHip + vec2(0.0, 0.045), 0.128);
  vec3 knN = vec3(uRightKnee,  0.152);
  vec3 ftN = vec3(uRightFoot,  0.118);
  vec3 pdN = vec3(uRightPedal, 0.118);
  vec3 legN = evalSeamlessLegAndFoot(p, hpN, knN, ftN, pdN, 1.0);

  float distHip = length(p - hpN);
  float kHip = mix(0.010, 0.088, smoothstep(0.28, 0.04, distHip));
  float dBeforeLeg = d;
  d = smin(d, legN.x, kHip);
  if (legN.x < dBeforeLeg + 0.025) {
    float wLeg = 1.0 - smoothstep(-0.02, 0.03, legN.x - dBeforeLeg);
    pawMix = max(pawMix, legN.y * wLeg);
    bellyMask *= (1.0 - wLeg * 0.92);
    outEyelidMix *= (1.0 - wLeg);
    if (wLeg > 0.6) mat = MAT_BODY;
  }
  if (legN.z < d) {
    d = legN.z;
    mat = MAT_CLAW;
    pawMix = 1.0;
  }

  // 5. PRECISION 3D MULTI-COMPONENT GOOSENECK STEM, CLAMP, RISER BAR, BRAKE LEVER & BRASS BELL!
  {
    vec3 headT3 = vec3(uHeadTop, 0.0);
    vec3 stemT3 = vec3(uStemTop, 0.0);
    vec3 riser3 = vec3(uBarRiser, 0.088);
    vec3 gripN3 = vec3(uHandleGrip, 0.165);

    // Headset locknut stack + quill stem + forged clamp knuckle
    float dLock = sdEllipsoid(p - (headT3 + vec3(0.0, 0.018, 0.0)), vec3(0.030, 0.022, 0.030));
    float dStem = sdCapsule(p, headT3, stemT3, 0.021);
    float dClamp = sdEllipsoid(p - stemT3, vec3(0.030, 0.026, 0.030));
    // Sweeping 3D near riser horn extending through grip
    float dRiser = smin(
      sdCapsule(p, stemT3, riser3, 0.020),
      sdCapsule(p, riser3, gripN3 + vec3(-0.068, -0.016, 0.015), 0.019),
      0.018
    );
    float dCockpitMetal = min(min(dLock, dStem), min(dClamp, dRiser));

    // Hinged alloy front brake lever + curved brake blade (uBrakeTip)
    if (uEra != 1 && uEra != 3 && uEra != 9 && uEra != 16) {
      vec3 brkRoot = gripN3 + vec3(0.042, 0.012, -0.005);
      vec3 brkTip3 = vec3(uBrakeTip, 0.152);
      float dBrake = sdTaperedCapsule(p, brkRoot, brkTip3, 0.013, 0.008).x;
      dCockpitMetal = min(dCockpitMetal, dBrake);
    }
    if (dCockpitMetal < d) {
      d = dCockpitMetal;
      mat = MAT_BIKE_METAL;
    }

    // Contoured stitched leather/rubber near handlebar grip + flanged collar + end-plug
    vec3 gA = gripN3 + vec3( 0.052,  0.016, -0.006);
    vec3 gB = gripN3 + vec3(-0.068, -0.018,  0.014);
    float dGripN = sdCapsule(p, gA, gB, 0.030);
    dGripN = min(dGripN, sdEllipsoid(p - gA, vec3(0.014, 0.038, 0.038)));
    dGripN = min(dGripN, sdSphere(p - gB, 0.034));
    if (dGripN < d) {
      d = dGripN;
      mat = MAT_BIKE_GRIP;
    }

    // Spun-brass dome bicycle bell (uBellPos) + top finial nut!
    vec3 bell3 = vec3(uBellPos, 0.055);
    float dBell = sdEllipsoid(p - bell3, vec3(0.044, 0.038, 0.044));
    dBell = smax(dBell, -(p.y - (bell3.y - 0.008)), 0.006); // crisp dome underside
    dBell = min(dBell, sdSphere(p - (bell3 + vec3(0.0, 0.042, 0.0)), 0.010));
    if (dBell < d) {
      d = dBell;
      mat = MAT_BIKE_BELL;
    }
  }

  // 6. SEAMLESS NEAR ARM -> AIRBRUSHED WRIST -> 4-FINGERED DARK-UMBER HAND WRAPPING GRIP!
  // Smooth smin at shoulder socket (kSh up to 0.082) -> ZERO shoulder seam line!
  vec3 shN = vec3(uNearShoulder, 0.162);
  vec3 elN = vec3(uNearElbow,    0.228);
  vec3 hdN = vec3(uNearHand,     0.172);
  vec2 armN = evalSeamlessArmAndHand(p, shN, elN, hdN, 1.0);

  float distSh = length(p - shN);
  float kSh = mix(0.008, 0.082, smoothstep(0.24, 0.03, distSh));
  float dBeforeArm = d;
  d = smin(d, armN.x, kSh);
  if (armN.x < dBeforeArm + 0.022) {
    float wArm = 1.0 - smoothstep(-0.015, 0.028, armN.x - dBeforeArm);
    pawMix = max(pawMix, armN.y * wArm);
    bellyMask *= (1.0 - wArm * 0.96);
    outEyelidMix *= (1.0 - wArm);
    if (wArm > 0.55) mat = MAT_BODY;
  }

  // 7. DUAL BULGING SAGE-GREEN FROG EYEBALLS & GLOSSY BLACK PUPILS!
  for (int ei = 0; ei < 2; ei++) {
    vec3 ec = (ei == 0) ? eyeNearC : eyeFarC;
    float er = (ei == 0) ? 0.065 : 0.056;
    float dEye = sdSphere(p - ec, er);
    if (dEye < d) {
      d = dEye;
      outEyelidMix = 0.0;
      vec3 nDir = normalize(p - ec);
      if (uEra == 9) {
        // Bada Shanren's signature square-cornered skyward eye-roll (八大翻白眼)!
        bool inTopPupil = (nDir.y > 0.36 && abs(nDir.x - 0.35) < 0.44 && nDir.z > 0.35);
        mat = inTopPupil ? MAT_EYE_PUPIL : MAT_EYE_IRIS;
      } else {
        vec3 gaze = (ei == 0) ? normalize(vec3(0.46, -0.02, 0.88)) : normalize(vec3(0.68, -0.02, 0.73));
        mat = (dot(nDir, gaze) > 0.805) ? MAT_EYE_PUPIL : MAT_EYE_IRIS;
      }
    }
  }

  // 8. 3D SCULPTED ERA CROWNS & HEADGEAR (perched cleanly above brow so BOTH frog eyes stay 100% open!)
  if (uEra == 8) {
    // Mughal Imperial Crimson & Gold Pagri Turban + Emerald Sarpech Jewel
    vec3 tc = headC + vec3(-0.035, 0.175, 0.0);
    float dTurb = sdEllipsoid(p - tc, vec3(0.185, 0.095, 0.185));
    if (dTurb < d) { d = dTurb; mat = MAT_GARMENT1; outEyelidMix = 0.0; }
    float dGem = sdEllipsoid(p - (tc + vec3(0.145, 0.025, 0.065)), vec3(0.036, 0.048, 0.036));
    if (dGem < d) { d = dGem; mat = MAT_BIKE_BELL; }
  } else if (uEra == 11) {
    // Edo Ukiyo-e Indigo Mameshibori Headband tied cleanly across upper forehead
    vec3 hc = headC + vec3(-0.015, 0.125, 0.0);
    float dBand = max(abs(length(p.xz - hc.xz) - 0.185) - 0.022, abs(p.y - hc.y) - 0.028);
    if (dBand < d) { d = dBand; mat = MAT_GARMENT1; outEyelidMix = 0.0; }
  } else if (uEra == 17 || uEra == 19) {
    // Sporty Backwards Cap perched on back of crown (2003 QQ cyan-blue in #17, aero neon in #19)
    vec3 cc = headC + vec3(-0.068, 0.145, 0.0);
    float dDome = sdEllipsoid(p - cc, vec3(0.155, 0.078, 0.155));
    float dVisor = sdRoundBox(p - (cc + vec3(-0.145, -0.018, 0.0)), vec3(0.075, 0.014, 0.078), 0.008);
    float dCap = smin(dDome, dVisor, 0.016);
    if (dCap < d) { d = dCap; mat = MAT_GARMENT1; outEyelidMix = 0.0; }
  }

  return vec4(d, mat, pawMix, bellyMask);
}

vec4 mapScene(vec3 p, out float outLid) {
  outLid = 0.0;
  if (uLayer == 1) {
    return mapBackLayer(p);
  }
  if (uLayer == 2) {
    return mapFrontLayer(p, outLid);
  }
  float lidF = 0.0;
  vec4 b = mapBackLayer(p);
  vec4 f = mapFrontLayer(p, lidF);
  if (f.x <= b.x) {
    outLid = lidF;
    return f;
  }
  return b;
}

float mapDistOnly(vec3 p) {
  float dummy = 0.0;
  return mapScene(p, dummy).x;
}

vec3 calcNormal(vec3 p) {
  const float h = 0.0018;
  const vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * mapDistOnly(p + k.xyy * h) +
    k.yyx * mapDistOnly(p + k.yyx * h) +
    k.yxy * mapDistOnly(p + k.yxy * h) +
    k.xxx * mapDistOnly(p + k.xxx * h)
  );
}

float calcAO(vec3 pos, vec3 nor) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 4; i++) {
    float h = 0.020 + 0.055 * float(i);
    float d = mapDistOnly(pos + h * nor);
    occ += (h - d) * sca;
    sca *= 0.70;
  }
  return clamp(1.0 - 2.4 * occ, 0.18, 1.0);
}

void main() {
  vec2 xy = vec2(BOX_X0_VAL, BOX_Y0_VAL) + vUv * BOX_SPAN_VAL;

  // Fast 2D screen-space AABB reject: skips >60% empty border pixels in 1 cycle!
  if (xy.x < -1.05 || xy.x > 0.82 || xy.y < 0.14 || xy.y > 2.42) {
    outAlbedo  = vec4(0.0);
    outNormDep = vec4(0.5, 0.5, 1.0, 1.0);
    outMatInfo = vec4(0.0);
    return;
  }

  // Pure orthographic ray along -Z (pos.xy == xy -> exact 0.00px lock to computePelicanRig!)
  vec3 ro = vec3(xy, 0.42);
  vec3 rd = vec3(0.0, 0.0, -1.0);

  float t = 0.0;
  const float tMax = 0.84; // spans z = +0.42 down to -0.42
  vec4 hitRes = vec4(1e5, 0.0, 0.0, 0.0);
  float lidMix = 0.0;
  bool hit = false;

  for (int i = 0; i < 48; i++) {
    vec3 pos = ro + rd * t;
    float curLid = 0.0;
    vec4 res = mapScene(pos, curLid);
    if (res.x < 0.0010) {
      hit = true;
      hitRes = res;
      lidMix = curLid;
      break;
    }
    t += res.x * 0.92;
    if (t > tMax) break;
  }

  if (!hit) {
    outAlbedo  = vec4(0.0);
    outNormDep = vec4(0.5, 0.5, 1.0, 1.0);
    outMatInfo = vec4(0.0);
    return;
  }

  vec3 pos = ro + rd * t;
  vec3 nor = calcNormal(pos);
  float ao = calcAO(pos, nor);

  float hitMat   = hitRes.y;
  float pawMix   = hitRes.z;
  float bellyMsk = hitRes.w;

  // Authentic Naiwa 3D Matte-Vinyl Palette (matching user reference turnaround PNGs)
  vec3 bodyGold  = vec3(0.955, 0.712, 0.188); // Rich warm golden-mango skin
  vec3 backShade = vec3(0.835, 0.535, 0.120); // Deeper warm amber for far limbs
  vec3 creamBelly= vec3(0.962, 0.902, 0.772); // Warm milk-cream circular belly patch (never clips white!)
  vec3 lidGreen  = vec3(0.545, 0.718, 0.562); // Sage-green frog eyelid cuff & iris
  vec3 midOlive  = vec3(0.575, 0.442, 0.215); // Smooth mid-wrist / mid-instep airbrush tone
  vec3 darkPaw   = vec3(0.255, 0.196, 0.132); // Matte cocoa-umber hands & front toes

  bool isFarLimb = (pos.z < -0.06);
  vec3 baseSkin = isFarLimb ? backShade : bodyGold;
  vec3 col = mix(baseSkin, creamBelly, bellyMsk);

  // Smooth sage-green eyelid rim transition around both frog eye sockets!
  if (lidMix > 0.01) {
    col = mix(col, lidGreen * 0.96, clamp(lidMix * 0.88, 0.0, 1.0));
  }

  // Seamless airbrushed wrist & forefoot gradient (zero hard wrist or heel boundary!)
  if (pawMix > 0.005) {
    vec3 pawGrad = (pawMix < 0.5)
      ? mix(baseSkin, midOlive, pawMix * 2.0)
      : mix(midOlive, darkPaw, (pawMix - 0.5) * 2.0);
    col = mix(col, pawGrad, clamp(pawMix * 1.15, 0.0, 1.0));
  }

  // Pure seamless Naiwa skin across all eras (no rectangular surface garment bands cutting across belly/tail!)
  if (abs(hitMat - MAT_EYE_IRIS) < 0.4) {
    col = (uEra == 7) ? vec3(0.18, 0.56, 0.49) : ((uEra == 18) ? vec3(0.24, 0.96, 0.76) : lidGreen);
  } else if (abs(hitMat - MAT_EYE_PUPIL) < 0.4) {
    col = vec3(0.05, 0.06, 0.055);
  } else if (abs(hitMat - MAT_MOUTH) < 0.4) {
    col = vec3(0.12, 0.08, 0.05);
  } else if (abs(hitMat - MAT_CLAW) < 0.4) {
    col = vec3(0.13, 0.10, 0.07);
  } else if (abs(hitMat - MAT_BIKE_METAL) < 0.4) {
    if (uEra == 1 || uEra == 5 || uEra == 6 || uEra == 11) col = vec3(0.46, 0.34, 0.22); // Carved wood / bamboo
    else if (uEra == 2 || uEra == 8 || uEra == 10 || uEra == 12) col = vec3(0.88, 0.68, 0.22); // Burnished gold / bronze
    else if (uEra == 7) col = vec3(0.16, 0.48, 0.42); // Maya jade
    else if (uEra == 18) col = vec3(0.05, 0.94, 1.0); // Vaporwave cyan chrome
    else if (uEra == 20) col = vec3(0.35, 0.65, 1.0); // CodeArt CAD alloy
    else col = vec3(0.82, 0.86, 0.90); // Brushed satin chrome
  } else if (abs(hitMat - MAT_BIKE_GRIP) < 0.4) {
    if (uEra == 8) col = vec3(0.78, 0.20, 0.16);
    else if (uEra == 11) col = vec3(0.12, 0.24, 0.38);
    else if (uEra == 19) col = vec3(1.0, 0.16, 0.37);
    else if (uEra == 20) col = vec3(0.97, 0.51, 0.40);
    else col = vec3(0.18, 0.14, 0.11);
  } else if (abs(hitMat - MAT_BIKE_BELL) < 0.4) {
    if (uEra == 3 || uEra == 7 || uEra == 9) col = vec3(0.72, 0.22, 0.16); // Cinnabar / carnelian bell
    else if (uEra == 19) col = vec3(0.15, 0.96, 0.93);
    else col = vec3(0.95, 0.78, 0.32); // Spun brass
  } else if (abs(hitMat - MAT_GARMENT1) < 0.4) {
    if (uEra == 8) col = vec3(0.78, 0.20, 0.16);
    else if (uEra == 10) col = vec3(0.58, 0.15, 0.10);
    else if (uEra == 11) {
      float dotMask = smoothstep(0.62, 0.78, sin(pos.x * 85.0) * cos(pos.z * 85.0));
      col = mix(vec3(0.11, 0.23, 0.36), vec3(0.96, 0.92, 0.82), dotMask);
    } else if (uEra == 17) col = vec3(0.02, 0.40, 0.80);
    else if (uEra == 19) col = vec3(0.14, 0.16, 0.22);
    else col = vec3(0.85, 0.72, 0.48);
  }

  float normDep = clamp(t / tMax, 0.0, 1.0);
  outAlbedo  = vec4(col, 1.0);
  outNormDep = vec4(nor * 0.5 + 0.5, normDep);
  outMatInfo = vec4(hitMat / 16.0, ao, bellyMsk, clamp(1.0 - max(nor.z, 0.0), 0.0, 1.0));
}
`
  .replace('BOX_X0_VAL', BOX_X0.toFixed(4))
  .replace('BOX_Y0_VAL', BOX_Y0.toFixed(4))
  .replace('BOX_SPAN_VAL', BOX_SPAN.toFixed(4));

// Pass 2: 20-Era Multi-Medium Artistic Surface & Lighting Shader
const PASS2_3D_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexAlbedo;
uniform sampler2D uTexNormDep;
uniform sampler2D uTexMatInfo;
uniform int   uEra;
uniform float uTime;
uniform float uReveal;     // 0..1 for #20 CodeArt progressive build
uniform vec4  uShadowTint; // rgba override when > 0 (e.g. #10 Wayang kelir shadow or #14 Nosferatu)

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise2(p);
    p = p * 2.03 + vec2(17.1, 31.7);
    a *= 0.5;
  }
  return v;
}

// Detects outer silhouette & true 3D depth-overlap creases ONLY (zero artificial limb-ID rings!)
vec2 detectEdges(vec2 uv, float radiusPx) {
  vec2 px = vec2(radiusPx / float(${GL_SIZE}));
  float aC = texture(uTexAlbedo, uv).a;
  vec4 ndC = texture(uTexNormDep, uv);
  float mC = floor(texture(uTexMatInfo, uv).r * 16.0 + 0.5);
  vec3 nC  = ndC.xyz * 2.0 - 1.0;

  float silEdge = 0.0;
  float creaseEdge = 0.0;
  for (int k = 0; k < 8; k++) {
    float ang = float(k) * 0.78539816;
    vec2 off = vec2(cos(ang), sin(ang)) * px;
    float aN = texture(uTexAlbedo, uv + off).a;
    vec4 ndN = texture(uTexNormDep, uv + off);
    float mN = floor(texture(uTexMatInfo, uv + off).r * 16.0 + 0.5);
    vec3 nN  = ndN.xyz * 2.0 - 1.0;

    silEdge = max(silEdge, abs(aC - aN));
    if (aC > 0.5 && aN > 0.5) {
      bool eyeInternal = (mC == 3.0 && mN == 4.0) || (mC == 4.0 && mN == 3.0);
      bool eyeSocket   = (mC == 1.0 && mN == 3.0) || (mC == 3.0 && mN == 1.0);
      float matDiff = 0.0;
      if (abs(mC - mN) > 0.4 && !eyeInternal) {
        matDiff = eyeSocket ? 0.38 : 0.76;
      }
      // True 3D Z-depth overlap (abs(ndC.w - ndN.w) > 0.055, e.g. forearm in front of belly!)
      // smoothly vanishes to 0.0 at shoulder & hip roots where depth is continuous!
      float depJump = smoothstep(0.052, 0.115, abs(ndC.w - ndN.w)) * 0.82;
      creaseEdge = max(creaseEdge, max(matDiff, depJump));
    }
  }
  return vec2(silEdge, clamp(creaseEdge, 0.0, 1.0));
}

// Blender-Cycles-style 3D Matte-Vinyl + Warm Subsurface Scattering + Dual Corneal Catchlights
vec3 shade3DSubsurfaceVinyl(vec3 baseCol, vec3 n, float ao, float matId) {
  vec3 keyDir  = normalize(vec3( 0.42,  0.64, 0.64));
  vec3 fillDir = normalize(vec3(-0.65,  0.22, 0.72));
  vec3 bounce  = normalize(vec3( 0.08, -0.90, 0.42));

  float diffKey = max(dot(n, keyDir), 0.0);
  float wrapDif = clamp((dot(n, keyDir) + 0.62) / 1.62, 0.0, 1.0);
  float fill    = max(dot(n, fillDir), 0.0) * 0.28;
  float bnc     = max(dot(n, bounce), 0.0) * 0.18;

  // Warm golden-amber subsurface scattering through plump cheeks, belly & upturned tail!
  vec3 warmSSS = baseCol * vec3(1.04, 0.75, 0.42) * pow(1.0 - diffKey, 1.4) * 0.24;
  vec3 lit = baseCol * (0.28 + 0.63 * wrapDif + fill) * mix(0.54, 1.0, ao) + warmSSS;
  lit += vec3(0.94, 0.70, 0.32) * bnc * baseCol;

  vec3 hVec = normalize(keyDir + vec3(0.0, 0.0, 1.0));
  if (abs(matId - 3.0) < 0.4 || abs(matId - 4.0) < 0.4) {
    // Wet glossy frog cornea: crisp primary studio catchlight + soft secondary sky catchlight!
    float spec1 = smoothstep(0.984, 0.996, dot(n, normalize(vec3(-0.24, 0.46, 0.85))));
    float spec2 = smoothstep(0.965, 0.988, dot(n, normalize(vec3( 0.38, -0.32, 0.86)))) * 0.35;
    float gloss = pow(max(dot(n, hVec), 0.0), 72.0) * 0.45;
    lit += vec3(1.0, 0.99, 0.96) * (spec1 * 0.92 + spec2 + gloss);
  } else if (abs(matId - 8.0) < 0.4 || abs(matId - 10.0) < 0.4) {
    // Brushed chrome stem/riser & spun-brass bell metallic sheen
    float specM = pow(max(dot(n, hVec), 0.0), 42.0);
    lit += vec3(1.0, 0.98, 0.90) * specM * 0.72;
  } else {
    // Soft matte-vinyl micro-sheen on crown & belly
    float sheen = pow(max(dot(n, hVec), 0.0), 16.0);
    lit += vec3(1.0, 0.96, 0.84) * sheen * 0.13 * ao;
  }
  return lit;
}

void main() {
  vec2 uv = vUv;

  // Shadow / Silhouette override mode (Wayang kelir shadow pass & Nosferatu staircase shadow)
  if (uShadowTint.a > 0.001) {
    vec4 albS = texture(uTexAlbedo, uv);
    if (albS.a < 0.08) discard;
    float mS = floor(texture(uTexMatInfo, uv).r * 16.0 + 0.5);
    vec3 sCol = uShadowTint.rgb;
    // Subtle glowing pinprick eyes in Nosferatu shadow (#14) or backlit Wayang eye slits (#10)
    if (uEra == 14 && abs(mS - 4.0) < 0.4) {
      sCol = vec3(0.88, 0.84, 0.72);
    } else if (uEra == 10 && abs(mS - 3.0) < 0.4) {
      sCol = vec3(1.0, 0.90, 0.62);
    }
    fragColor = vec4(sCol, albS.a * uShadowTint.a);
    return;
  }

  // ERA 17: 2000s DESKTOP IM 256-COLOR BAYER-DITHERED 3D GIF!
  if (uEra == 17) {
    float grid = 224.0;
    vec2 gUv = (floor(uv * grid) + 0.5) / grid;
    vec4 alb = texture(uTexAlbedo, gUv);
    float st = 1.0 / grid;
    float maxN = max(
      max(texture(uTexAlbedo, gUv + vec2(st, 0.0)).a, texture(uTexAlbedo, gUv - vec2(st, 0.0)).a),
      max(texture(uTexAlbedo, gUv + vec2(0.0, st)).a, texture(uTexAlbedo, gUv - vec2(0.0, st)).a)
    );
    if (alb.a < 0.5) {
      if (maxN > 0.5) {
        fragColor = vec4(0.04, 0.04, 0.05, 1.0);
        return;
      }
      discard;
    }
    vec4 nd = texture(uTexNormDep, gUv);
    vec4 mi = texture(uTexMatInfo, gUv);
    vec3 n  = normalize(nd.xyz * 2.0 - 1.0);
    float matId = floor(mi.r * 16.0 + 0.5);
    vec2 edG = detectEdges(gUv, 1.5);
    vec3 lit = shade3DSubsurfaceVinyl(alb.rgb, n, mi.g, matId);
    ivec2 ip = ivec2(mod(floor(uv * grid), 2.0));
    float bayer = float((ip.x + ip.y * 2) % 4) / 4.0 - 0.375;
    vec3 qCol = floor(clamp(lit + bayer * 0.10, 0.0, 1.0) * 5.0 + 0.5) / 5.0;
    if (edG.y > 0.65 || abs(matId - 5.0) < 0.4) qCol = vec3(0.05, 0.05, 0.06);
    fragColor = vec4(qCol, 1.0);
    return;
  }

  // ERA 09: BADA SHANREN FREEHAND XIEYI SPLASH-INK (泼墨写意 + 八大翻白眼)
  if (uEra == 9) {
    float bleed = (fbm(uv * 24.0) - 0.5) * 0.008;
    vec2 bUv = uv + vec2(bleed, bleed * 0.7);
    vec4 alb = texture(uTexAlbedo, bUv);
    vec2 ed  = detectEdges(bUv, 2.2);
    if (alb.a < 0.42 && ed.x < 0.35) discard;

    vec4 nd = texture(uTexNormDep, bUv);
    vec4 mi = texture(uTexMatInfo, bUv);
    vec3 n  = normalize(nd.xyz * 2.0 - 1.0);
    float matId = floor(mi.r * 16.0 + 0.5);
    float bristle = fbm(vec2(uv.x * 38.0, uv.y * 150.0));

    vec3 xuan = vec3(0.955, 0.935, 0.885);
    vec3 gambogeWash = vec3(0.84, 0.73, 0.48);
    float ink = 0.0;
    bool useTint = false;

    if (abs(matId - 3.0) < 0.4) {
      ink = (ed.y > 0.32) ? 0.88 : 0.04;
    } else if (abs(matId - 4.0) < 0.4 || abs(matId - 5.0) < 0.4) {
      ink = 0.96;
    } else if (abs(matId - 10.0) < 0.4) {
      // Cinnabar seal-red handlebar bell accent!
      fragColor = vec4(0.68, 0.19, 0.14, 0.92);
      return;
    } else {
      // 3D dorsal splash-ink gradation + untouched Xuan-paper white belly (留白)
      float dorsal = clamp((-n.x * 0.58 + (1.0 - mi.b) * 0.38) + (fbm(uv * 15.0) - 0.46) * 0.36, 0.0, 1.0);
      ink = mix(0.03, 0.72, smoothstep(0.24, 0.86, dorsal)) * (1.0 - mi.b * 0.88);
      useTint = (mi.b < 0.45 && ink < 0.45);
      if (ed.x > 0.26 || ed.y > 0.46) {
        ink = max(ink, 0.88 * smoothstep(0.18, 0.72, bristle + 0.30));
      }
    }
    vec3 basePaper = useTint ? mix(xuan, gambogeWash, 0.36) : xuan;
    vec3 inkCol = mix(basePaper, vec3(0.08, 0.075, 0.07), clamp(ink, 0.0, 0.96));
    float alpha = (alb.a > 0.42) ? clamp(ink * 1.45 + 0.58, 0.0, 1.0) : ed.x * 0.82;
    fragColor = vec4(inkCol, alpha);
    return;
  }

  vec4 alb = texture(uTexAlbedo, uv);
  float edgeRad = (uEra == 7 || uEra == 11 || uEra == 12 || uEra == 1) ? 2.0 : 1.45;
  vec2 ed = detectEdges(uv, edgeRad);
  if (alb.a < 0.42 && ed.x < 0.45) discard;

  vec4 nd = texture(uTexNormDep, uv);
  vec4 mi = texture(uTexMatInfo, uv);
  vec3 n  = normalize(nd.xyz * 2.0 - 1.0);
  float ao  = mi.g;
  float pat = mi.b;
  float rim = mi.a;
  float matId = floor(mi.r * 16.0 + 0.5);
  float strokeMask = clamp(max(ed.x * 1.15, ed.y * 0.85), 0.0, 1.0);

  // Rich 3D volumetric vinyl lighting used as foundation and modulated per era medium!
  vec3 vinyl3D = shade3DSubsurfaceVinyl(alb.rgb, n, ao, matId);

  // ERA 01: SAHARAN TASSILI ROCK PAINTING (3D mineral ochre + sandstone tooth + kaolin dots)
  if (uEra == 1) {
    float rockGrain = fbm(uv * 105.0);
    vec3 mineral = mix(alb.rgb, vinyl3D, 0.68) * vec3(0.96, 0.82, 0.62) * (0.84 + 0.30 * rockGrain);
    if (abs(matId - 1.0) < 0.4 && pat < 0.25 && n.x < -0.25) {
      float dots = smoothstep(0.84, 0.94, sin(uv.x * 135.0) * sin(uv.y * 135.0));
      mineral = mix(mineral, vec3(0.95, 0.89, 0.76), dots * 0.68);
    }
    vec3 res = mix(mineral, vec3(0.20, 0.10, 0.05), strokeMask * (0.65 + 0.35 * rockGrain));
    fragColor = vec4(res, max(alb.a * (0.88 + 0.12 * smoothstep(0.2, 0.6, rockGrain)), strokeMask * 0.85));
    return;
  }

  // ERA 02: ANCIENT EGYPTIAN TOMB FRESCO (3D-sculpted tempera relief + limestone plaster)
  if (uEra == 2) {
    float plaster = fbm(uv * 68.0);
    vec3 fresco = mix(alb.rgb * 0.96, vinyl3D, 0.52) * (0.95 + 0.10 * plaster);
    vec3 res = mix(fresco, vec3(0.22, 0.11, 0.07), strokeMask * 0.90);
    fragColor = vec4(res, max(alb.a, strokeMask));
    return;
  }

  // ERA 03: EASTERN HAN STONE-RELIEF RUBBING (汉画像石乌金拓 with 3D chiseled relief shading!)
  if (uEra == 3) {
    float stonePit = hash21(floor(uv * 380.0));
    float chisel = fbm(vec2(uv.x * 150.0, uv.y * 28.0));
    float relief = clamp(dot(n, normalize(vec3(0.35, 0.65, 0.68))) * 0.35 + 0.72, 0.0, 1.0);
    float groove = strokeMask;
    // Carved Han spiral cloud-scroll (汉代卷云纹) recessed inside belly intaglio!
    if (abs(matId - 1.0) < 0.4 && pat > 0.45) {
      vec2 sp = (uv - vec2(0.50, 0.55)) * 26.0;
      float r = length(sp);
      float a = atan(sp.y, sp.x);
      float spiral = smoothstep(-0.15, 0.25, sin(r * 5.2 - a * 2.0));
      groove = max(groove, (1.0 - spiral) * 0.88);
    } else if (abs(matId - 1.0) < 0.4 && pat < 0.30) {
      groove = max(groove, smoothstep(0.84, 0.95, sin(uv.y * 185.0)) * 0.45);
    }
    if (abs(matId - 4.0) < 0.4 || abs(matId - 5.0) < 0.4 || abs(matId - 11.0) < 0.4) groove = 1.0;
    if (abs(matId - 3.0) < 0.4) groove = 0.0;
    if (stonePit > 0.95) groove = 1.0 - groove * 0.7;
    float bw = smoothstep(0.34, 0.64, (1.0 - groove) * relief + (chisel - 0.5) * 0.14);
    vec3 rub = mix(vec3(0.09, 0.085, 0.078), vec3(0.93, 0.905, 0.85), bw);
    if (abs(matId - 10.0) < 0.4) rub = mix(rub, vec3(0.70, 0.22, 0.17), 0.82); // cinnabar bell!
    fragColor = vec4(rub, max(alb.a, strokeMask));
    return;
  }

  // ERA 04: TANG DYNASTY WU DAOZI BAIMIAO (吴带当风 3D translucent silk-gamboge + orchid-leaf ink)
  if (uEra == 4) {
    float silk = 0.96 + 0.04 * sin(uv.y * 420.0);
    vec3 tint = mix(vec3(0.95, 0.92, 0.84), vinyl3D, 0.55) * silk;
    float brushVar = 0.72 + 0.48 * sin(uv.x * 30.0 + uv.y * 36.0);
    float inkLine = clamp(strokeMask * brushVar * 1.22, 0.0, 1.0);
    if (abs(matId - 4.0) < 0.4 || abs(matId - 5.0) < 0.4) inkLine = 0.95;
    vec3 baimiao = mix(tint, vec3(0.12, 0.10, 0.08), inkLine);
    fragColor = vec4(baimiao, max(alb.a * 0.92, inkLine));
    return;
  }

  // ERA 05 & 06: NORTHERN SONG (溪山行旅) & QINGMING (清明上河图) 3D GONGBI MINERAL SILK!
  if (uEra == 5 || uEra == 6) {
    float silkTex = fbm(vec2(uv.x * 65.0, uv.y * 175.0));
    vec3 gongbi = mix(alb.rgb, vinyl3D, 0.78) * (0.94 + 0.10 * silkTex);
    if (uEra == 5) {
      gongbi *= vec3(0.97, 0.93, 0.84);
    }
    vec3 res = mix(gongbi, vec3(0.12, 0.10, 0.08), strokeMask * 0.84);
    fragColor = vec4(res, max(alb.a, strokeMask));
    return;
  }

  // ERA 07: MAYA BARK-PAPER CODEX (3D cel-lit solar gold + amate fiber + bold glyphic brush)
  if (uEra == 7) {
    float amate = 0.93 + 0.13 * fbm(vec2(uv.x * 115.0, uv.y * 38.0));
    vec3 codex = mix(alb.rgb, vinyl3D, 0.62) * amate;
    vec3 res = mix(codex, vec3(0.09, 0.07, 0.06), clamp(strokeMask * 1.28, 0.0, 1.0));
    fragColor = vec4(res, max(alb.a, strokeMask));
    return;
  }

  // ERA 08: MUGHAL IMPERIAL MINIATURE (3D burnished gouache + radiant gold zari rim!)
  if (uEra == 8) {
    vec3 gouache = vinyl3D + vec3(0.98, 0.82, 0.32) * pow(rim, 2.4) * 0.42;
    vec3 res = mix(gouache, vec3(0.18, 0.10, 0.06), strokeMask * 0.76);
    fragColor = vec4(res, max(alb.a, strokeMask));
    return;
  }

  // ERA 10: JAVANESE WAYANG KULIT POLYCHROME BUFFALO-HIDE PUPPET (tatahan lace + prada gold)
  if (uEra == 10) {
    if (abs(matId - 1.0) < 0.4 && pat > 0.35 && strokeMask < 0.30) {
      vec2 pGrid = uv * 125.0;
      vec2 fG = fract(pGrid) - 0.5;
      if (length(fG) < 0.22 && hash21(floor(pGrid)) > 0.35) {
        fragColor = vec4(1.0, 0.95, 0.76, 0.85);
        return;
      }
    }
    float lampGlow = clamp(0.42 + rim * 0.65 + pat * 0.28, 0.0, 1.0);
    vec3 hide = mix(vinyl3D * vec3(0.92, 0.68, 0.36), vinyl3D * 1.12, lampGlow);
    vec3 res = mix(hide, vec3(0.98, 0.82, 0.36), strokeMask * 0.78);
    fragColor = vec4(res, max(alb.a, strokeMask));
    return;
  }

  // ERA 11: UKIYO-E WOODBLOCK PRINT (3D bokashi gradation + cherrywood baren grain + sumi keyblock)
  if (uEra == 11) {
    float baren = 0.95 + 0.07 * sin(uv.y * 390.0 + fbm(uv * 26.0) * 3.0);
    vec3 wood = mix(alb.rgb, vinyl3D, 0.66) * baren;
    vec3 res = mix(wood, vec3(0.10, 0.09, 0.08), clamp(strokeMask * 1.18, 0.0, 1.0));
    fragColor = vec4(res, max(alb.a, strokeMask));
    return;
  }

  // ERA 12: VAN GOGH STARRY NIGHT (Harmonious oil-painted volume + soft integrated eyes!)
  if (uEra == 12) {
    if (abs(matId - 3.0) < 0.4) {
      // Soft muted warm olive-ochre iris (no harsh cyan, no stark white LED specular!) so eyes blend gently into face
      float wrapE = clamp((dot(n, normalize(vec3(0.42, 0.64, 0.64))) + 0.65) / 1.65, 0.0, 1.0);
      vec3 softIris = vec3(0.68, 0.73, 0.43) * (0.68 + 0.36 * wrapE);
      softIris = mix(softIris, vec3(0.22, 0.30, 0.42), strokeMask * 0.28);
      fragColor = vec4(softIris, 1.0);
      return;
    }
    if (abs(matId - 4.0) < 0.4 || abs(matId - 5.0) < 0.4) {
      // Painterly muted Prussian-slate pupil & mouth (low-contrast oil paint, never stark jet-black!)
      vec3 softPupil = vec3(0.16, 0.24, 0.38);
      fragColor = vec4(softPupil, 1.0);
      return;
    }
    vec2 tang = normalize(vec2(-n.y, n.x) + vec2(0.10, 0.04));
    vec2 perp = vec2(-tang.y, tang.x);
    vec2 strokeCoord = vec2(dot(uv, tang) * 18.0 + sin(uv.y * 12.0) * 0.4, dot(uv, perp) * 44.0);
    vec2 cellId = floor(strokeCoord);
    vec2 cellUv = fract(strokeCoord);
    float hCell = hash21(cellId);
    float bristle = sin(cellUv.y * 18.84 + hCell * 6.28);

    vec3 impBase = vinyl3D;
    if (abs(matId - 1.0) < 0.4) {
      if (pat > 0.45) {
        impBase = (hCell > 0.52) ? vec3(0.99, 0.95, 0.76) : ((hCell > 0.20) ? vec3(0.96, 0.86, 0.52) : vec3(0.82, 0.88, 0.80));
      } else if (n.x < -0.25) {
        impBase = (hCell > 0.68) ? vec3(0.24, 0.50, 0.66) : ((hCell > 0.32) ? vec3(0.88, 0.54, 0.14) : vec3(0.95, 0.72, 0.18));
      } else {
        impBase = (hCell > 0.58) ? vec3(0.99, 0.86, 0.28) : ((hCell > 0.24) ? vec3(0.95, 0.70, 0.15) : vec3(0.90, 0.56, 0.12));
      }
      impBase = mix(vinyl3D, impBase, 0.58);
    }

    float dabGap = smoothstep(0.0, 0.12, cellUv.x) * smoothstep(1.0, 0.88, cellUv.x)
                 * smoothstep(0.0, 0.16, cellUv.y) * smoothstep(1.0, 0.84, cellUv.y);
    vec3 impasto = impBase * (0.90 + 0.16 * dabGap) + vec3(1.0, 0.95, 0.72) * smoothstep(0.40, 0.92, bristle) * 0.18 * dabGap;
    impasto = mix(vec3(0.11, 0.23, 0.46), impasto, 0.62 + 0.38 * dabGap);

    vec3 res = mix(impasto, vec3(0.09, 0.19, 0.40), clamp(strokeMask * 0.72, 0.0, 1.0));
    fragColor = vec4(res, max(alb.a, strokeMask));
    return;
  }

  // ERA 13: MUNCH THE SCREAM (3D undulating Expressionist tempera & crayon ribbons)
  if (uEra == 13) {
    float wave = sin(uv.y * 95.0 + sin(uv.x * 22.0 + uTime * 4.0) * 3.2);
    vec3 expr = vinyl3D;
    if (abs(matId - 1.0) < 0.4) {
      vec3 rib = (wave > 0.30) ? vec3(0.98, 0.78, 0.26) : ((wave < -0.32) ? vec3(0.84, 0.36, 0.15) : expr);
      expr = mix(expr, rib, 0.34 * (1.0 - pat * 0.6));
    }
    vec3 res = mix(expr, vec3(0.15, 0.10, 0.11), strokeMask * 0.84);
    fragColor = vec4(res, max(alb.a, strokeMask));
    return;
  }

  // ERA 18: 2010s VAPORWAVE (3D raytraced horizon-chrome + neon Fresnel rim, crisp frog eyes!)
  if (uEra == 18) {
    if (abs(matId - 3.0) < 0.4 || abs(matId - 4.0) < 0.4 || abs(matId - 5.0) < 0.4) {
      fragColor = vec4(vinyl3D, 1.0);
      return;
    }
    vec3 refl = reflect(vec3(0.0, 0.0, -1.0), n);
    vec3 env = (refl.y > 0.04)
      ? mix(vec3(1.0, 0.94, 0.68), vec3(0.18, 0.90, 1.0), clamp(refl.y * 1.4, 0.0, 1.0))
      : ((refl.y > -0.06) ? vec3(0.22, 0.06, 0.36) : mix(vec3(1.0, 0.24, 0.72), vec3(0.12, 0.95, 1.0), smoothstep(0.84, 0.98, abs(sin(refl.x * 16.0))) * 0.65));
    vec3 chrome = mix(vinyl3D, env, 0.46) + vec3(1.0) * pow(max(dot(n, normalize(vec3(0.35, 0.65, 0.68))), 0.0), 48.0) * 0.65;
    vec3 neonRim = mix(vec3(0.0, 0.95, 1.0), vec3(1.0, 0.22, 0.72), uv.y);
    chrome = mix(chrome, neonRim, max(strokeMask * 0.62, pow(rim, 2.6) * 0.48));
    fragColor = vec4(chrome, max(alb.a, strokeMask));
    return;
  }

  // ERA 19: 2020s 9:16 SHORT VIDEO (Cinema 3D subsurface vinyl + sunset gold & cyan dual rim lights!)
  if (uEra == 19) {
    vec3 hero = vinyl3D;
    float backRim = pow(clamp(-n.x * 0.65 + rim * 0.55, 0.0, 1.0), 2.2);
    float frontRim = pow(clamp( n.x * 0.55 + rim * 0.45, 0.0, 1.0), 2.6);
    hero += vec3(1.0, 0.86, 0.42) * backRim * 0.42 + vec3(0.15, 0.96, 0.93) * frontRim * 0.28;
    vec3 res = mix(hero, vec3(0.09, 0.08, 0.10), strokeMask * 0.68);
    fragColor = vec4(res, max(alb.a, strokeMask));
    return;
  }

  // ERA 20 (GENERATIVE CODE ART) & STUDIO DEFAULT:
  // Blender-Cycles 3D Subsurface Matte-Vinyl + Progressive CAD Isoparametric Wireframe!
  vec3 studio = vinyl3D;
  if (uEra == 20) {
    float isoU = smoothstep(0.965, 0.996, sin(uv.y * 130.0));
    float isoV = smoothstep(0.965, 0.996, sin((uv.x + n.x * 0.08) * 130.0));
    float cadWire = max(isoU, isoV) * (0.68 - 0.44 * uReveal) + strokeMask * (0.85 - 0.50 * uReveal);
    vec3 wireCol = mix(vec3(0.35, 0.65, 1.0), vec3(0.49, 0.91, 0.53), uv.y);
    if (abs(matId - 3.0) > 0.4 && abs(matId - 4.0) > 0.4 && abs(matId - 5.0) > 0.4) {
      studio = mix(studio * (0.25 + 0.75 * uReveal), wireCol, clamp(cadWire, 0.0, 0.82));
    }
    float a20 = mix(clamp(cadWire + alb.a * 0.28, 0.0, 1.0), alb.a, uReveal);
    fragColor = vec4(studio, a20);
    return;
  }

  fragColor = vec4(studio, alb.a);
}
`;

let _naiwaGL = null;
let _naiwaGLFailed = false;

function compileGLShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`Naiwa 3D Shader Error:\n${log}`);
  }
  return sh;
}

function createGLProg(gl, vsSrc, fsSrc) {
  const vs = compileGLShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileGLShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`Naiwa 3D Link Error:\n${gl.getProgramInfoLog(p)}`);
  }
  return p;
}

function createMRTAttachment(gl) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, GL_SIZE, GL_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

function getNaiwa3DGL() {
  if (_naiwaGL) return _naiwaGL;
  if (_naiwaGLFailed || typeof document === 'undefined') return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = GL_SIZE;
    canvas.height = GL_SIZE;
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      _naiwaGLFailed = true;
      return null;
    }

    const prog1 = createGLProg(gl, VERT_3D_SRC, PASS1_3D_FRAG);
    const prog2 = createGLProg(gl, VERT_3D_SRC, PASS2_3D_FRAG);
    const vao = gl.createVertexArray();

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    const texAlbedo = createMRTAttachment(gl);
    const texNormDep = createMRTAttachment(gl);
    const texMatInfo = createMRTAttachment(gl);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texAlbedo, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, texNormDep, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, texMatInfo, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Naiwa MRT FBO incomplete');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const u1Names = [
      'uEra', 'uLayer', 'uTime',
      'uHead', 'uSnubLip', 'uThroatTuck', 'uMouthStart', 'uMouthEnd',
      'uNearEye', 'uFarEye', 'uBodyCenter', 'uBellyPatch', 'uBellyRad',
      'uHip', 'uTailBase', 'uTailTip',
      'uNearShoulder', 'uNearElbow', 'uNearHand',
      'uFarShoulder', 'uFarElbow', 'uFarHand',
      'uRightHip', 'uRightKnee', 'uRightFoot', 'uRightPedal',
      'uLeftHip', 'uLeftKnee', 'uLeftFoot', 'uLeftPedal',
      'uHeadTop', 'uStemTop', 'uBarRiser', 'uHandleGrip', 'uFarGrip', 'uBrakeTip', 'uBellPos',
    ];
    const u1 = {};
    for (const nm of u1Names) u1[nm] = gl.getUniformLocation(prog1, nm);

    const u2 = {
      uTexAlbedo: gl.getUniformLocation(prog2, 'uTexAlbedo'),
      uTexNormDep: gl.getUniformLocation(prog2, 'uTexNormDep'),
      uTexMatInfo: gl.getUniformLocation(prog2, 'uTexMatInfo'),
      uEra: gl.getUniformLocation(prog2, 'uEra'),
      uTime: gl.getUniformLocation(prog2, 'uTime'),
      uReveal: gl.getUniformLocation(prog2, 'uReveal'),
      uShadowTint: gl.getUniformLocation(prog2, 'uShadowTint'),
    };

    _naiwaGL = { canvas, gl, prog1, prog2, vao, fbo, texAlbedo, texNormDep, texMatInfo, u1, u2 };
    return _naiwaGL;
  } catch (err) {
    console.warn('[naiwa3D] WebGL2 fallback to seamless 2D:', err);
    _naiwaGLFailed = true;
    return null;
  }
}

/**
 * Renders 3D Volumetric `smin`-Metaball Naiwa + 3D Cockpit aligned 1:1 to `rig` onto `ctx`.
 * Returns `true` if rendered via WebGL2, or `false` if WebGL2 is unavailable.
 */
export function renderNaiwa3DWebGL(ctx, rig, opts = {}) {
  const st = getNaiwa3DGL();
  if (!st) return false;

  const {
    era = 20,
    layer = 'all',
    time = rig.time || 0,
    reveal = 1.0,
    shadowTint = null, // [r, g, b, a] in 0..1
    pixelated = false,
  } = opts;

  const { gl, canvas, u1, u2 } = st;
  const s = rig.root.scale || 1.0;
  const slope = rig.root.slope || 0.0;
  const cosS = Math.cos(slope);
  const sinS = Math.sin(slope);

  // Exact inverse rig transform -> unscaled rig-local 100px units (+X right, +Y UP)
  const setU2 = (loc, pt) => {
    const dx = (pt.x - rig.root.x) / s;
    const dy = (pt.y - rig.root.y) / s;
    const lx = dx * cosS + dy * sinS;
    const ly = -dx * sinS + dy * cosS;
    gl.uniform2f(loc, lx / 100.0, -ly / 100.0);
  };

  const layerInt = layer === 'back' ? 1 : layer === 'front' ? 2 : 0;

  // --- Pass 1: 3D SDF Raymarch ---
  gl.bindFramebuffer(gl.FRAMEBUFFER, st.fbo);
  gl.viewport(0, 0, GL_SIZE, GL_SIZE);
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(st.prog1);
  gl.bindVertexArray(st.vao);
  gl.uniform1i(u1.uEra, era);
  gl.uniform1i(u1.uLayer, layerInt);
  gl.uniform1f(u1.uTime, time);

  setU2(u1.uHead, rig.head);
  setU2(u1.uSnubLip, rig.snubLip);
  setU2(u1.uThroatTuck, rig.throatTuck);
  setU2(u1.uMouthStart, rig.mouthStart);
  setU2(u1.uMouthEnd, rig.mouthEnd);
  setU2(u1.uNearEye, rig.nearEye);
  setU2(u1.uFarEye, rig.farEye);
  setU2(u1.uBodyCenter, rig.bodyCenter);
  setU2(u1.uBellyPatch, rig.bellyPatch);
  gl.uniform2f(u1.uBellyRad, (rig.bellyPatch.rx / s) / 100.0, (rig.bellyPatch.ry / s) / 100.0);
  setU2(u1.uHip, rig.hip);
  setU2(u1.uTailBase, rig.tailBase);
  setU2(u1.uTailTip, rig.tailTip);

  setU2(u1.uNearShoulder, rig.wingShoulder);
  setU2(u1.uNearElbow, rig.wingElbow);
  setU2(u1.uNearHand, rig.wingTip);
  setU2(u1.uFarShoulder, rig.farShoulder);
  setU2(u1.uFarElbow, rig.farElbow);
  setU2(u1.uFarHand, rig.farHand);

  setU2(u1.uRightHip, rig.rightHip);
  setU2(u1.uRightKnee, rig.rightKnee);
  setU2(u1.uRightFoot, rig.rightFoot);
  setU2(u1.uRightPedal, rig.rightPedal);
  setU2(u1.uLeftHip, rig.leftHip);
  setU2(u1.uLeftKnee, rig.leftKnee);
  setU2(u1.uLeftFoot, rig.leftFoot);
  setU2(u1.uLeftPedal, rig.leftPedal);

  setU2(u1.uHeadTop, rig.headTop);
  setU2(u1.uStemTop, rig.stemTop);
  setU2(u1.uBarRiser, rig.barRiser);
  setU2(u1.uHandleGrip, rig.handleGrip);
  setU2(u1.uFarGrip, rig.farGrip);
  setU2(u1.uBrakeTip, rig.brakeTip);
  setU2(u1.uBellPos, rig.bellPos);

  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // --- Pass 2: Era Artistic Medium Shading ---
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, GL_SIZE, GL_SIZE);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(st.prog2);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, st.texAlbedo);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, st.texNormDep);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, st.texMatInfo);
  gl.uniform1i(u2.uTexAlbedo, 0);
  gl.uniform1i(u2.uTexNormDep, 1);
  gl.uniform1i(u2.uTexMatInfo, 2);
  gl.uniform1i(u2.uEra, era);
  gl.uniform1f(u2.uTime, time);
  gl.uniform1f(u2.uReveal, reveal);
  if (shadowTint) {
    gl.uniform4f(u2.uShadowTint, shadowTint[0], shadowTint[1], shadowTint[2], shadowTint[3]);
  } else {
    gl.uniform4f(u2.uShadowTint, 0, 0, 0, 0);
  }
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // --- Exact 0.00px Mathematical Composite onto 2D Panel Canvas ---
  ctx.save();
  ctx.translate(rig.root.x, rig.root.y);
  if (slope !== 0) ctx.rotate(slope);
  ctx.scale(s, s);
  const prevSmooth = ctx.imageSmoothingEnabled;
  if (pixelated) ctx.imageSmoothingEnabled = false;
  // vUv=(0,1) top-left maps to (BOX_X0*100, -(BOX_Y0+BOX_SPAN)*100) = (-142, -262), span = 260x260!
  ctx.drawImage(
    canvas,
    BOX_X0 * 100,
    -(BOX_Y0 + BOX_SPAN) * 100,
    BOX_SPAN * 100,
    BOX_SPAN * 100
  );
  ctx.imageSmoothingEnabled = prevSmooth;
  ctx.restore();
  return true;
}

// ============================================================================
// Seamless-Anatomy 2D Geometry Builders & Vector Helpers
// (Used for #15 Oscilloscope, #16 8-Bit Pixel Buffer, #19 Bezel-Escape Rim, & Fallbacks)
// ============================================================================

export function traceNaiwaPearBody(ctx, rig) {
  const s = rig.root.scale;
  const hd = rig.head;
  const bp = rig.bellyPatch;
  const bc = rig.bodyCenter;

  ctx.beginPath();
  ctx.moveTo(rig.snubLip.x, rig.snubLip.y);
  ctx.quadraticCurveTo(hd.x + 21 * s, hd.y - 4 * s, hd.x + 13 * s, hd.y - 16 * s);
  ctx.bezierCurveTo(
    hd.x + 2 * s,
    hd.y - 24.5 * s,
    hd.x - 16 * s,
    hd.y - 22 * s,
    hd.x - 21 * s,
    hd.y - 6 * s
  );
  ctx.bezierCurveTo(
    hd.x - 26 * s,
    hd.y + 18 * s,
    bc.x - 35 * s,
    bc.y - 16 * s,
    rig.tailBase.x,
    rig.tailBase.y - 4 * s
  );
  ctx.quadraticCurveTo(rig.tailTip.x + 8 * s, rig.tailTip.y - 6 * s, rig.tailTip.x, rig.tailTip.y);
  ctx.quadraticCurveTo(
    rig.tailTip.x + 6 * s,
    rig.tailTip.y + 13 * s,
    rig.hip.x - 16 * s,
    rig.hip.y + 10 * s
  );
  ctx.bezierCurveTo(
    bc.x - 8 * s,
    bc.y + 34 * s,
    bp.x + bp.rx + 4 * s,
    bp.y + 24 * s,
    bp.x + bp.rx + 1 * s,
    bp.y - 2 * s
  );
  ctx.quadraticCurveTo(
    bp.x + bp.rx - 2 * s,
    rig.throatTuck.y + 10 * s,
    rig.throatTuck.x,
    rig.throatTuck.y
  );
  ctx.quadraticCurveTo(rig.snubLip.x + 1 * s, rig.snubLip.y + 5 * s, rig.snubLip.x, rig.snubLip.y);
  ctx.closePath();
}

export function traceNaiwaBellyPatch(ctx, rig, scaleRx = 0.92, scaleRy = 0.96) {
  const s = rig.root.scale;
  const bp = rig.bellyPatch;
  ctx.beginPath();
  ctx.ellipse(
    bp.x + 3 * s,
    bp.y + 1 * s,
    bp.rx * scaleRx,
    bp.ry * scaleRy,
    -0.10 + rig.root.slope,
    0,
    Math.PI * 2
  );
}

/** Traces unified leg + rounded golden heel + 3-toed dinosaur foot (openHip avoids hip cut ring!) */
export function tracePlumpLeg(ctx, hipPt, kneePt, footPt, s, widthScale = 1.0, openHip = false) {
  const dx1 = kneePt.x - hipPt.x;
  const dy1 = kneePt.y - hipPt.y;
  const l1 = Math.hypot(dx1, dy1) || 1;
  const nx1 = (-dy1 / l1) * 8.8 * s * widthScale;
  const ny1 = (dx1 / l1) * 8.8 * s * widthScale;

  const dx2 = footPt.x - kneePt.x;
  const dy2 = footPt.y - kneePt.y;
  const l2 = Math.hypot(dx2, dy2) || 1;
  const nx2 = (-dy2 / l2) * 5.2 * s * widthScale;
  const ny2 = (dx2 / l2) * 5.2 * s * widthScale;

  ctx.beginPath();
  if (openHip) {
    ctx.moveTo(hipPt.x + nx1 * 0.92 + dx1 * 0.16, hipPt.y + ny1 * 0.92 + dy1 * 0.16);
  } else {
    ctx.moveTo(hipPt.x + nx1, hipPt.y + ny1);
  }
  ctx.quadraticCurveTo(
    kneePt.x + nx1 * 0.82,
    kneePt.y + ny1 * 0.82,
    footPt.x + 2.5 * s,
    footPt.y - 2.2 * s
  );
  ctx.quadraticCurveTo(footPt.x + 9.5 * s, footPt.y - 2.4 * s, footPt.x + 15.2 * s, footPt.y + 1.4 * s);
  ctx.lineTo(footPt.x + 12.4 * s, footPt.y + 4.3 * s);
  ctx.lineTo(footPt.x + 14.8 * s, footPt.y + 6.1 * s);
  ctx.lineTo(footPt.x + 8.8 * s, footPt.y + 7.3 * s);
  // Smooth rounded golden heel curving continuously back up into calf!
  ctx.lineTo(footPt.x - 4.0 * s, footPt.y + 6.3 * s);
  ctx.quadraticCurveTo(
    footPt.x - 7.6 * s,
    footPt.y + 5.4 * s,
    footPt.x - nx2 * 0.86 - 1.0 * s,
    footPt.y - ny2 * 0.86 - 2.0 * s
  );
  if (openHip) {
    ctx.quadraticCurveTo(
      kneePt.x - nx1 * 0.72,
      kneePt.y - ny1 * 0.72,
      hipPt.x - nx1 * 0.88 + dx1 * 0.24,
      hipPt.y - ny1 * 0.88 + dy1 * 0.24
    );
  } else {
    ctx.quadraticCurveTo(kneePt.x - nx1 * 0.72, kneePt.y - ny1 * 0.72, hipPt.x - nx1, hipPt.y - ny1);
    ctx.closePath();
  }
}

export function traceDinoFoot(ctx, footPt, s) {
  ctx.beginPath();
  ctx.moveTo(footPt.x + 1.5 * s, footPt.y - 2.0 * s);
  ctx.quadraticCurveTo(footPt.x + 9 * s, footPt.y - 2.6 * s, footPt.x + 15.2 * s, footPt.y + 1.4 * s);
  ctx.lineTo(footPt.x + 12.2 * s, footPt.y + 4.4 * s);
  ctx.lineTo(footPt.x + 15.0 * s, footPt.y + 6.2 * s);
  ctx.lineTo(footPt.x + 9.0 * s, footPt.y + 7.3 * s);
  ctx.lineTo(footPt.x + 0.5 * s, footPt.y + 6.4 * s);
  ctx.closePath();
}

export function traceNearArm(ctx, rig, widthScale = 1.0, openShoulder = false) {
  const s = rig.root.scale;
  const sh = rig.wingShoulder;
  const el = rig.wingElbow;
  const wr = { x: rig.wingTip.x - 5.8 * s, y: rig.wingTip.y + 0.8 * s };
  const w = widthScale * s;
  ctx.beginPath();
  if (openShoulder) {
    ctx.moveTo(sh.x + 6.5 * w, sh.y - 5.2 * w);
    ctx.quadraticCurveTo(el.x + 2.2 * w, el.y - 8.0 * w, wr.x + 4.2 * w, wr.y - 4.4 * w);
    ctx.moveTo(wr.x + 2.4 * w, wr.y + 4.8 * w);
    ctx.quadraticCurveTo(el.x - 2.8 * w, el.y + 8.8 * w, sh.x + 2.2 * w, sh.y + 8.4 * w);
  } else {
    ctx.moveTo(sh.x - 7.5 * w, sh.y - 7.2 * w);
    ctx.quadraticCurveTo(el.x + 2.2 * w, el.y - 8.2 * w, rig.wingTip.x + 4.2 * w, rig.wingTip.y - 3.6 * w);
    ctx.quadraticCurveTo(rig.wingTip.x + 5.8 * w, rig.wingTip.y + 1.2 * w, rig.wingTip.x - 1.5 * w, rig.wingTip.y + 5.2 * w);
    ctx.quadraticCurveTo(el.x - 3.2 * w, el.y + 9.0 * w, sh.x - 6.8 * w, sh.y + 9.2 * w);
    ctx.closePath();
  }
}

export function drawHighVisHandlebar(ctx, rig, opts = {}) {
  const s = rig.root.scale;
  const {
    stemStroke = '#3a352f',
    barStroke = '#4a433b',
    gripStroke = '#1f1b18',
    bellFill = '#e5bc5a',
    outlineStroke = '#1a1714',
    stemWidth = 4.2,
    showBell = true,
    showBrake = true,
    farOnly = false,
    nearOnly = false,
  } = opts;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (!nearOnly) {
    ctx.strokeStyle = barStroke;
    ctx.lineWidth = Math.max(1.2, stemWidth * 0.84 * s);
    ctx.beginPath();
    ctx.moveTo(rig.stemTop.x, rig.stemTop.y);
    ctx.quadraticCurveTo(rig.stemTop.x - 2 * s, rig.farGrip.y - 3 * s, rig.farGrip.x, rig.farGrip.y);
    ctx.stroke();

    ctx.strokeStyle = gripStroke;
    ctx.lineWidth = Math.max(1.6, stemWidth * 1.28 * s);
    ctx.beginPath();
    ctx.moveTo(rig.farGrip.x + 4 * s, rig.farGrip.y - 1.5 * s);
    ctx.lineTo(rig.farGrip.x - 4.4 * s, rig.farGrip.y + 1.3 * s);
    ctx.stroke();
  }

  if (!farOnly) {
    // Headset top locknut + gooseneck stem + forged stem clamp
    ctx.strokeStyle = stemStroke;
    ctx.lineWidth = Math.max(1.4, stemWidth * s);
    ctx.beginPath();
    ctx.moveTo(rig.headTop.x, rig.headTop.y);
    ctx.lineTo(rig.stemTop.x, rig.stemTop.y);
    ctx.quadraticCurveTo(rig.barRiser.x, rig.barRiser.y, rig.handleGrip.x, rig.handleGrip.y);
    ctx.stroke();

    ctx.fillStyle = barStroke;
    ctx.beginPath();
    ctx.arc(rig.stemTop.x, rig.stemTop.y, 2.8 * s, 0, Math.PI * 2);
    ctx.fill();

    if (showBrake) {
      ctx.strokeStyle = barStroke;
      ctx.lineWidth = Math.max(1.0, 2.1 * s);
      ctx.beginPath();
      ctx.moveTo(rig.handleGrip.x + 4.5 * s, rig.handleGrip.y - 1 * s);
      ctx.lineTo(rig.brakeTip.x, rig.brakeTip.y);
      ctx.stroke();
    }

    if (showBell) {
      ctx.fillStyle = bellFill;
      ctx.strokeStyle = outlineStroke;
      ctx.lineWidth = Math.max(0.9, 1.5 * s);
      ctx.beginPath();
      ctx.arc(rig.bellPos.x, rig.bellPos.y, 4.5 * s, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.strokeStyle = gripStroke;
    ctx.lineWidth = Math.max(1.8, (stemWidth + 1.9) * s);
    ctx.beginPath();
    ctx.moveTo(rig.handleGrip.x + 6.2 * s, rig.handleGrip.y - 2.1 * s);
    ctx.lineTo(rig.handleGrip.x - 6.4 * s, rig.handleGrip.y + 1.6 * s);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Seamless-Anatomy 2D Naiwa Renderer (used for #16 8-bit integer pixel buffer, #19 bezel-escape
 * neon wireframe, & clean 2D fallback — ZERO shoulder, hip, wrist, or heel seam lines!).
 */
export function paintNaiwaCore(ctx, rig, cfg = {}) {
  const s = rig.root.scale;
  const {
    layer = 'all',
    bodyFill = '#f4be3c',
    bodyShade = '#d98c1e',
    bodyHighlight = 'rgba(255, 245, 196, 0.36)',
    bellyFill = '#f7e6be',
    bellyStroke = 'rgba(156, 108, 34, 0.38)',
    eyeSclera = '#8bb58e',
    eyePupil = '#121614',
    eyeHighlight = true,
    eyeMode = 'normal',
    pawFill = '#4a3b28',
    outline = '#1d1915',
    outlineWidth = 2.4,
    solidPaw = false, // true in low-res 8-bit buffer where gradients aren't used
    drawHandlebar = true,
    handlebarOpts = {},
    drawCranks = false,
    crankStroke = '#3a352f',
    onAfterBodyFill = null,
    onBeforeEyes = null,
    onAfterNearArm = null,
  } = cfg;

  const lw = (w) => Math.max(0.7, w * s);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const renderSeamlessLeg = (hipPt, kneePt, footPt, pedalPt, isFar) => {
    if (drawCranks) {
      ctx.strokeStyle = crankStroke;
      ctx.lineWidth = lw(3.4);
      ctx.beginPath();
      ctx.moveTo(rig.bb.x, rig.bb.y);
      ctx.lineTo(pedalPt.x, pedalPt.y);
      ctx.stroke();
    }
    if (bodyFill !== 'transparent') {
      tracePlumpLeg(ctx, hipPt, kneePt, footPt, s, isFar ? 0.94 : 1.0, false);
      const skin = isFar ? bodyShade : bodyFill;
      if (solidPaw || pawFill === 'transparent' || pawFill === skin) {
        ctx.fillStyle = skin;
        ctx.fill();
        if (pawFill !== 'transparent' && pawFill !== skin) {
          traceDinoFoot(ctx, footPt, s);
          ctx.fillStyle = pawFill;
          ctx.fill();
        }
      } else {
        // Golden heel continuous with calf -> soft airbrushed gradient ONLY onto front 3 toes!
        const lg = ctx.createLinearGradient(
          footPt.x - 5.5 * s,
          footPt.y - 2 * s,
          footPt.x + 14.5 * s,
          footPt.y + 5 * s
        );
        lg.addColorStop(0.0, skin);
        lg.addColorStop(0.34, skin);
        lg.addColorStop(0.78, pawFill);
        lg.addColorStop(1.0, pawFill);
        ctx.fillStyle = lg;
        ctx.fill();
      }
    }
    // Open-hip contour stroke -> ZERO closed ring at hip & ZERO cut across heel!
    tracePlumpLeg(ctx, hipPt, kneePt, footPt, s, isFar ? 0.94 : 1.0, true);
    ctx.strokeStyle = outline;
    ctx.lineWidth = lw(outlineWidth * 0.86);
    ctx.stroke();
  };

  if (layer === 'all' || layer === 'back') {
    if (drawHandlebar) {
      drawHighVisHandlebar(ctx, rig, { ...handlebarOpts, farOnly: true });
    }
    if (bodyFill !== 'transparent') {
      const fg =
        solidPaw || pawFill === bodyShade
          ? bodyShade
          : (() => {
              const g = ctx.createLinearGradient(rig.farElbow.x, rig.farElbow.y, rig.farHand.x, rig.farHand.y);
              g.addColorStop(0, bodyShade);
              g.addColorStop(0.45, bodyShade);
              g.addColorStop(1, pawFill);
              return g;
            })();
      ctx.strokeStyle = fg;
      ctx.lineWidth = lw(9.2);
      ctx.beginPath();
      ctx.moveTo(rig.farShoulder.x, rig.farShoulder.y);
      ctx.quadraticCurveTo(rig.farElbow.x, rig.farElbow.y, rig.farHand.x, rig.farHand.y);
      ctx.stroke();
    }

    ctx.strokeStyle = outline;
    ctx.lineWidth = lw(outlineWidth * 0.78);
    ctx.beginPath();
    ctx.moveTo(rig.farShoulder.x + 5 * s, rig.farShoulder.y - 4.2 * s);
    ctx.quadraticCurveTo(rig.farElbow.x, rig.farElbow.y - 4.2 * s, rig.farHand.x, rig.farHand.y - 3.5 * s);
    ctx.moveTo(rig.farShoulder.x + 5 * s, rig.farShoulder.y + 4.2 * s);
    ctx.quadraticCurveTo(rig.farElbow.x, rig.farElbow.y + 4.2 * s, rig.farHand.x, rig.farHand.y + 3.5 * s);
    ctx.stroke();

    renderSeamlessLeg(rig.leftHip, rig.leftKnee, rig.leftFoot, rig.leftPedal, true);
  }

  if (layer === 'all' || layer === 'front') {
    // 1. Pear/Gourd Body + Upturned Stubby Tail
    traceNaiwaPearBody(ctx, rig);
    if (bodyFill !== 'transparent') {
      ctx.fillStyle = bodyFill;
      ctx.fill();

      ctx.save();
      ctx.clip();
      const bc = rig.bodyCenter;
      const hd = rig.head;
      const bp = rig.bellyPatch;
      const g = ctx.createLinearGradient(bc.x - 38 * s, hd.y - 22 * s, bp.x + 26 * s, bc.y + 34 * s);
      g.addColorStop(0, bodyHighlight);
      g.addColorStop(0.55, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(140, 74, 12, 0.24)');
      ctx.fillStyle = g;
      ctx.fillRect(rig.tailTip.x - 16 * s, hd.y - 34 * s, 155 * s, 175 * s);

      if (onAfterBodyFill) onAfterBodyFill(ctx, rig, s);
      ctx.restore();
    }

    traceNaiwaPearBody(ctx, rig);
    ctx.strokeStyle = outline;
    ctx.lineWidth = lw(outlineWidth);
    ctx.stroke();

    // 2. Warm-Cream Belly Patch
    traceNaiwaBellyPatch(ctx, rig);
    if (bellyFill !== 'transparent') {
      ctx.fillStyle = bellyFill;
      ctx.fill();
    }
    if (bellyStroke && bellyStroke !== 'transparent') {
      ctx.strokeStyle = bellyStroke;
      ctx.lineWidth = lw(outlineWidth * 0.58);
      ctx.stroke();
    }

    if (onBeforeEyes) onBeforeEyes(ctx, rig, s);

    // 3. Dual Side-3/4 Bulging Sage-Green Frog Eyes + Crisp Deadpan Mouth `—`
    const renderFrogEye = (ey, isFar) => {
      ctx.beginPath();
      ctx.ellipse(ey.x, ey.y, ey.rx, ey.ry, (isFar ? 0.08 : -0.06) + rig.root.slope, 0, Math.PI * 2);
      if (eyeSclera !== 'transparent') {
        ctx.fillStyle = eyeSclera;
        ctx.fill();
      }
      ctx.strokeStyle = outline;
      ctx.lineWidth = lw(outlineWidth * 0.78);
      ctx.stroke();

      if (eyeMode === 'bada') {
        ctx.fillStyle = eyePupil;
        const pw = ey.rx * 0.82;
        const ph = ey.ry * 0.56;
        ctx.fillRect(ey.x - pw * 0.5, ey.y - ey.ry * 0.86, pw, ph);
      } else {
        const prx = ey.rx * (isFar ? 0.56 : 0.58);
        const pry = ey.ry * 0.58;
        const px = ey.x + (isFar ? 1.0 : 1.2) * s;
        const py = ey.y + 0.2 * s;
        ctx.fillStyle = eyePupil;
        ctx.beginPath();
        ctx.ellipse(px, py, prx, pry, 0, 0, Math.PI * 2);
        ctx.fill();

        if (eyeHighlight && !isFar) {
          ctx.fillStyle = 'rgba(255,255,255,0.86)';
          ctx.beginPath();
          ctx.arc(px - 1.2 * s, py - 1.5 * s, 1.2 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    renderFrogEye(rig.farEye, true);
    renderFrogEye(rig.nearEye, false);

    ctx.strokeStyle = outline;
    ctx.lineWidth = lw(outlineWidth * 0.90);
    ctx.beginPath();
    ctx.moveTo(rig.mouthStart.x, rig.mouthStart.y);
    ctx.lineTo(rig.mouthEnd.x, rig.mouthEnd.y);
    ctx.stroke();

    // 4. Seamless Near Pedaling Leg + Golden Heel + 3-Toed Foot
    renderSeamlessLeg(rig.rightHip, rig.rightKnee, rig.rightFoot, rig.rightPedal, false);

    // 5. High-Visibility Near Handlebar
    if (drawHandlebar) {
      drawHighVisHandlebar(ctx, rig, { ...handlebarOpts, nearOnly: true });
    }

    // 6. Seamless Near Arm -> Airbrushed Wrist -> 4-Fingered Hand (open shoulder = ZERO shoulder cut!)
    if (bodyFill !== 'transparent') {
      traceNearArm(ctx, rig, 1.0, false);
      if (solidPaw || pawFill === 'transparent' || pawFill === bodyFill) {
        ctx.fillStyle = bodyFill;
      } else {
        const ag = ctx.createLinearGradient(rig.wingElbow.x, rig.wingElbow.y, rig.wingTip.x + 2 * s, rig.wingTip.y);
        ag.addColorStop(0.0, bodyFill);
        ag.addColorStop(0.42, bodyFill);
        ag.addColorStop(0.86, pawFill);
        ag.addColorStop(1.0, pawFill);
        ctx.fillStyle = ag;
      }
      ctx.fill();
    }
    traceNearArm(ctx, rig, 1.0, true);
    ctx.strokeStyle = outline;
    ctx.lineWidth = lw(outlineWidth * 0.88);
    ctx.stroke();

    ctx.fillStyle = pawFill === 'transparent' ? 'transparent' : pawFill;
    ctx.strokeStyle = outline;
    ctx.lineWidth = lw(outlineWidth * 0.70);
    for (let f = 0; f < 4; f++) {
      const fx = rig.wingTip.x + (3.4 - f * 2.2) * s;
      const fy = rig.wingTip.y + (-1.8 + f * 1.05) * s;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 2.15 * s, 3.1 * s, 0.24, 0, Math.PI * 2);
      if (pawFill !== 'transparent') ctx.fill();
      ctx.stroke();
    }

    if (onAfterNearArm) onAfterNearArm(ctx, rig, s);
  }

  ctx.restore();
}

// ============================================================================
// Era-Specific 3D Volumetric + Native-Medium Painters (#01 .. #20)
// ============================================================================

/** #01 Saharan Tassili Rock Painting: 3D mineral ochre + sandstone tooth + kaolin ceremonial dots */
export function paintNaiwaSahara(ctx, rig, layer = 'all', toothSampler = null) {
  if (renderNaiwa3DWebGL(ctx, rig, { era: 1, layer })) {
    if (layer === 'all' || layer === 'front') {
      const s = rig.root.scale;
      ctx.save();
      ctx.fillStyle = 'rgba(245, 232, 204, 0.72)';
      for (let k = 0; k < 6; k++) {
        const u = k / 5;
        ctx.beginPath();
        ctx.arc(rig.head.x - (19 + u * 33) * s, rig.head.y + (8 + u * 54) * s, 1.8 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    return;
  }
  paintNaiwaCore(ctx, rig, { layer, bodyFill: '#d89632', bodyShade: '#9a431e', bellyFill: '#ecd8b1', pawFill: '#452618', outline: '#2b170e' });
}

/** #02 Ancient Egyptian Tomb Fresco: 3D-sculpted orpiment gold, beaded Usekh collar, pleated Shendyt & kohl liner */
export function paintNaiwaEgypt(ctx, rig, layer = 'all') {
  if (renderNaiwa3DWebGL(ctx, rig, { era: 2, layer })) {
    if (layer === 'all' || layer === 'front') {
      const s = rig.root.scale;
      ctx.save();
      ctx.strokeStyle = '#2b160e';
      ctx.lineWidth = Math.max(1.0, 2.2 * s);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(rig.nearEye.x - rig.nearEye.rx - 0.5 * s, rig.nearEye.y - 0.5 * s);
      ctx.lineTo(rig.nearEye.x - rig.nearEye.rx - 8.0 * s, rig.nearEye.y + 1.0 * s);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  paintNaiwaCore(ctx, rig, { layer, eyeMode: 'egypt' });
}

/** #03 Eastern Han Stone-Relief Rubbing (`汉画像石乌金拓`): 3D chiseled stone relief + cloud-scroll belly intaglio */
export function paintNaiwaHan(ctx, rig, layer = 'all') {
  if (renderNaiwa3DWebGL(ctx, rig, { era: 3, layer })) return;
  paintNaiwaCore(ctx, rig, { layer, bodyFill: '#ece6da', bodyShade: '#d8d0c1', bellyFill: '#161513', outline: '#161513' });
}

/** #04 Tang Dynasty Wu Daozi Baimiao (`吴带当风`): 3D silk-gamboge Naiwa + billowing twin silk Pibo ribbons! */
export function paintNaiwaTang(ctx, rig, layer = 'all', localT = 0) {
  if (renderNaiwa3DWebGL(ctx, rig, { era: 4, layer, time: localT })) {
    return;
  }
  paintNaiwaCore(ctx, rig, { layer });
}

/** #05 Northern Song Monumental Landscape (`溪山行旅`): 3D mineral silk Naiwa + finely woven bamboo Douli on back! */
export function paintNaiwaSong(ctx, rig, layer = 'all') {
  if (layer === 'all' || layer === 'front') {
    // Draw slung woven Song traveler's bamboo conical hat (`斗笠`) tucked cleanly behind dorsal shoulder!
    const s = rig.root.scale;
    const hx = rig.head.x - 25 * s;
    const hy = rig.head.y + 19 * s;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(-1.08 + rig.root.slope);
    const hatG = ctx.createLinearGradient(-22 * s, -12 * s, 22 * s, 10 * s);
    hatG.addColorStop(0, '#dfd0a8');
    hatG.addColorStop(0.55, '#c7ad78');
    hatG.addColorStop(1, '#9c8150');
    ctx.fillStyle = hatG;
    ctx.strokeStyle = '#2b2319';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(-23 * s, 6 * s);
    ctx.quadraticCurveTo(0, -14 * s, 23 * s, 6 * s);
    ctx.quadraticCurveTo(0, 10.5 * s, -23 * s, 6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 0.85 * s;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, -6.5 * s);
      ctx.lineTo(i * 5.2 * s, 6.8 * s);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (renderNaiwa3DWebGL(ctx, rig, { era: 5, layer })) {
    if (layer === 'all' || layer === 'front') {
      const s = rig.root.scale;
      ctx.save();
      ctx.strokeStyle = '#9e3628';
      ctx.lineWidth = 1.35 * s;
      ctx.beginPath();
      ctx.moveTo(rig.throatTuck.x - 3 * s, rig.throatTuck.y + 3 * s);
      ctx.quadraticCurveTo(rig.wingShoulder.x, rig.wingShoulder.y - 2 * s, rig.head.x - 21 * s, rig.head.y + 17 * s);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  paintNaiwaCore(ctx, rig, { layer });
}

/** #06 Along the River During the Qingming Festival (`清明上河图`): 3D Song `淡彩界画` brushwork */
export function paintNaiwaQingming(ctx, rig, layer = 'all') {
  if (renderNaiwa3DWebGL(ctx, rig, { era: 6, layer })) return;
  paintNaiwaCore(ctx, rig, { layer });
}

/** #07 Maya Bark-Paper Codex: 3D solar-gold & jade Naiwa + sweeping Quetzal plumes & jade earspool! */
export function paintNaiwaMaya(ctx, rig, layer = 'all') {
  if (layer === 'all' || layer === 'front') {
    const s = rig.root.scale;
    const hx = rig.head.x - 15 * s;
    const hy = rig.head.y - 14 * s;
    ctx.save();
    for (const pl of [
      { dx: -38, dy: -13, cy: -25 },
      { dx: -44, dy: 2, cy: -10 },
      { dx: -34, dy: 14, cy: 4 },
    ]) {
      ctx.fillStyle = '#267365';
      ctx.strokeStyle = '#161311';
      ctx.lineWidth = 2.1 * s;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(hx + pl.dx * 0.55 * s, hy + pl.cy * s, hx + pl.dx * s, hy + pl.dy * s);
      ctx.quadraticCurveTo(hx + pl.dx * 0.5 * s, hy + (pl.cy + 9) * s, hx - 2 * s, hy + 5 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
  if (renderNaiwa3DWebGL(ctx, rig, { era: 7, layer })) {
    if (layer === 'all' || layer === 'front') {
      const s = rig.root.scale;
      ctx.save();
      ctx.fillStyle = '#267365';
      ctx.strokeStyle = '#161311';
      ctx.lineWidth = 2.0 * s;
      ctx.beginPath();
      ctx.arc(rig.head.x - 10 * s, rig.head.y + 3 * s, 5.2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#b83324';
      ctx.beginPath();
      ctx.arc(rig.head.x - 10 * s, rig.head.y + 3 * s, 2.0 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return;
  }
  paintNaiwaCore(ctx, rig, { layer });
}

/** #08 Mughal Imperial Miniature: 3D burnished gouache, 3D Pagri turban, emerald sarpech & radiant gold nimbus */
export function paintNaiwaMughal(ctx, rig, layer = 'all') {
  if (layer === 'all' || layer === 'front') {
    const s = rig.root.scale;
    ctx.save();
    const halo = ctx.createRadialGradient(rig.head.x, rig.head.y - 4 * s, 6 * s, rig.head.x, rig.head.y - 4 * s, 40 * s);
    halo.addColorStop(0, 'rgba(255, 242, 168, 0.55)');
    halo.addColorStop(0.68, 'rgba(232, 182, 62, 0.24)');
    halo.addColorStop(1, 'rgba(232, 182, 62, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(rig.head.x, rig.head.y - 4 * s, 40 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(244, 202, 88, 0.72)';
    ctx.lineWidth = 1.3 * s;
    ctx.beginPath();
    ctx.arc(rig.head.x, rig.head.y - 4 * s, 32 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (renderNaiwa3DWebGL(ctx, rig, { era: 8, layer })) return;
  paintNaiwaCore(ctx, rig, { layer });
}

/** #09 Bada Shanren Freehand Xieyi Ink (`八大山人写意`): 3D splash-ink dorsal shading + square skyward eye-roll! */
export function paintNaiwaBada(ctx, rig, layer = 'all') {
  if (renderNaiwa3DWebGL(ctx, rig, { era: 9, layer })) return;
  paintNaiwaCore(ctx, rig, { layer, eyeMode: 'bada' });
}

/** #10 Javanese Wayang Kulit: Backlit kelir shadow + 3D perforated `tatahan` gold-leaf puppet + horn rods! */
export function paintNaiwaWayang(lCtx, uCtx, rig, screenX = 500, screenBottomY = 860) {
  // 1. Backlit shadow silhouette onto `lCtx`
  if (!renderNaiwa3DWebGL(lCtx, rig, { era: 10, layer: 'all', shadowTint: [0.18, 0.08, 0.02, 0.88] })) {
    paintNaiwaCore(lCtx, rig, { layer: 'all', bodyFill: 'rgba(48,22,6,0.86)', pawFill: '#241005', outline: '#1c0c04' });
  }
  if (!uCtx) return;

  // 2. Crisp polychrome gold-leaf `prada` & punched `tatahan` 3D puppet onto `uCtx`
  if (!renderNaiwa3DWebGL(uCtx, rig, { era: 10, layer: 'all' })) {
    paintNaiwaCore(uCtx, rig, { layer: 'all' });
  }

  // Brass articulation rivets (`gegeling`) & curved translucent ox-horn `cempurit` rods to Dalang's hands!
  const s = rig.root.scale;
  uCtx.save();
  uCtx.fillStyle = '#ffd86b';
  uCtx.strokeStyle = '#3b1c0c';
  uCtx.lineWidth = 1.1 * s;
  for (const pt of [rig.wingShoulder, rig.wingElbow, rig.rightHip, rig.rightKnee]) {
    uCtx.beginPath();
    uCtx.arc(pt.x, pt.y, 2.5 * s, 0, Math.PI * 2);
    uCtx.fill();
    uCtx.stroke();
  }
  uCtx.strokeStyle = 'rgba(74, 38, 14, 0.78)';
  uCtx.lineWidth = 2.6 * s;
  uCtx.lineCap = 'round';
  uCtx.beginPath();
  uCtx.moveTo(rig.wingTip.x, rig.wingTip.y + 3 * s);
  uCtx.bezierCurveTo(rig.wingTip.x + 14 * s, rig.wingTip.y + 90 * s, rig.wingTip.x - 10 * s, screenBottomY - 60, rig.wingTip.x + 6 * s, screenBottomY);
  uCtx.moveTo(rig.bb.x, rig.bb.y);
  uCtx.bezierCurveTo(rig.bb.x - 12 * s, rig.bb.y + 65 * s, rig.bb.x + 8 * s, screenBottomY - 40, rig.bb.x - 4 * s, screenBottomY);
  uCtx.stroke();
  uCtx.restore();
}

/** #11 Ukiyo-e Tōkaidō Woodblock: 3D cherrywood bokashi Naiwa + fluttering Edo courier Mameshibori tails! */
export function paintNaiwaUkiyoe(ctx, rig, layer = 'all', localT = 0) {
  if (layer === 'all' || layer === 'front') {
    const s = rig.root.scale;
    const hd = rig.head;
    const flutter = Math.sin(localT * 9.0) * 5 * s;
    ctx.save();
    ctx.strokeStyle = '#1d3b5c';
    ctx.lineWidth = 3.6 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hd.x - 19 * s, hd.y - 11 * s);
    ctx.quadraticCurveTo(hd.x - 32 * s, hd.y - 16 * s + flutter, hd.x - 43 * s, hd.y - 9 * s - flutter);
    ctx.moveTo(hd.x - 19 * s, hd.y - 9 * s);
    ctx.quadraticCurveTo(hd.x - 30 * s, hd.y - 4 * s - flutter, hd.x - 40 * s, hd.y - 1 * s + flutter);
    ctx.stroke();
    ctx.restore();
  }
  if (renderNaiwa3DWebGL(ctx, rig, { era: 11, layer, time: localT })) return;
  paintNaiwaCore(ctx, rig, { layer });
}

/** #12 Van Gogh Starry Night: 3D segmented impasto + tactile hog-bristle swirling oil dabs! */
export function paintNaiwaStarry(ctx, rig, layer = 'all', localT = 0) {
  if (renderNaiwa3DWebGL(ctx, rig, { era: 12, layer, time: localT })) {
    // Overlay tactile Van Gogh hog-bristle oil strokes curving along Naiwa's silhouette & belly!
    if (layer === 'all' || layer === 'front') {
      const s = rig.root.scale;
      const bc = rig.bodyCenter;
      const hd = rig.head;
      const bp = rig.bellyPatch;
      ctx.save();
      ctx.beginPath();
      traceNaiwaPearBody(ctx, rig);
      ctx.clip();

      const strokes = [
        // Dorsal cobalt-and-gold contour dabs
        [hd.x - 17 * s, hd.y + 4 * s, 1.38, 15, 4.6, '#1d5678', '#ffe45e'],
        [bc.x - 26 * s, bc.y - 16 * s, 1.25, 17, 5.0, '#163863', '#f5b822'],
        [bc.x - 32 * s, bc.y + 2 * s, 1.05, 16, 4.8, '#216885', '#ffdf54'],
        [rig.tailBase.x + 4 * s, rig.tailBase.y - 2 * s, 0.42, 15, 4.5, '#163863', '#e88b1a'],
        // Swirling golden-amber mid-body dabs
        [hd.x - 6 * s, hd.y - 14 * s, 0.25, 14, 4.2, '#d47814', '#fff08a'],
        [bc.x - 14 * s, bc.y - 22 * s, 1.18, 15, 4.4, '#c96c12', '#ffe052'],
        [bc.x - 18 * s, bc.y - 2 * s, 1.08, 16, 4.8, '#d97d16', '#ffe86b'],
        [bc.x - 16 * s, bc.y + 16 * s, 0.65, 16, 4.8, '#bd5e10', '#ffd43b'],
        [bc.x - 2 * s, bc.y + 24 * s, 0.18, 15, 4.4, '#1d5678', '#f5be28'],
        // Swirling cream & lemon-yellow potbelly impasto dabs
        [bp.x - 8 * s, bp.y - 14 * s, -0.55, 14, 4.4, '#e6b84c', '#fffbe0'],
        [bp.x + 8 * s, bp.y - 12 * s, 0.68, 14, 4.4, '#dfad3b', '#fff9d2'],
        [bp.x + 14 * s, bp.y + 4 * s, 1.48, 15, 4.4, '#d99e2b', '#fff6c4'],
        [bp.x + 4 * s, bp.y + 17 * s, 2.35, 14, 4.2, '#cfa038', '#fff4ba'],
        [bp.x - 10 * s, bp.y + 6 * s, 1.62, 14, 4.2, '#e2b448', '#fffbe6'],
      ];

      for (const [ sx, sy, ang, len, wid, underCol, topCol ] of strokes) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(ang);
        ctx.fillStyle = underCol;
        ctx.beginPath();
        ctx.roundRect(-len * 0.5 * s, -wid * 0.5 * s, len * s, wid * s, wid * 0.45 * s);
        ctx.fill();
        ctx.fillStyle = topCol;
        ctx.beginPath();
        ctx.roundRect((-len * 0.46) * s, (-wid * 0.36) * s, len * 0.88 * s, wid * 0.62 * s, wid * 0.32 * s);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    return;
  }
  paintNaiwaCore(ctx, rig, { layer });
}

/** #13 Munch The Scream: 3D undulating Expressionist tempera & grease-crayon ribbons! */
export function paintNaiwaScream(ctx, rig, layer = 'all') {
  if (renderNaiwa3DWebGL(ctx, rig, { era: 13, layer, time: rig.time || 0 })) return;
  paintNaiwaCore(ctx, rig, { layer });
}

/** #14 Nosferatu 1922: 3D German Expressionist staircase wall shadow + electrification rim support! */
export function paintNaiwaNosferatu(ctx, rig, opts = {}) {
  const {
    shadowColor = 'rgba(15, 14, 12, 0.90)',
    rimColor = null,
    rimWidth = 2.2,
  } = opts;

  if (!rimColor && renderNaiwa3DWebGL(ctx, rig, { era: 14, layer: 'all', shadowTint: [0.055, 0.050, 0.045, 0.92] })) {
    return;
  }
  paintNaiwaCore(ctx, rig, {
    layer: 'all',
    bodyFill: shadowColor,
    bodyShade: shadowColor,
    bodyHighlight: 'rgba(0,0,0,0)',
    bellyFill: shadowColor,
    bellyStroke: 'transparent',
    eyeSclera: shadowColor,
    eyePupil: rimColor || 'rgba(222, 210, 182, 0.65)',
    eyeHighlight: false,
    pawFill: shadowColor,
    outline: rimColor || shadowColor,
    outlineWidth: rimColor ? rimWidth : 1.8,
    drawCranks: true,
    crankStroke: rimColor || shadowColor,
    handlebarOpts: {
      stemStroke: rimColor || shadowColor,
      barStroke: rimColor || shadowColor,
      gripStroke: rimColor || shadowColor,
      bellFill: shadowColor,
      outlineStroke: rimColor || shadowColor,
    },
  });
}

/** #15 1950s CRT Oscilloscope: Seamless 3D-topographic green-phosphor vector polylines for Naiwa + Cockpit! */
export function buildNaiwaOscilloscopePolylines(rig) {
  const s = rig.root.scale;
  const hd = rig.head;
  const bp = rig.bellyPatch;
  const bc = rig.bodyCenter;
  const lines = [];

  const ellipsePoly = (cx, cy, rx, ry, rot = 0, steps = 24, a0 = 0, a1 = Math.PI * 2) => {
    const pts = [];
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      const lx = Math.cos(a) * rx;
      const ly = Math.sin(a) * ry;
      pts.push([cx + lx * cr - ly * sr, cy + lx * sr + ly * cr]);
    }
    return pts;
  };

  const quadPts = (p0, p1, p2, steps = 10) => {
    const out = [];
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      out.push([
        mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
        mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
      ]);
    }
    return out;
  };

  // 1. Closed Pear/Gourd Naiwa Silhouette + Upturned Stubby Tail
  const bodyPoly = [[rig.snubLip.x, rig.snubLip.y]];
  bodyPoly.push(
    ...quadPts([rig.snubLip.x, rig.snubLip.y], [hd.x + 21 * s, hd.y - 5 * s], [hd.x + 11 * s, hd.y - 18 * s], 8),
    ...quadPts([hd.x + 11 * s, hd.y - 18 * s], [hd.x - 14 * s, hd.y - 25 * s], [hd.x - 21 * s, hd.y - 6 * s], 10),
    ...quadPts([hd.x - 21 * s, hd.y - 6 * s], [bc.x - 34 * s, bc.y - 14 * s], [rig.tailBase.x, rig.tailBase.y - 4 * s], 10),
    ...quadPts([rig.tailBase.x, rig.tailBase.y - 4 * s], [rig.tailTip.x + 6 * s, rig.tailTip.y - 6 * s], [rig.tailTip.x, rig.tailTip.y], 6),
    ...quadPts([rig.tailTip.x, rig.tailTip.y], [rig.tailTip.x + 6 * s, rig.tailTip.y + 13 * s], [rig.hip.x - 16 * s, rig.hip.y + 10 * s], 7),
    ...quadPts([rig.hip.x - 16 * s, rig.hip.y + 10 * s], [bc.x + 6 * s, bc.y + 36 * s], [bp.x + bp.rx + 1 * s, bp.y - 2 * s], 12),
    ...quadPts([bp.x + bp.rx + 1 * s, bp.y - 2 * s], [bp.x + bp.rx - 2 * s, rig.throatTuck.y + 8 * s], [rig.throatTuck.x, rig.throatTuck.y], 7),
    [rig.snubLip.x, rig.snubLip.y]
  );
  lines.push(bodyPoly);

  // 2. Round Belly Patch + 3D Topographic Wireframe Latitude Arcs (gives genuine 3D volume on CRT!)
  lines.push(ellipsePoly(bp.x + 3 * s, bp.y + 1 * s, bp.rx * 0.9, bp.ry * 0.95, -0.1, 24));
  lines.push(ellipsePoly(bc.x - 4 * s, bc.y - 6 * s, 31 * s, 9 * s, -0.08, 16, 0.15, Math.PI - 0.15));
  lines.push(ellipsePoly(bc.x - 2 * s, bc.y + 10 * s, 34 * s, 10 * s, -0.08, 16, 0.12, Math.PI - 0.12));

  // 3. Dual Bulging Frog Eyes + Eyelid Arcs + Pupils + Crisp Flat Deadpan Mouth `—`
  lines.push(ellipsePoly(rig.farEye.x, rig.farEye.y, rig.farEye.rx, rig.farEye.ry, 0.08, 16));
  lines.push(ellipsePoly(rig.farEye.x + 1 * s, rig.farEye.y, rig.farEye.rx * 0.5, rig.farEye.ry * 0.5, 0, 10));
  lines.push(ellipsePoly(rig.nearEye.x, rig.nearEye.y, rig.nearEye.rx, rig.nearEye.ry, -0.06, 18));
  lines.push(ellipsePoly(rig.nearEye.x + 1.2 * s, rig.nearEye.y, rig.nearEye.rx * 0.52, rig.nearEye.ry * 0.52, 0, 12));
  lines.push([
    [rig.mouthStart.x, rig.mouthStart.y],
    [rig.mouthEnd.x, rig.mouthEnd.y],
  ]);

  // 4. Open-Shoulder Seamless Arms + 4-Fingered Grip + Detailed Dual-Horn Riser Cockpit & Bell
  lines.push([
    [rig.farShoulder.x + 6 * s, rig.farShoulder.y],
    [rig.farElbow.x, rig.farElbow.y],
    [rig.farHand.x, rig.farHand.y],
  ]);
  lines.push([
    [rig.wingShoulder.x + 6 * s, rig.wingShoulder.y - 4.5 * s],
    ...quadPts(
      [rig.wingShoulder.x + 6 * s, rig.wingShoulder.y - 4.5 * s],
      [rig.wingElbow.x + 2 * s, rig.wingElbow.y - 7 * s],
      [rig.wingTip.x + 3 * s, rig.wingTip.y - 2.5 * s],
      6
    ),
    [rig.wingTip.x + 4 * s, rig.wingTip.y + 2.5 * s],
    ...quadPts(
      [rig.wingTip.x + 4 * s, rig.wingTip.y + 2.5 * s],
      [rig.wingElbow.x - 2 * s, rig.wingElbow.y + 7.5 * s],
      [rig.wingShoulder.x + 2 * s, rig.wingShoulder.y + 7.5 * s],
      6
    ),
  ]);
  lines.push([
    [rig.headTop.x, rig.headTop.y],
    [rig.stemTop.x, rig.stemTop.y],
    ...quadPts([rig.stemTop.x, rig.stemTop.y], [rig.barRiser.x, rig.barRiser.y], [rig.handleGrip.x, rig.handleGrip.y], 6),
  ]);
  lines.push([
    [rig.stemTop.x, rig.stemTop.y],
    [rig.farGrip.x, rig.farGrip.y],
  ]);
  lines.push(ellipsePoly(rig.bellPos.x, rig.bellPos.y, 4.4 * s, 4.4 * s, 0, 10, Math.PI, Math.PI * 2));

  // 5. Open-Hip Seamless Pedaling Legs + Rounded Heel + 3-Toed Feet
  for (const [hp, kn, ft] of [
    [rig.leftHip, rig.leftKnee, rig.leftFoot],
    [rig.rightHip, rig.rightKnee, rig.rightFoot],
  ]) {
    lines.push([
      [hp.x - 4 * s, hp.y + 6 * s],
      [kn.x - 4.5 * s, kn.y + 1 * s],
      [ft.x - 6.2 * s, ft.y + 5.2 * s],
      [ft.x + 14.5 * s, ft.y + 5.2 * s],
      [ft.x + 13.0 * s, ft.y - 0.8 * s],
      [kn.x + 5.5 * s, kn.y - 2 * s],
      [hp.x + 6.5 * s, hp.y + 4 * s],
    ]);
  }

  return lines;
}

/** #16 1980s 8-Bit Platformer: Crisp integer-grid pixel-art Naiwa with seamless shoulder/hip/heel! */
export function paintNaiwa8BitPixelBuf(bctx, rig, pxScale = 0.25) {
  bctx.save();
  bctx.scale(pxScale, pxScale);
  paintNaiwaCore(bctx, rig, {
    layer: 'all',
    bodyFill: '#f8b800',
    bodyShade: '#d87800',
    bodyHighlight: 'rgba(255, 248, 184, 0.35)',
    bellyFill: '#fce8a8',
    bellyStroke: '#885000',
    eyeSclera: '#58c870',
    eyePupil: '#101010',
    eyeHighlight: true,
    pawFill: '#683c18',
    solidPaw: false,
    outline: '#101010',
    outlineWidth: 4.0,
    handlebarOpts: {
      stemStroke: '#fcfcfc',
      barStroke: '#bcbcbc',
      gripStroke: '#101010',
      bellFill: '#f8d830',
      outlineStroke: '#101010',
      stemWidth: 5.0,
      showBrake: false,
    },
  });
  bctx.restore();
}

/** #17 2000s Desktop IM GIF: 3D Bayer-dithered 256-color GIF Naiwa with backwards 2003 cap! */
export function paintNaiwaWin2000Gif(ctx, rig, layer = 'all') {
  if (renderNaiwa3DWebGL(ctx, rig, { era: 17, layer, pixelated: true })) return;
  paintNaiwaCore(ctx, rig, { layer });
}

/** #18 2010s Vaporwave: 3D raytraced horizon-chrome & neon Fresnel rim Naiwa! */
export function paintNaiwaVaporwave(ctx, rig, layer = 'all') {
  if (renderNaiwa3DWebGL(ctx, rig, { era: 18, layer })) return;
  paintNaiwaCore(ctx, rig, { layer });
}

/** #19 2020s 9:16 Short Video: 3D golden-hour & TikTok-cyan rim-lit hero Naiwa + `#21` cycling bib! */
export function paintNaiwaShortVideo(ctx, rig, layer = 'all') {
  if (renderNaiwa3DWebGL(ctx, rig, { era: 19, layer })) {
    if (layer === 'all' || layer === 'front') {
      const s = rig.root.scale;
      const bx = rig.hip.x - 10 * s;
      const by = rig.hip.y - 12 * s;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(-0.12 + rig.root.slope);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1b1816';
      ctx.lineWidth = 1.2 * s;
      ctx.fillRect(-8 * s, -6 * s, 16 * s, 11 * s);
      ctx.strokeRect(-8 * s, -6 * s, 16 * s, 11 * s);
      ctx.fillStyle = '#111318';
      ctx.font = `700 ${Math.max(6, Math.round(7.5 * s))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('21', 0, 0);
      ctx.restore();
    }
    return;
  }
  paintNaiwaCore(ctx, rig, { layer });
}

/** #20 Generative SVG Code Art: Studio 3D Subsurface Matte-Vinyl + CAD Isoparametric Wireframe + Bézier Handles! */
export function paintNaiwaCodeArt(ctx, rig, opts = {}) {
  const {
    reveal = 1.0,
    showControlHandles = true,
  } = opts;
  const s = rig.root.scale;

  ctx.save();
  if (!renderNaiwa3DWebGL(ctx, rig, { era: 20, layer: 'all', reveal })) {
    paintNaiwaCore(ctx, rig, { layer: 'all' });
  }

  if (showControlHandles) {
    const handles = [
      { a: rig.snubLip, t: { x: rig.snubLip.x + 16 * s, y: rig.snubLip.y - 12 * s }, col: '#f78166' },
      { a: rig.nearEye, t: { x: rig.nearEye.x + 14 * s, y: rig.nearEye.y - 16 * s }, col: '#7ee787' },
      { a: rig.tailTip, t: { x: rig.tailTip.x - 16 * s, y: rig.tailTip.y - 14 * s }, col: '#58a6ff' },
      { a: rig.handleGrip, t: { x: rig.barRiser.x + 12 * s, y: rig.barRiser.y - 14 * s }, col: '#d2a8ff' },
    ];
    for (const h of handles) {
      ctx.strokeStyle = h.col;
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(h.a.x, h.a.y);
      ctx.lineTo(h.t.x, h.t.y);
      ctx.stroke();

      ctx.fillStyle = h.col;
      ctx.beginPath();
      ctx.arc(h.t.x, h.t.y, 2.6 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0d1117';
      ctx.strokeStyle = h.col;
      ctx.lineWidth = 1.5 * s;
      ctx.fillRect(h.a.x - 2.8 * s, h.a.y - 2.8 * s, 5.6 * s, 5.6 * s);
      ctx.strokeRect(h.a.x - 2.8 * s, h.a.y - 2.8 * s, 5.6 * s, 5.6 * s);
    }
  }
  ctx.restore();
}

/**
 * Closed 256-point 2D contour `[x, y][]` around `(0, -95)` for `#20`'s live 36-harmonic Fourier epicycles!
 */
export function buildNaiwaFourierContour(numSamples = 256) {
  const ctrl = [
    [13, -193],
    [18, -203],
    [8, -206],
    [-5, -218],
    [-24, -217],
    [-43, -198],
    [-58, -162],
    [-64, -137],
    [-85, -141],
    [-76, -125],
    [-56, -115],
    [-86, -92],
    [-132, -46],
    [-86, 0],
    [-40, -46],
    [-8, -25],
    [12, -46],
    [40, -46],
    [86, 0],
    [132, -46],
    [86, -92],
    [60, -113],
    [58, -142],
    [49, -151],
    [38, -142],
    [14, -148],
    [13, -135],
    [4, -168],
    [-6, -183],
  ];

  const dense = [];
  const n = ctrl.length;
  const sub = 16;
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n];
    const p1 = ctrl[i];
    const p2 = ctrl[(i + 1) % n];
    const p3 = ctrl[(i + 2) % n];
    for (let j = 0; j < sub; j++) {
      const t = j / sub;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      dense.push([x, y]);
    }
  }

  const cum = [0];
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1];
    const b = dense[i % dense.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const totalLen = cum[cum.length - 1];
  const out = [];
  let seg = 0;
  for (let k = 0; k < numSamples; k++) {
    const target = (k / numSamples) * totalLen;
    while (seg < dense.length - 1 && cum[seg + 1] < target) seg++;
    const segLen = Math.max(1e-6, cum[seg + 1] - cum[seg]);
    const u = (target - cum[seg]) / segLen;
    const a = dense[seg];
    const b = dense[(seg + 1) % dense.length];
    out.push({ x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u + 102 });
  }
  return out;
}
