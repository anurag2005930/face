/**
 * SYNAPSE BIOMETRIC AI - FACE EMOTION & HAND MOTION DETECTION SYSTEM
 * High-accuracy MediaPipe Vision Engine with Real-Time Emotion and Motion Telemetry
 */

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const CONFIG = {
  smoothingAlpha: 0.22,      // EMA smoothing factor for emotions
  motionSmoothing: 0.25,     // Velocity smoothing
  trailMaxPoints: 24,        // Max points in hand trail
  trailDurationMs: 450,      // Trail point lifespan
  minVelocityThreshold: 45,  // px/s to register as moving
  historyLength: 60,         // seconds of emotion timeline history
};

const EMOTION_PROPERTIES = {
  joy: { label: 'Joy / Happy', emoji: '😄', color: '#10b981', desc: 'Positive Valence & Open Expression' },
  surprise: { label: 'Surprised', emoji: '😲', color: '#00f2fe', desc: 'Elevated Brows & Wide Oral Aperture' },
  neutral: { label: 'Neutral', emoji: '😐', color: '#6366f1', desc: 'Baseline Equilibrium' },
  sadness: { label: 'Sadness', emoji: '😔', color: '#3b82f6', desc: 'Depressed Mouth Corners & Brow Tension' },
  anger: { label: 'Anger', emoji: '😠', color: '#ef4444', desc: 'Corrugator Brow Furrow & Oral Tension' },
  fear: { label: 'Fear / Awe', emoji: '😨', color: '#a855f7', desc: 'Widened Eyes & Elevated Tension' },
  disgust: { label: 'Disgust', emoji: '🤢', color: '#d97706', desc: 'Levator Labii Activation / Nose Wrinkle' }
};

// ==========================================
// STATE MANAGEMENT
// ==========================================
const state = {
  cameraActive: false,
  stream: null,
  activeCameraId: '',
  fps: 0,
  lastFrameTime: performance.now(),
  frameCount: 0,
  
  // Toggles
  showFaceMesh: true,
  showHandSkeleton: true,
  showMotionTrails: true,
  showBoundingBox: true,
  audioFeedback: false,
  mirrorMode: true,
  
  // Face & Emotion state
  faceDetected: false,
  faceBox: null,
  rawEmotions: { joy: 0, surprise: 0, neutral: 1, sadness: 0, anger: 0, fear: 0, disgust: 0 },
  smoothedEmotions: { joy: 0, surprise: 0, neutral: 1, sadness: 0, anger: 0, fear: 0, disgust: 0 },
  dominantEmotion: 'neutral',
  microMetrics: { smile: 0, browFurrow: 0, eyeOpenness: 0, mouthAperture: 0 },
  
  // Hand & Motion state
  handsDetected: [], // Array of detected hands
  activeGesture: 'NONE',
  gestureConfidence: 0,
  gestureHistoryCount: 0,
  handMotion: {
    speed: 0,
    smoothedSpeed: 0,
    peakSpeed: 0,
    angle: 0,
    directionName: 'STATIC',
    speedTier: 'STATIC',
    lastPosition: null,
    lastTime: performance.now(),
    trail: []
  },
  
  // Timeline sparkline history
  timelineHistory: [], // [{ time, joy, sadness, surprise, anger, neutral }]
  sessionStartTime: performance.now(),
  emotionTally: { joy: 0, surprise: 0, neutral: 0, sadness: 0, anger: 0, fear: 0, disgust: 0 }
};

// ==========================================
// AUDIO SYNTHESIZER (Web Audio API)
// ==========================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.lastSoundTime = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  playGestureChime() {
    if (!state.audioFeedback || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastSoundTime < 300) return; // Debounce
    this.lastSoundTime = now;

    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }
}
const soundFx = new SoundFX();

// ==========================================
// GEOMETRY & DISTANCE UTILS
// ==========================================
function dist3D(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y, (p1.z || 0) - (p2.z || 0));
}

