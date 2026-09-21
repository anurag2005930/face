import cv2
import numpy as np
import sys
import os

# Ensure backend dir in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from emotion_model import EmotionDetector
from analytics import SessionAnalytics

def run_tests():
    print("[TEST 1] Initializing EmotionDetector...")
    detector = EmotionDetector()
    assert detector is not None, "Detector initialization failed"
    print("  [OK] EmotionDetector initialized successfully.")

    print("\n[TEST 2] Running inference on synthetic test frame (face simulation)...")
    # Create synthetic test frame (640x480 gray/color with synthetic face oval and features)
    test_frame = np.full((480, 640, 3), 40, dtype=np.uint8)
    
    # Draw a synthetic face oval
    cv2.ellipse(test_frame, (320, 240), (100, 130), 0, 0, 360, (210, 180, 160), -1)
    # Eyes
    cv2.circle(test_frame, (280, 210), 12, (255, 255, 255), -1)
    cv2.circle(test_frame, (280, 210), 5, (0, 0, 0), -1)
    cv2.circle(test_frame, (360, 210), 12, (255, 255, 255), -1)
    cv2.circle(test_frame, (360, 210), 5, (0, 0, 0), -1)
    # Smile arc
    cv2.ellipse(test_frame, (320, 280), (40, 20), 0, 0, 180, (40, 40, 200), 4)

    results = detector.detect_emotions(test_frame)
    print(f"  Inference executed. Detected {len(results)} face(s).")
    print("  [OK] Frame processing completed without errors.")

    print("\n[TEST 3] Testing SessionAnalytics recording & summary...")
    analytics = SessionAnalytics()
    
    # Simulate 5 frames
    analytics.record_frame([{
        "bbox": {"x": 200, "y": 150, "width": 200, "height": 200},
        "dominant_emotion": "Happy",
        "confidence": 88.5,
        "emoji": "😊",
        "color": "#10b981",
        "probabilities": {"Happy": 88.5, "Neutral": 5.0, "Surprise": 3.0, "Sad": 1.0, "Angry": 1.0, "Fear": 0.5, "Disgust": 1.0},
        "landmarks": {"eyes": [], "smiles": []}
    }])

    summary = analytics.get_summary()
    assert summary["frames_analyzed"] == 1, "Frames analyzed count mismatch"
    assert summary["overall_dominant_emotion"] == "Happy", "Dominant emotion mismatch"
    assert summary["sentiment_label"] == "Positive", "Sentiment label mismatch"
    print(f"  [OK] SessionAnalytics validated: Dominant={summary['overall_dominant_emotion']}, Sentiment={summary['sentiment_index']}")

    print("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_tests()
