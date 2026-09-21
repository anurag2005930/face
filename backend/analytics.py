import time
from typing import List, Dict, Any
from collections import deque

class SessionAnalytics:
    def __init__(self, history_size: int = 100):
        self.history = deque(maxlen=history_size)
        self.start_time = time.time()
        self.total_frames_analyzed = 0
        self.faces_detected_count = 0
        self.emotion_counts = {
            "Happy": 0,
            "Neutral": 0,
            "Surprise": 0,
            "Sad": 0,
            "Angry": 0,
            "Fear": 0,
            "Disgust": 0
        }

    def record_frame(self, faces: List[Dict[str, Any]]):
        self.total_frames_analyzed += 1
        current_time = round(time.time() - self.start_time, 2)

        if faces:
            self.faces_detected_count += len(faces)
            # Pick primary face (largest face by area)
            primary_face = max(faces, key=lambda f: f["bbox"]["width"] * f["bbox"]["height"])
            dom = primary_face["dominant_emotion"]
            conf = primary_face["confidence"]
            self.emotion_counts[dom] = self.emotion_counts.get(dom, 0) + 1

            entry = {
                "timestamp": current_time,
                "dominant_emotion": dom,
                "confidence": conf,
                "probabilities": primary_face["probabilities"],
                "faces_count": len(faces)
            }
        else:
            entry = {
                "timestamp": current_time,
                "dominant_emotion": "None",
                "confidence": 0,
                "probabilities": {},
                "faces_count": 0
            }

        self.history.append(entry)
        return entry

    def get_summary(self) -> Dict[str, Any]:
        elapsed = max(1.0, round(time.time() - self.start_time, 1))
        
        # Calculate sentiment score (-100 to +100)
        # Positive: Happy (+1.0), Surprise (+0.5)
        # Neutral: Neutral (0.0)
        # Negative: Sad (-0.8), Angry (-1.0), Fear (-0.7), Disgust (-0.9)
        sentiment_weights = {
            "Happy": 1.0,
            "Surprise": 0.4,
            "Neutral": 0.0,
            "Sad": -0.8,
            "Angry": -1.0,
            "Fear": -0.7,
            "Disgust": -0.9
        }

        weighted_sentiment = 0.0
        total_emotions = sum(self.emotion_counts.values())

        if total_emotions > 0:
            for emo, count in self.emotion_counts.items():
                weighted_sentiment += (count / total_emotions) * sentiment_weights.get(emo, 0.0)
            sentiment_index = round(weighted_sentiment * 100, 1)
        else:
            sentiment_index = 0.0

        # Engagement score (based on face presence ratio + emotional variance)
        face_presence_ratio = min(1.0, self.faces_detected_count / max(1, self.total_frames_analyzed))
        
        # Determine overall dominant emotion
        if total_emotions > 0:
            overall_dominant = max(self.emotion_counts.items(), key=lambda item: item[1])[0]
        else:
            overall_dominant = "Neutral"

        return {
            "session_duration_sec": elapsed,
            "frames_analyzed": self.total_frames_analyzed,
            "faces_detected": self.faces_detected_count,
            "overall_dominant_emotion": overall_dominant,
            "sentiment_index": sentiment_index, # -100 to +100
            "sentiment_label": "Positive" if sentiment_index > 15 else ("Negative" if sentiment_index < -15 else "Neutral"),
            "engagement_score": round(face_presence_ratio * 100, 1),
            "emotion_distribution": {
                k: round((v / max(1, total_emotions)) * 100, 1)
                for k, v in self.emotion_counts.items()
            }
        }