function dist2D(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function angleDegrees(x1, y1, x2, y2) {
  const rad = Math.atan2(y2 - y1, x2 - x1);
  let deg = rad * (180 / Math.PI);
  return deg < 0 ? deg + 360 : deg;
}

// ==========================================
// FACE EMOTION CLASSIFIER
// ==========================================
class FaceEmotionEngine {
  classify(landmarks, width, height) {
    if (!landmarks || landmarks.length < 468) return null;

    // Key Landmark indices
    // 10: top forehead, 152: chin
    // 234: left cheekbone, 454: right cheekbone
    // 1: nose tip, 168: nose bridge
    // 61: mouth left, 291: mouth right
    // 13: upper lip center, 14: lower lip center
    // 0: upper lip outer top, 17: lower lip outer bottom
    // Left eye: 33 (outer), 133 (inner), 159 (top), 145 (bottom)
    // Right eye: 263 (outer), 362 (inner), 386 (top), 374 (bottom)
    // Left eyebrow: 70 (outer), 55 (inner), 107 (highest)
    // Right eyebrow: 300 (outer), 285 (inner), 336 (highest)

    const forehead = landmarks[10];
    const chin = landmarks[152];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];

    const faceHeight = dist2D(forehead, chin) || 1;
    const faceWidth = dist2D(leftCheek, rightCheek) || 1;

    // 1. Mouth metrics
    const mouthLeft = landmarks[61];
    const mouthRight = landmarks[291];
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const lipTop = landmarks[0];

    const mouthWidth = dist2D(mouthLeft, mouthRight) / faceWidth;
    const mouthAperture = dist2D(upperLip, lowerLip) / faceHeight;
    const avgCornerY = (mouthLeft.y + mouthRight.y) / 2;
    // When smiling, corners go UP (lower Y) relative to upper lip center
    const cornerElevation = (upperLip.y - avgCornerY) / faceHeight;

    // 2. Eye metrics (Eye Aspect Ratio)
    const leftEyeH = dist2D(landmarks[159], landmarks[145]);
    const leftEyeW = dist2D(landmarks[33], landmarks[133]) || 1;
    const leftEAR = leftEyeH / leftEyeW;

    const rightEyeH = dist2D(landmarks[386], landmarks[374]);
    const rightEyeW = dist2D(landmarks[263], landmarks[362]) || 1;
    const rightEAR = rightEyeH / rightEyeW;

    const avgEAR = (leftEAR + rightEAR) / 2;

    // 3. Eyebrow metrics
    const innerBrowDist = dist2D(landmarks[55], landmarks[285]) / faceWidth;
    const leftBrowToEye = dist2D(landmarks[107], landmarks[159]) / faceHeight;
    const rightBrowToEye = dist2D(landmarks[336], landmarks[386]) / faceHeight;
    const avgBrowElevation = (leftBrowToEye + rightBrowToEye) / 2;

    // Inner brow elevation vs outer brow elevation (for sadness)
    const innerBrowElevation = (landmarks[152].y - (landmarks[55].y + landmarks[285].y) / 2) / faceHeight;
    const outerBrowElevation = (landmarks[152].y - (landmarks[70].y + landmarks[300].y) / 2) / faceHeight;
    const sadBrowRatio = innerBrowElevation - outerBrowElevation;

    // Nose wrinkle / upper lip raise (disgust)
    const noseToLip = dist2D(landmarks[1], lipTop) / faceHeight;

    // Micro metrics for telemetry UI
    const smilePct = Math.min(100, Math.max(0, Math.round(((cornerElevation + 0.015) / 0.065) * 100)));
    const browFurrowPct = Math.min(100, Math.max(0, Math.round(((0.34 - innerBrowDist) / 0.12) * 100)));
    const eyeOpenPct = Math.min(100, Math.max(0, Math.round((avgEAR / 0.38) * 100)));
    const mouthOpenPct = Math.min(100, Math.max(0, Math.round((mouthAperture / 0.14) * 100)));

    state.microMetrics = {
      smile: smilePct,
      browFurrow: browFurrowPct,
      eyeOpenness: eyeOpenPct,
      mouthAperture: mouthOpenPct
    };

    // Calculate raw emotion confidence scores
    let joy = 0;
    let surprise = 0;
    let sadness = 0;
    let anger = 0;
    let fear = 0;
    let disgust = 0;
    let neutral = 0;

    // JOY / HAPPINESS
    if (cornerElevation > 0.012 || (mouthWidth > 0.45 && cornerElevation > 0.005)) {
      const smileScore = (cornerElevation - 0.005) * 28 + (mouthWidth - 0.38) * 3;
      joy = Math.min(1, Math.max(0, smileScore));
    }

    // SURPRISE
    if (mouthAperture > 0.045 && avgBrowElevation > 0.18) {
      const surpriseScore = (mouthAperture - 0.035) * 14 + (avgBrowElevation - 0.17) * 8 + (avgEAR - 0.28) * 4;
      surprise = Math.min(1, Math.max(0, surpriseScore));
    }

    // SADNESS
    if (cornerElevation < -0.018 || (sadBrowRatio > 0.04 && cornerElevation < -0.005)) {
      const sadScore = (-cornerElevation - 0.01) * 22 + Math.max(0, sadBrowRatio) * 6;
      sadness = Math.min(1, Math.max(0, sadScore));
    }

    // ANGER
    if (innerBrowDist < 0.28 && avgBrowElevation < 0.19 && joy < 0.15) {
      const angerScore = (0.30 - innerBrowDist) * 16 + (0.20 - avgBrowElevation) * 10;
      anger = Math.min(1, Math.max(0, angerScore));
    }

    // FEAR / AWE
    if (avgEAR > 0.34 && avgBrowElevation > 0.20 && innerBrowDist < 0.31 && joy < 0.2) {
      const fearScore = (avgEAR - 0.30) * 10 + (avgBrowElevation - 0.19) * 8;
      fear = Math.min(1, Math.max(0, fearScore));
    }

    // DISGUST
    if (noseToLip < 0.095 && cornerElevation < 0.008 && joy < 0.2) {
      const disgustScore = (0.11 - noseToLip) * 18 + (innerBrowDist < 0.29 ? 0.2 : 0);
      disgust = Math.min(1, Math.max(0, disgustScore));
    }

    // NEUTRAL: baseline when active emotions are low
    const maxActive = Math.max(joy, surprise, sadness, anger, fear, disgust);
    neutral = Math.max(0, 1 - (maxActive * 1.3));

    // Normalize probabilities
    const sum = joy + surprise + sadness + anger + fear + disgust + neutral || 1;
    return {
      joy: joy / sum,
      surprise: surprise / sum,
      sadness: sadness / sum,
      anger: anger / sum,
      fear: fear / sum,
      disgust: disgust / sum,
      neutral: neutral / sum
    };
  }
}
const emotionEngine = new FaceEmotionEngine();

// ==========================================
// HAND GESTURE & MOTION ENGINE
// ==========================================
class HandMotionEngine {
  analyzeGesture(landmarks) {
    if (!landmarks || landmarks.length < 21) return { gesture: 'NONE', confidence: 0 };

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const thumbMcp = landmarks[2];
    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const indexMcp = landmarks[5];
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const middleMcp = landmarks[9];
    const ringTip = landmarks[16];
    const ringPip = landmarks[14];
    const ringMcp = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];
    const pinkyMcp = landmarks[17];

    const handSpan = dist2D(wrist, middleMcp) || 1;

    // Check finger extension: Tip further from wrist than PIP
    const isIndexExtended = dist2D(indexTip, wrist) > dist2D(indexPip, wrist) * 1.15;
    const isMiddleExtended = dist2D(middleTip, wrist) > dist2D(middlePip, wrist) * 1.15;
    const isRingExtended = dist2D(ringTip, wrist) > dist2D(ringPip, wrist) * 1.15;
    const isPinkyExtended = dist2D(pinkyTip, wrist) > dist2D(pinkyPip, wrist) * 1.15;
    const isThumbExtended = dist2D(thumbTip, indexMcp) > dist2D(thumbMcp, indexMcp) * 1.25;

