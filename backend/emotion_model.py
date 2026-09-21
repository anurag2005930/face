import cv2
import numpy as np
from typing import List, Dict, Any, Tuple

class EmotionDetector:
    EMOTIONS = ["Angry", "Disgust", "Fear", "Happy", "Neutral", "Sad", "Surprise"]
    
    EMOTION_EMOJIS = {
        "Happy": "😊",
        "Sad": "😢",
        "Angry": "😠",
        "Surprise": "😲",
        "Fear": "😨",
        "Disgust": "🤢",
        "Neutral": "😐"
    }

    EMOTION_COLORS = {
        "Happy": "#10b981",    # Emerald
        "Surprise": "#f59e0b", # Amber
        "Neutral": "#06b6d4",  # Cyan
        "Sad": "#6366f1",      # Indigo
        "Angry": "#ef4444",    # Red
        "Fear": "#8b5cf6",     # Purple
        "Disgust": "#84cc16"   # Lime
    }

    def __init__(self):
        # Load OpenCV cascades for face, eye, and smile detection
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        self.eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_eye.xml"
        )
        self.smile_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_smile.xml"
        )
        print("[EmotionDetector] Initialized computer vision cascades successfully.")

    def detect_emotions(self, frame_bgr: np.ndarray) -> List[Dict[str, Any]]:
        """
        Processes a BGR image frame and returns a list of detected faces
        along with emotion probabilities, dominant emotion, and bounding boxes.
        """
        h, w = frame_bgr.shape[:2]
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        
        # Optimize contrast with histogram equalization
        gray_eq = cv2.equalizeHist(gray)

        # Detect faces with tuned parameters
        faces = self.face_cascade.detectMultiScale(
            gray_eq,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(60, 60),
            flags=cv2.CASCADE_SCALE_IMAGE
        )

        results = []

        for (x, y, fw, fh) in faces:
            roi_gray = gray_eq[y:y+fh, x:x+fw]
            roi_color = frame_bgr[y:y+fh, x:x+fw]

            # 1. Geometric facial feature analysis
            # Detect eyes in upper 55% of face
            upper_face = roi_gray[0:int(fh * 0.55), :]
            eyes = self.eye_cascade.detectMultiScale(
                upper_face,
                scaleFactor=1.1,
                minNeighbors=4,
                minSize=(int(fw * 0.15), int(fh * 0.15))
            )

            # Detect smile in lower 50% of face
            lower_face = roi_gray[int(fh * 0.50):fh, :]
            smiles = self.smile_cascade.detectMultiScale(
                lower_face,
                scaleFactor=1.3,
                minNeighbors=15,
                minSize=(int(fw * 0.25), int(fh * 0.15))
            )

            # 2. Gradient & texture analysis for brow furrowing / tension
            brow_region = roi_gray[int(fh * 0.15):int(fh * 0.35), int(fw * 0.2):int(fw * 0.8)]
            brow_variance = np.var(brow_region) if brow_region.size > 0 else 0
            
            # Mouth region aspect ratio and openness
            mouth_region = lower_face[int(fh * 0.15):int(fh * 0.45), int(fw * 0.2):int(fw * 0.8)]
            mouth_mean_intensity = np.mean(mouth_region) if mouth_region.size > 0 else 128

            # Eye openness & symmetry
            eye_count = len(eyes)
            smile_count = len(smiles)

            # 3. Probabilistic Emotion Model (Softmax scoring based on multi-cue fusion)
            raw_scores = {
                "Happy": 0.1,
                "Neutral": 0.35,
                "Surprise": 0.1,
                "Sad": 0.15,
                "Angry": 0.1,
                "Fear": 0.08,
                "Disgust": 0.07
            }

            # Smile cues
            if smile_count > 0:
                # Strong smile detected
                smile_intensity = min(1.0, smile_count * 0.6)
                raw_scores["Happy"] += 2.2 * smile_intensity
                raw_scores["Neutral"] *= 0.2
                raw_scores["Sad"] *= 0.1
                raw_scores["Angry"] *= 0.1
            else:
                # Lip curvature check
                if mouth_mean_intensity < 90:
                    # Open mouth (Surprise or Happy)
                    if eye_count >= 2:
                        raw_scores["Surprise"] += 1.6
                        raw_scores["Fear"] += 0.5
                elif mouth_mean_intensity > 150:
                    raw_scores["Sad"] += 0.4
                    raw_scores["Neutral"] += 0.3

            # Brow furrow / tension cues (Angry vs Sad vs Neutral)
            if brow_variance > 1800:
                raw_scores["Angry"] += 1.4
                raw_scores["Disgust"] += 0.8
                raw_scores["Neutral"] *= 0.4
            elif brow_variance > 1200:
                raw_scores["Sad"] += 0.9
                raw_scores["Fear"] += 0.5

            # Eye cues
            if eye_count >= 2:
                eye_w = sum(e[2] for e in eyes) / eye_count
                if eye_w > fw * 0.22:
                    raw_scores["Surprise"] += 1.2
                    raw_scores["Fear"] += 0.6
            elif eye_count == 0:
                # Squinting or blinking
                raw_scores["Happy"] += 0.3
                raw_scores["Disgust"] += 0.5

            # Softmax normalization
            exp_scores = {k: np.exp(v) for k, v in raw_scores.items()}
            sum_exp = sum(exp_scores.values())
            probabilities = {k: round((v / sum_exp) * 100, 1) for k, v in exp_scores.items()}

            # Find dominant emotion
            dominant_emotion = max(probabilities.items(), key=lambda item: item[1])[0]
            confidence = probabilities[dominant_emotion]

            # Format landmarks for UI display
            formatted_eyes = [[int(x + ex), int(y + ey), int(ew), int(eh)] for (ex, ey, ew, eh) in eyes]
            formatted_smiles = [[int(x + sx), int(y + int(fh * 0.5) + sy), int(sw), int(sh)] for (sx, sy, sw, sh) in smiles]

            results.append({
                "bbox": {
                    "x": int(x),
                    "y": int(y),
                    "width": int(fw),
                    "height": int(fh)
                },
                "dominant_emotion": dominant_emotion,
                "confidence": confidence,
                "emoji": self.EMOTION_EMOJIS.get(dominant_emotion, "😐"),
                "color": self.EMOTION_COLORS.get(dominant_emotion, "#06b6d4"),
                "probabilities": probabilities,
                "landmarks": {
                    "eyes": formatted_eyes,
                    "smiles": formatted_smiles
                }
            })

        return results
