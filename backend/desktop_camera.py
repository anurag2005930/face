"""
AURA-Sense: Direct Laptop Camera Vision System (Desktop OpenCV Mode)
Captures directly from the laptop's integrated webcam using OpenCV DirectShow.
"""

import cv2
import time
import sys
import os

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from emotion_model import EmotionDetector
from analytics import SessionAnalytics

def run_laptop_camera():
    print("================================================================")
    print("   AURA-SENSE: DIRECT LAPTOP CAMERA EMOTION SYSTEM")
    print("================================================================")
    print("Initializing computer vision engine...")
    detector = EmotionDetector()
    analytics = SessionAnalytics()

    print("\nConnecting to laptop webcam (device 0)...")
    # cv2.CAP_DSHOW provides fast, direct hardware access to laptop cameras on Windows
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

    if not cap.isOpened():
        print("Falling back to default camera API...")
        cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("\n[ERROR] Could not access laptop webcam!")
        print("Please check:")
        print("1. Laptop privacy shutter is open.")
        print("2. No other application (Zoom, MS Teams, Windows Camera) is using the webcam.")
        return

    # Set optimal streaming resolution
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)

    print("\nLaptop Camera connected successfully!")
    print("Press 'q' or 'ESC' to exit, 's' to capture a snapshot.")

    cv2.namedWindow("AURA-Sense | Laptop Camera AI Emotion Detection", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("AURA-Sense | Laptop Camera AI Emotion Detection", 960, 720)

    prev_time = time.time()
    fps = 0
    snapshot_idx = 1

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[Warning] Failed to grab camera frame.")
            break

        # Flip horizontally for natural mirror display
        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]

        # Calculate FPS
        current_time = time.time()
        fps = int(1.0 / max(0.001, (current_time - prev_time)))
        prev_time = current_time

        # Run emotion detection
        faces = detector.detect_emotions(frame)
        analytics.record_frame(faces)
        summary = analytics.get_summary()

        # Render HUD overlays
        # 1. Top HUD bar
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, 50), (10, 15, 25), -1)
        cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)

        cv2.putText(
            frame,
            f"AURA-SENSE AI | FPS: {fps} | Faces: {len(faces)}",
            (15, 32),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (6, 182, 212),
            2
        )

        sentiment_text = f"Sentiment: {summary['sentiment_index']:+.1f} ({summary['sentiment_label']})"
        cv2.putText(
            frame,
            sentiment_text,
            (w - 300, 32),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (16, 185, 129) if summary['sentiment_index'] >= 0 else (68, 68, 239),
            2
        )

        # 2. Draw bounding boxes & emotion tags
        for face in faces:
            bbox = face["bbox"]
            fx, fy, fw, fh = bbox["x"], bbox["y"], bbox["width"], bbox["height"]
            dominant = face["dominant_emotion"]
            conf = face["confidence"]

            # Choose BGR color
            color_map = {
                "Happy": (129, 185, 16),     # Emerald
                "Surprise": (11, 158, 245),  # Amber
                "Neutral": (212, 182, 6),    # Cyan
                "Sad": (241, 102, 99),       # Indigo
                "Angry": (68, 68, 239),      # Red
                "Fear": (247, 85, 168),      # Purple
                "Disgust": (22, 204, 132)    # Lime
            }
            bgr_color = color_map.get(dominant, (212, 182, 6))

            # Draw corner brackets
            bracket = min(20, fw // 4)
            cv2.line(frame, (fx, fy), (fx + bracket, fy), bgr_color, 3)
            cv2.line(frame, (fx, fy), (fx, fy + bracket), bgr_color, 3)
            cv2.line(frame, (fx + fw, fy), (fx + fw - bracket, fy), bgr_color, 3)
            cv2.line(frame, (fx + fw, fy), (fx + fw, fy + bracket), bgr_color, 3)
            cv2.line(frame, (fx, fy + fh), (fx + bracket, fy + fh), bgr_color, 3)
            cv2.line(frame, (fx, fy + fh), (fx, fy + fh - bracket), bgr_color, 3)
            cv2.line(frame, (fx + fw, fy + fh), (fx + fw - bracket, fy + fh), bgr_color, 3)
            cv2.line(frame, (fx + fw, fy + fh), (fx + fw, fy + fh - bracket), bgr_color, 3)

            # Label box
            label = f"{dominant} ({conf:.1f}%)"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.65, 2)
            tag_y = max(th + 10, fy - 10)
            cv2.rectangle(frame, (fx, tag_y - th - 8), (fx + tw + 16, tag_y + 4), (15, 21, 37), -1)
            cv2.rectangle(frame, (fx, tag_y - th - 8), (fx + tw + 16, tag_y + 4), bgr_color, 1)
            cv2.putText(frame, label, (fx + 8, tag_y - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

            # Draw lateral probability bar panel on right side of primary face
            probs = face["probabilities"]
            bar_y = 70
            for emo, pct in probs.items():
                emo_color = color_map.get(emo, (200, 200, 200))
                # Label
                cv2.putText(frame, f"{emo[:3]}:", (15, bar_y + 12), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)
                # Background track
                cv2.rectangle(frame, (55, bar_y + 2), (185, bar_y + 12), (30, 30, 40), -1)
                # Fill bar
                fill_w = int((pct / 100.0) * 130)
                if fill_w > 0:
                    cv2.rectangle(frame, (55, bar_y + 2), (55 + fill_w, bar_y + 12), emo_color, -1)
                # Text
                cv2.putText(frame, f"{pct:.0f}%", (195, bar_y + 12), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (180, 180, 180), 1)
                bar_y += 18

        cv2.imshow("AURA-Sense | Laptop Camera AI Emotion Detection", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == 27:  # 'q' or ESC
            break
        elif key == ord('s'):  # Take snapshot
            snap_path = f"snapshot_laptop_{snapshot_idx}.jpg"
            cv2.imwrite(snap_path, frame)
            print(f"[Snapshot] Saved to {snap_path}")
            snapshot_idx += 1

    cap.release()
    cv2.destroyAllWindows()
    print("\n[Finished] Camera released.")

if __name__ == "__main__":
    run_laptop_camera()