    // Pinch check: Thumb Tip close to Index Tip
    const pinchDist = dist2D(thumbTip, indexTip) / handSpan;
    const isPinching = pinchDist < 0.28;

    const extendedCount = (isIndexExtended ? 1 : 0) +
                          (isMiddleExtended ? 1 : 0) +
                          (isRingExtended ? 1 : 0) +
                          (isPinkyExtended ? 1 : 0);

    let gesture = 'TRACKING';
    let confidence = 0.85;

    // 1. PINCH / OK
    if (isPinching && isMiddleExtended && isRingExtended) {
      gesture = 'PINCH / OK 👌';
      confidence = 0.94;
    } else if (isPinching) {
      gesture = 'PINCH 🤏';
      confidence = 0.92;
    }
    // 2. FIST: zero extended fingers, thumb tucked
    else if (extendedCount === 0 && !isThumbExtended) {
      gesture = 'CLOSED FIST ✊';
      confidence = 0.95;
    }
    // 3. OPEN PALM: all 4 fingers + thumb extended
    else if (extendedCount === 4 && isThumbExtended) {
      gesture = 'OPEN PALM ✋';
      confidence = 0.97;
    }
    // 4. THUMBS UP / DOWN: fingers folded, thumb sticking out
    else if (extendedCount === 0 && isThumbExtended) {
      if (thumbTip.y < wrist.y - 0.05) {
        gesture = 'THUMBS UP 👍';
        confidence = 0.96;
      } else if (thumbTip.y > wrist.y + 0.05) {
        gesture = 'THUMBS DOWN 👎';
        confidence = 0.96;
      } else {
        gesture = 'THUMB EXTENDED 👈';
        confidence = 0.88;
      }
    }
    // 5. VICTORY / PEACE: index & middle extended
    else if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      gesture = 'PEACE / VICTORY ✌️';
      confidence = 0.95;
    }
    // 6. POINTING: only index extended
    else if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      gesture = 'POINTING ☝️';
      confidence = 0.93;
    }
    // 7. ROCK / HORNS: index & pinky extended, middle & ring folded
    else if (isIndexExtended && !isMiddleExtended && !isRingExtended && isPinkyExtended) {
      gesture = 'ROCK ON 🤘';
      confidence = 0.94;
    }
    // 8. CALL ME / PHONE: thumb & pinky extended
    else if (isThumbExtended && !isIndexExtended && !isMiddleExtended && !isRingExtended && isPinkyExtended) {
      gesture = 'CALL ME 🤙';
      confidence = 0.91;
    }
    // 9. THREE FINGERS
    else if (isIndexExtended && isMiddleExtended && isRingExtended && !isPinkyExtended) {
      gesture = 'THREE COUNT 🤟';
      confidence = 0.89;
    }

    return { gesture, confidence };
  }

  updateMotion(handLandmarksList, canvasWidth, canvasHeight) {
    const now = performance.now();
    const dt = (now - state.handMotion.lastTime) / 1000;

    if (!handLandmarksList || handLandmarksList.length === 0) {
      state.handMotion.lastPosition = null;
      state.handMotion.lastTime = now;
      state.handMotion.smoothedSpeed *= 0.8;
      if (state.handMotion.smoothedSpeed < 5) state.handMotion.smoothedSpeed = 0;
      this.updateDirectionLabel(0, 0);
      return;
    }

    // Use primary hand centroid (average of wrist and middle mcp)
    const primHand = handLandmarksList[0];
    const cx = ((primHand[0].x + primHand[9].x) / 2) * canvasWidth;
    const cy = ((primHand[0].y + primHand[9].y) / 2) * canvasHeight;

    // Add to motion trail
    state.handMotion.trail.push({ x: cx, y: cy, time: now });

    // Clean old trail points
    state.handMotion.trail = state.handMotion.trail.filter(pt => now - pt.time < CONFIG.trailDurationMs);
    if (state.handMotion.trail.length > CONFIG.trailMaxPoints) {
      state.handMotion.trail.shift();
    }

    if (state.handMotion.lastPosition && dt > 0.01) {
      const dx = cx - state.handMotion.lastPosition.x;
      const dy = cy - state.handMotion.lastPosition.y;
      const dist = Math.hypot(dx, dy);

      // Instantaneous speed in px/s
      const instSpeed = dist / dt;

      // Smooth with EMA
      state.handMotion.smoothedSpeed = (CONFIG.motionSmoothing * instSpeed) + ((1 - CONFIG.motionSmoothing) * state.handMotion.smoothedSpeed);
      if (state.handMotion.smoothedSpeed > state.handMotion.peakSpeed) {
        state.handMotion.peakSpeed = Math.round(state.handMotion.smoothedSpeed);
      }

      // Compute motion angle & direction
      if (dist > 3) {
        // angle in degrees where 0 = East, 90 = North (invert dy since screen Y goes down)
        let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        state.handMotion.angle = angle;
        this.updateDirectionLabel(angle, state.handMotion.smoothedSpeed);
      } else {
        this.updateDirectionLabel(state.handMotion.angle, state.handMotion.smoothedSpeed);
      }
    }

    state.handMotion.lastPosition = { x: cx, y: cy };
    state.handMotion.lastTime = now;
  }

  updateDirectionLabel(angle, speed) {
    if (speed < CONFIG.minVelocityThreshold) {
      state.handMotion.directionName = 'STATIC';
      state.handMotion.speedTier = 'STATIC';
      return;
    }

    // Speed tier
    if (speed < 250) {
      state.handMotion.speedTier = 'GENTLE';
    } else if (speed < 700) {
      state.handMotion.speedTier = 'MODERATE';
    } else {
      state.handMotion.speedTier = 'RAPID SWIPE';
    }

    // 8 Cardinal directions
    const dirs = [
      { name: 'EAST →', min: 337.5, max: 360 },
      { name: 'EAST →', min: 0, max: 22.5 },
      { name: 'NORTH-EAST ↗', min: 22.5, max: 67.5 },
      { name: 'NORTH ↑', min: 67.5, max: 112.5 },
      { name: 'NORTH-WEST ↖', min: 112.5, max: 157.5 },
      { name: 'WEST ←', min: 157.5, max: 202.5 },
      { name: 'SOUTH-WEST ↙', min: 202.5, max: 247.5 },
      { name: 'SOUTH ↓', min: 247.5, max: 292.5 },
      { name: 'SOUTH-EAST ↘', min: 292.5, max: 337.5 }
    ];

    for (const d of dirs) {
      if (angle >= d.min && angle < d.max) {
        state.handMotion.directionName = d.name;
        break;
      }
    }
  }
}
const handEngine = new HandMotionEngine();

// ==========================================
// CANVAS VISUAL RENDERER
// ==========================================
class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  render(video, faceLandmarks, handsList, handednessList) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Render Video Frame (Mirrored or Normal)
    ctx.save();
    if (state.mirrorMode) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    // Subtle dark cyber vignette
    const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(4, 7, 13, 0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // 2. Render Face Mesh & Bounding Box & Emotional Halo
    if (faceLandmarks && faceLandmarks.length > 0) {
      this.drawFaceOverlays(faceLandmarks, w, h);
    }

    // 3. Render Hand Trails & Skeletons
    if (handsList && handsList.length > 0) {
      this.drawHandOverlays(handsList, handednessList, w, h);
    }

    // 4. Render Hand Motion Trails
    if (state.showMotionTrails && state.handMotion.trail.length > 1) {
      this.drawMotionTrail(w, h);
    }
  }

  drawFaceOverlays(landmarks, w, h) {
    const ctx = this.ctx;
    const emotionColor = EMOTION_PROPERTIES[state.dominantEmotion]?.color || '#00f2fe';

    // Calculate face bounding box
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    landmarks.forEach(pt => {
      let x = state.mirrorMode ? (1 - pt.x) : pt.x;
      let y = pt.y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const pad = 0.05;
    const boxX = Math.max(0, (minX - pad) * w);
    const boxY = Math.max(0, (minY - pad) * h);
    const boxW = Math.min(w - boxX, (maxX - minX + pad * 2) * w);
    const boxH = Math.min(h - boxY, (maxY - minY + pad * 2) * h);
    state.faceBox = { x: boxX, y: boxY, w: boxW, h: boxH };

    // Emotional Valence Halo
    ctx.save();
    const haloGrad = ctx.createRadialGradient(
      boxX + boxW / 2, boxY + boxH / 2, boxW * 0.3,
      boxX + boxW / 2, boxY + boxH / 2, boxW * 0.8
    );
    haloGrad.addColorStop(0, 'transparent');
    haloGrad.addColorStop(0.7, `${emotionColor}18`);
    haloGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = haloGrad;
    ctx.fillRect(boxX - boxW * 0.4, boxY - boxH * 0.4, boxW * 1.8, boxH * 1.8);
    ctx.restore();

    // Bounding Box
    if (state.showBoundingBox) {
      ctx.save();
      ctx.strokeStyle = emotionColor;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = emotionColor;
      ctx.shadowBlur = 10;
      ctx.setLineDash([12, 6]);
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.setLineDash([]);

      // Corner Accents
      const cornerLen = 16;
      ctx.lineWidth = 3;
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + cornerLen);
      ctx.lineTo(boxX, boxY);
      ctx.lineTo(boxX + cornerLen, boxY);
      ctx.stroke();
      // Top-Right
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - cornerLen, boxY);
      ctx.lineTo(boxX + boxW, boxY);
      ctx.lineTo(boxX + boxW, boxY + cornerLen);
      ctx.stroke();
      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + boxH - cornerLen);
      ctx.lineTo(boxX, boxY + boxH);
      ctx.lineTo(boxX + cornerLen, boxY + boxH);
      ctx.stroke();
      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - cornerLen, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH - cornerLen);
      ctx.stroke();

      // Top Tag
      const tagText = `${EMOTION_PROPERTIES[state.dominantEmotion]?.emoji || ''} ${EMOTION_PROPERTIES[state.dominantEmotion]?.label.toUpperCase()} (${Math.round(state.smoothedEmotions[state.dominantEmotion] * 100)}%)`;
      ctx.font = '700 12px "JetBrains Mono", monospace';
      const textWidth = ctx.measureText(tagText).width;

      ctx.fillStyle = 'rgba(7, 9, 14, 0.85)';
      ctx.fillRect(boxX, boxY - 26, textWidth + 16, 22);
      ctx.strokeStyle = emotionColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, boxY - 26, textWidth + 16, 22);

      ctx.fillStyle = emotionColor;
      ctx.fillText(tagText, boxX + 8, boxY - 11);
      ctx.restore();
    }

    // Face Mesh Points
    if (state.showFaceMesh) {
      ctx.save();
      // Key feature indices: lips, eyes, eyebrows, oval outline
      const keyMeshIndices = [
        // Oval
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152,
        148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
        // Lips outer
        61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 61,
        // Lips inner
        78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 78,
        // Left eye
        33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33,
        // Right eye
        263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466, 263,
        // Eyebrows
        70, 63, 105, 66, 107, 55, 65, 52, 53, 46,
        300, 293, 334, 296, 336, 285, 295, 282, 283, 276
      ];

      ctx.fillStyle = 'rgba(0, 242, 254, 0.65)';
      for (let i = 0; i < keyMeshIndices.length; i++) {
        const pt = landmarks[keyMeshIndices[i]];
        if (!pt) continue;
        const px = (state.mirrorMode ? (1 - pt.x) : pt.x) * w;
        const py = pt.y * h;
        ctx.beginPath();
        ctx.arc(px, py, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Highlight mouth curve
      ctx.strokeStyle = emotionColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const mouthPts = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
      for (let i = 0; i < mouthPts.length; i++) {
        const pt = landmarks[mouthPts[i]];
        const px = (state.mirrorMode ? (1 - pt.x) : pt.x) * w;
        const py = pt.y * h;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  drawHandOverlays(handsList, handednessList, w, h) {
    const ctx = this.ctx;

    // 21 hand connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [9, 13], [13, 14], [14, 15], [15, 16],// Ring
      [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
      [0, 17]                               // Palm base
    ];

    handsList.forEach((landmarks, handIndex) => {
      const handedness = handednessList && handednessList[handIndex] ? handednessList[handIndex].label : 'Hand';
      // Adjust label for mirror
      const displayLabel = state.mirrorMode ? (handedness === 'Left' ? 'Right' : 'Left') : handedness;

      // Draw Bones
      if (state.showHandSkeleton) {
        ctx.save();
        ctx.lineWidth = 2.5;
        connections.forEach(([i, j]) => {
          const p1 = landmarks[i];
          const p2 = landmarks[j];
          const x1 = (state.mirrorMode ? (1 - p1.x) : p1.x) * w;
          const y1 = p1.y * h;
          const x2 = (state.mirrorMode ? (1 - p2.x) : p2.x) * w;
          const y2 = p2.y * h;

          const grad = ctx.createLinearGradient(x1, y1, x2, y2);
          grad.addColorStop(0, '#00f2fe');
          grad.addColorStop(1, '#9d4edd');

          ctx.strokeStyle = grad;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        });

        // Draw Joints
        landmarks.forEach((pt, idx) => {
          const px = (state.mirrorMode ? (1 - pt.x) : pt.x) * w;
          const py = pt.y * h;
          const isTip = [4, 8, 12, 16, 20].includes(idx);

          ctx.beginPath();
          ctx.arc(px, py, isTip ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = isTip ? '#00f2fe' : '#ffffff';
          ctx.shadowColor = '#00f2fe';
          ctx.shadowBlur = isTip ? 12 : 6;
          ctx.fill();
        });
        ctx.restore();
      }

      // Hand centroid HUD tag
      const wrist = landmarks[0];
      const middleMcp = landmarks[9];
      const hx = (state.mirrorMode ? (1 - ((wrist.x + middleMcp.x) / 2)) : ((wrist.x + middleMcp.x) / 2)) * w;
      const hy = ((wrist.y + middleMcp.y) / 2) * h - 35;

      ctx.save();
      const gestureLabel = `${displayLabel}: ${state.activeGesture}`;
      ctx.font = '700 11px "JetBrains Mono", monospace';
      const textW = ctx.measureText(gestureLabel).width;

      ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
      ctx.fillRect(hx - textW / 2 - 8, hy - 14, textW + 16, 22);
      ctx.strokeStyle = '#9d4edd';
      ctx.lineWidth = 1;
      ctx.strokeRect(hx - textW / 2 - 8, hy - 14, textW + 16, 22);

      ctx.fillStyle = '#f8fafc';
      ctx.fillText(gestureLabel, hx - textW / 2, hy + 2);
      ctx.restore();
    });
  }

  drawMotionTrail(w, h) {
    const ctx = this.ctx;
    const trail = state.handMotion.trail;
    const now = performance.now();

    ctx.save();
    for (let i = 1; i < trail.length; i++) {
      const p1 = trail[i - 1];
      const p2 = trail[i];
      const age = now - p2.time;
      const alpha = Math.max(0, 1 - (age / CONFIG.trailDurationMs));

      // Adjust coordinate for mirror mode
      const x1 = state.mirrorMode ? (w - p1.x) : p1.x;
      const y1 = p1.y;
      const x2 = state.mirrorMode ? (w - p2.x) : p2.x;
      const y2 = p2.y;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(0, 242, 254, ${alpha * 0.85})`;
      ctx.lineWidth = alpha * 7 + 1;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 12;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ==========================================
// TELEMETRY & UI UPDATER
// ==========================================
class UIController {
  constructor() {
    this.elements = {};
    this.timelineCanvas = document.getElementById('emotion-timeline-canvas');
    this.timelineCtx = this.timelineCanvas ? this.timelineCanvas.getContext('2d') : null;
  }

  cacheElements() {
    this.elements = {
      fpsDisplay: document.getElementById('fps-display'),
      dominantBadge: document.getElementById('dominant-badge'),
      dominantAvatar: document.getElementById('dominant-avatar'),
      dominantName: document.getElementById('dominant-name'),
      dominantSubtitle: document.getElementById('dominant-subtitle'),
      dominantScore: document.getElementById('dominant-score'),
      
      // Emotion progress bars
      fillJoy: document.getElementById('fill-joy'),
      valJoy: document.getElementById('val-joy'),
      fillSurprise: document.getElementById('fill-surprise'),
      valSurprise: document.getElementById('val-surprise'),
      fillNeutral: document.getElementById('fill-neutral'),
      valNeutral: document.getElementById('val-neutral'),
      fillSadness: document.getElementById('fill-sadness'),
      valSadness: document.getElementById('val-sadness'),
      fillAnger: document.getElementById('fill-anger'),
      valAnger: document.getElementById('val-anger'),
      fillFear: document.getElementById('fill-fear'),
      valFear: document.getElementById('val-fear'),
      fillDisgust: document.getElementById('fill-disgust'),
      valDisgust: document.getElementById('val-disgust'),
      
      // Micro metrics
      metricSmile: document.getElementById('metric-smile'),
      metricBrow: document.getElementById('metric-brow'),
      metricEye: document.getElementById('metric-eye'),
      metricMouth: document.getElementById('metric-mouth'),
      
      // Hand & Gesture UI
      gestureIcon: document.getElementById('gesture-icon'),
      gestureName: document.getElementById('gesture-name'),
      gestureConf: document.getElementById('gesture-confidence'),
      speedValue: document.getElementById('speed-value'),
      speedTier: document.getElementById('speed-tier'),
      compassNeedle: document.getElementById('compass-needle'),
      directionLabel: document.getElementById('direction-label'),
      handLeftBadge: document.getElementById('hand-left-badge'),
      handRightBadge: document.getElementById('hand-right-badge'),
      
      // Session summary stats
      sessionDominant: document.getElementById('stat-session-dominant'),
      sessionGestures: document.getElementById('stat-session-gestures'),
      sessionPeakSpeed: document.getElementById('stat-session-peak-speed'),
      sessionUptime: document.getElementById('stat-session-uptime'),
      
      // Camera placeholder
      cameraPlaceholder: document.getElementById('camera-placeholder'),
      toastContainer: document.getElementById('toast-container')
    };
  }

  update(timestamp) {
    const el = this.elements;
    if (!el.fpsDisplay) return;

    // FPS
    el.fpsDisplay.textContent = `${state.fps} FPS`;

    // Dominant Emotion
    const dom = state.dominantEmotion;
    const domProp = EMOTION_PROPERTIES[dom] || EMOTION_PROPERTIES.neutral;
    const domScorePct = Math.round((state.smoothedEmotions[dom] || 0) * 100);

    el.dominantAvatar.textContent = domProp.emoji;
    el.dominantName.textContent = domProp.label.toUpperCase();
    el.dominantName.style.color = domProp.color;
    el.dominantSubtitle.textContent = domProp.desc;
    el.dominantScore.textContent = `${domScorePct}%`;
    el.dominantScore.style.color = domProp.color;

    // Progress Bars
    const keys = ['joy', 'surprise', 'neutral', 'sadness', 'anger', 'fear', 'disgust'];
    keys.forEach(k => {
      const pct = Math.round((state.smoothedEmotions[k] || 0) * 100);
      const capKey = k.charAt(0).toUpperCase() + k.slice(1);
      if (el[`fill${capKey}`]) el[`fill${capKey}`].style.width = `${pct}%`;
      if (el[`val${capKey}`]) el[`val${capKey}`].textContent = `${pct}%`;
    });

    // Micro metrics
    if (el.metricSmile) el.metricSmile.textContent = `${state.microMetrics.smile}%`;
    if (el.metricBrow) el.metricBrow.textContent = `${state.microMetrics.browFurrow}%`;
    if (el.metricEye) el.metricEye.textContent = `${state.microMetrics.eyeOpenness}%`;
    if (el.metricMouth) el.metricMouth.textContent = `${state.microMetrics.mouthAperture}%`;

    // Gesture
    const gName = state.activeGesture || 'NONE';
    el.gestureName.textContent = gName;
    el.gestureConf.textContent = state.gestureConfidence > 0 ? `CONFIDENCE: ${Math.round(state.gestureConfidence * 100)}%` : 'SEARCHING...';

    // Gesture Icon
    if (gName.includes('✌️') || gName.includes('PEACE')) el.gestureIcon.textContent = '✌️';
    else if (gName.includes('✊') || gName.includes('FIST')) el.gestureIcon.textContent = '✊';
    else if (gName.includes('✋') || gName.includes('PALM')) el.gestureIcon.textContent = '✋';
    else if (gName.includes('👍')) el.gestureIcon.textContent = '👍';
    else if (gName.includes('👎')) el.gestureIcon.textContent = '👎';
    else if (gName.includes('☝️') || gName.includes('POINT')) el.gestureIcon.textContent = '☝️';
    else if (gName.includes('👌') || gName.includes('PINCH')) el.gestureIcon.textContent = '👌';
    else if (gName.includes('🤘') || gName.includes('ROCK')) el.gestureIcon.textContent = '🤘';
    else el.gestureIcon.textContent = '👋';

    // Motion Speed & Compass
    const speed = Math.round(state.handMotion.smoothedSpeed);
    el.speedValue.textContent = speed;
    el.speedTier.textContent = state.handMotion.speedTier;
    el.directionLabel.textContent = state.handMotion.directionName;

    // Rotate compass needle: 0 deg = East, needle starts pointing North
    // North is 90 in standard, needle points UP (0 rot). So rot = 90 - angle
    const needleRotation = 90 - state.handMotion.angle;
    el.compassNeedle.style.transform = `rotate(${needleRotation}deg)`;

    // Hands detected status pills
    const hasLeft = state.handsDetected.some(h => h.label === 'Left');
    const hasRight = state.handsDetected.some(h => h.label === 'Right');
    if (el.handLeftBadge) el.handLeftBadge.classList.toggle('active', hasLeft);
    if (el.handRightBadge) el.handRightBadge.classList.toggle('active', hasRight);

    // Session Stats
    const sessionSeconds = Math.floor((performance.now() - state.sessionStartTime) / 1000);
    const mins = Math.floor(sessionSeconds / 60);
    const secs = sessionSeconds % 60;
    if (el.sessionUptime) el.sessionUptime.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (el.sessionPeakSpeed) el.sessionPeakSpeed.textContent = `${state.handMotion.peakSpeed} px/s`;
    if (el.sessionGestures) el.sessionGestures.textContent = state.gestureHistoryCount;

    // Dominant Session Overall
    let topSessionEmotion = 'neutral';
    let topTally = -1;
    for (const [em, tally] of Object.entries(state.emotionTally)) {
      if (tally > topTally) {
        topTally = tally;
        topSessionEmotion = em;
      }
    }
    if (el.sessionDominant) el.sessionDominant.textContent = topSessionEmotion.toUpperCase();

    // Render Sparkline
    this.renderTimeline();
  }

  renderTimeline() {
    const canvas = this.timelineCanvas;
    const ctx = this.timelineCtx;
    if (!canvas || !ctx) return;

    const w = canvas.width = canvas.clientWidth * window.devicePixelRatio;
    const h = canvas.height = canvas.clientHeight * window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    const history = state.timelineHistory;
    if (history.length < 2) return;

    // Draw sparklines for Joy (Emerald) and Surprise (Cyan)
    const drawLine = (prop, color) => {
      ctx.beginPath();
      ctx.lineWidth = 2 * window.devicePixelRatio;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;

      const step = w / (CONFIG.historyLength - 1);
      history.forEach((pt, i) => {
        const x = i * step;
        const val = pt[prop] || 0;
        const y = h - (val * (h * 0.85) + h * 0.08);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    drawLine('joy', '#10b981');
    drawLine('surprise', '#00f2fe');
    drawLine('sadness', '#3b82f6');
  }

  showToast(message, type = 'info') {
    const container = this.elements.toastContainer;
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span style="color: ${type === 'success' ? 'var(--neon-emerald)' : 'var(--neon-cyan)'}">✦</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}
const ui = new UIController();

// ==========================================
// WEBCAM & MEDIAPIPE ORCHESTRATOR
// ==========================================
class BiometricApp {
  constructor() {
    this.video = document.getElementById('webcam-video');
    this.canvas = document.getElementById('overlay-canvas');
    this.renderer = new CanvasRenderer(this.canvas);
    this.cameraSelect = document.getElementById('camera-select');
    
    this.faceMesh = null;
    this.hands = null;
    
    this.isFaceProcessing = false;
    this.isHandsProcessing = false;
    
    this.latestFaceLandmarks = null;
    this.latestHands = [];
    this.latestHandedness = [];
    
    this.prevGesture = 'NONE';
  }

  async init() {
    ui.cacheElements();
    this.setupEventListeners();
    await this.initMediaPipe();
    await this.listCameras();
    
    // Auto-start camera
    await this.startCamera();
    this.startMainLoop();
    this.startTimelineSampler();
  }

  setupEventListeners() {
    // Camera toggle button in placeholder
    const startCamBtn = document.getElementById('btn-start-camera');
    if (startCamBtn) {
      startCamBtn.addEventListener('click', () => {
        soundFx.init();
        this.startCamera();
      });
    }

    // Camera selection
    if (this.cameraSelect) {
      this.cameraSelect.addEventListener('change', (e) => {
        state.activeCameraId = e.target.value;
        this.startCamera(state.activeCameraId);
      });
    }

    // Toggles
    const toggleMesh = document.getElementById('toggle-face-mesh');
    if (toggleMesh) {
      toggleMesh.addEventListener('click', () => {
        state.showFaceMesh = !state.showFaceMesh;
        toggleMesh.classList.toggle('active', state.showFaceMesh);
      });
    }

    const toggleHands = document.getElementById('toggle-hand-skeleton');
    if (toggleHands) {
      toggleHands.addEventListener('click', () => {
        state.showHandSkeleton = !state.showHandSkeleton;
        toggleHands.classList.toggle('active', state.showHandSkeleton);
      });
    }

    const toggleTrails = document.getElementById('toggle-motion-trails');
    if (toggleTrails) {
      toggleTrails.addEventListener('click', () => {
        state.showMotionTrails = !state.showMotionTrails;
        toggleTrails.classList.toggle('active', state.showMotionTrails);
      });
    }

    const toggleBox = document.getElementById('toggle-bounding-box');
    if (toggleBox) {
      toggleBox.addEventListener('click', () => {
        state.showBoundingBox = !state.showBoundingBox;
        toggleBox.classList.toggle('active', state.showBoundingBox);
      });
    }

    const toggleMirror = document.getElementById('btn-mirror-toggle');
    if (toggleMirror) {
      toggleMirror.addEventListener('click', () => {
        state.mirrorMode = !state.mirrorMode;
        toggleMirror.classList.toggle('active', state.mirrorMode);
        ui.showToast(`Mirror mode: ${state.mirrorMode ? 'ON' : 'OFF'}`);
      });
    }

    const toggleAudio = document.getElementById('btn-audio-toggle');
    if (toggleAudio) {
      toggleAudio.addEventListener('click', () => {
        soundFx.init();
        state.audioFeedback = !state.audioFeedback;
        toggleAudio.classList.toggle('active', state.audioFeedback);
        ui.showToast(`Audio Synth Chimes: ${state.audioFeedback ? 'ENABLED' : 'MUTED'}`);
      });
    }

    // Snapshot
    const snapBtn = document.getElementById('btn-snapshot');
    if (snapBtn) {
      snapBtn.addEventListener('click', () => this.captureSnapshot());
    }

    // Export Session CSV
    const exportBtn = document.getElementById('btn-export-session');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportSessionCSV());
    }
  }

  async listCameras() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      this.cameraSelect.innerHTML = '';
      
      videoDevices.forEach((dev, idx) => {
        const opt = document.createElement('option');
        opt.value = dev.deviceId;
        opt.textContent = dev.label || `Camera ${idx + 1}`;
        this.cameraSelect.appendChild(opt);
      });
      
      if (videoDevices.length > 0) {
        state.activeCameraId = videoDevices[0].deviceId;
      }
    } catch (e) {
      console.warn("Could not list video devices:", e);
    }
  }

  async initMediaPipe() {
    try {
      // 1. Face Mesh
      this.faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      this.faceMesh.onResults((results) => {
        this.isFaceProcessing = false;
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          state.faceDetected = true;
          this.latestFaceLandmarks = results.multiFaceLandmarks[0];

          // Compute emotions
          const raw = emotionEngine.classify(this.latestFaceLandmarks, this.canvas.width, this.canvas.height);
          if (raw) {
            state.rawEmotions = raw;
            // Smooth with EMA
            let maxScore = -1;
            let dominant = 'neutral';

            for (const [key, val] of Object.entries(raw)) {
              state.smoothedEmotions[key] = (CONFIG.smoothingAlpha * val) + ((1 - CONFIG.smoothingAlpha) * state.smoothedEmotions[key]);
              if (state.smoothedEmotions[key] > maxScore) {
                maxScore = state.smoothedEmotions[key];
                dominant = key;
              }
            }
            state.dominantEmotion = dominant;
            state.emotionTally[dominant] = (state.emotionTally[dominant] || 0) + 1;
          }
        } else {
          state.faceDetected = false;
          this.latestFaceLandmarks = null;
        }
      });

      // 2. Hands
      this.hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55
      });
      this.hands.onResults((results) => {
        this.isHandsProcessing = false;
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          this.latestHands = results.multiHandLandmarks;
          this.latestHandedness = results.multiHandedness || [];

          state.handsDetected = this.latestHandedness.map(h => ({
            label: state.mirrorMode ? (h.label === 'Left' ? 'Right' : 'Left') : h.label,
            score: h.score
          }));

          // Analyze gestures of primary hand
          const { gesture, confidence } = handEngine.analyzeGesture(this.latestHands[0]);
          state.activeGesture = gesture;
          state.gestureConfidence = confidence;

          if (gesture !== 'TRACKING' && gesture !== 'NONE' && gesture !== this.prevGesture) {
            state.gestureHistoryCount++;
            soundFx.playGestureChime();
            this.prevGesture = gesture;
          }

          // Update motion speed & direction
          handEngine.updateMotion(this.latestHands, this.canvas.width, this.canvas.height);
        } else {
          this.latestHands = [];
          this.latestHandedness = [];
          state.handsDetected = [];
          state.activeGesture = 'NONE';
          state.gestureConfidence = 0;
          this.prevGesture = 'NONE';
          handEngine.updateMotion([], this.canvas.width, this.canvas.height);
        }
      });

      ui.showToast('MediaPipe Face & Hand AI Engines Ready', 'success');
    } catch (e) {
      console.error("MediaPipe initialization error:", e);
      ui.showToast('AI Model initialization failed. Check internet connection.', 'error');
    }
  }

  async startCamera(deviceId = '') {
    if (state.stream) {
      state.stream.getTracks().forEach(t => t.stop());
    }

    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
        ...(deviceId ? { deviceId: { exact: deviceId } } : {})
      },
      audio: false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      state.stream = stream;
      this.video.srcObject = stream;

      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play();
          this.canvas.width = this.video.videoWidth || 1280;
          this.canvas.height = this.video.videoHeight || 720;
          state.cameraActive = true;
          if (ui.elements.cameraPlaceholder) {
            ui.elements.cameraPlaceholder.classList.add('hidden');
          }
          resolve();
        };
      });

      ui.showToast('Webcam feed online and calibrated', 'success');
    } catch (e) {
      console.error("Camera access failed:", e);
      ui.showToast(`Camera access failed: ${e.message}`, 'error');
    }
  }

  startMainLoop() {
    const loop = async () => {
      const now = performance.now();
      state.frameCount++;

      if (now - state.lastFrameTime >= 1000) {
        state.fps = state.frameCount;
        state.frameCount = 0;
        state.lastFrameTime = now;
      }

      if (state.cameraActive && this.video.readyState >= 2) {
        // Render Canvas
        this.renderer.render(
          this.video,
          this.latestFaceLandmarks,
          this.latestHands,
          this.latestHandedness
        );

        // Send frames to MediaPipe asynchronously
        if (this.faceMesh && !this.isFaceProcessing) {
          this.isFaceProcessing = true;
          this.faceMesh.send({ image: this.video }).catch(() => { this.isFaceProcessing = false; });
        }

        if (this.hands && !this.isHandsProcessing) {
          this.isHandsProcessing = true;
          this.hands.send({ image: this.video }).catch(() => { this.isHandsProcessing = false; });
        }

        // Update UI
        ui.update(now);
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  startTimelineSampler() {
    // Collect 1 point per second for emotion sparklines
    setInterval(() => {
      if (!state.cameraActive) return;
      state.timelineHistory.push({
        joy: state.smoothedEmotions.joy,
        surprise: state.smoothedEmotions.surprise,
        sadness: state.smoothedEmotions.sadness,
        anger: state.smoothedEmotions.anger,
        neutral: state.smoothedEmotions.neutral
      });

      if (state.timelineHistory.length > CONFIG.historyLength) {
        state.timelineHistory.shift();
      }
    }, 1000);
  }

  captureSnapshot() {
    if (!state.cameraActive) {
      ui.showToast('Camera is inactive');
      return;
    }

    try {
      const dataUrl = this.canvas.toDataURL('image/png');
      const telemetry = {
        dominantEmotion: state.dominantEmotion,
        emotionScores: state.smoothedEmotions,
        activeGesture: state.activeGesture,
        handMotionSpeed: Math.round(state.handMotion.smoothedSpeed),
        handMotionDirection: state.handMotion.directionName,
        timestamp: new Date().toISOString()
      };

      // Create download link
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `biometric_capture_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Attempt to save to local server
      fetch('/api/save-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, telemetry })
      }).then(r => r.json()).then(res => {
        if (res.success) {
          ui.showToast(`Snapshot saved: ${res.filename}`, 'success');
        }
      }).catch(() => {
        ui.showToast('Snapshot downloaded locally', 'success');
      });
    } catch (e) {
      console.error("Snapshot error:", e);
      ui.showToast('Failed to generate snapshot', 'error');
    }
  }

  exportSessionCSV() {
    if (state.timelineHistory.length === 0) {
      ui.showToast('No session data to export yet');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,Second,Joy,Surprise,Sadness,Anger,Neutral\n';
    state.timelineHistory.forEach((row, i) => {
      csvContent += `${i + 1},${row.joy.toFixed(3)},${row.surprise.toFixed(3)},${row.sadness.toFixed(3)},${row.anger.toFixed(3)},${row.neutral.toFixed(3)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `emotion_session_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    ui.showToast('Session telemetry exported to CSV', 'success');
  }
}

// ==========================================
// START APPLICATION ON LOAD
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  const app = new BiometricApp();
  app.init();
});
