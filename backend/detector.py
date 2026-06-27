import cv2
import numpy as np
from ultralytics import YOLO
from deep_sort_realtime.deepsort_tracker import DeepSort

COLORS = [
    (255, 56,  56),  (255, 157, 151), (255, 112,  31), (255, 178, 29),
    (207, 210,  49), (72,  249, 10),  (146, 204,  23), (61,  219, 134),
    (26,  147, 52),  (0,   212, 187), (44,  153, 168), (0,   194, 255),
    (52,  69,  147), (100, 115, 255), (0,   24,  236), (132, 56,  255),
    (82,  0,   133), (203, 56,  255), (255, 149, 200), (255, 55,  199),
]

class ObjectDetector:
    def __init__(self, model_name="yolov8n.pt", conf_threshold=0.4):
        self.model_name = model_name
        self.conf_threshold = conf_threshold
        self.model = YOLO(model_name)
        self.tracker = DeepSort(max_age=30, n_init=2, nms_max_overlap=1.0)

    def _run_yolo(self, frame):
        results = self.model(frame, verbose=False)[0]
        detections = []
        for box in results.boxes:
            conf = float(box.conf[0])
            if conf < self.conf_threshold:
                continue
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls_name = self.model.names[int(box.cls[0])]
            detections.append(([x1, y1, x2 - x1, y2 - y1], conf, cls_name))
        return detections

    def _draw_track(self, frame, track, label, conf):
        l, t, r, b = map(int, track.to_ltrb())
        tid = track.track_id
        color = COLORS[int(tid) % len(COLORS)]
        cv2.rectangle(frame, (l, t), (r, b), color, 2)
        pct = int(conf * 100)
        text = str(tid) + " " + str(label) + " " + str(pct) + "%"
        (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
        cv2.rectangle(frame, (l, t - th - 8), (l + tw + 4, t), color, -1)
        cv2.putText(frame, text, (l + 2, t - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)

    def process_and_annotate(self, frame):
        try:
            raw = self._run_yolo(frame)
            tracks = self.tracker.update_tracks(raw, frame=frame) if raw else []
        except Exception as e:
            print("Detection error:", e)
            return frame.copy(), []

        meta = []
        annotated = frame.copy()

        for track in tracks:
            try:
                if not track.is_confirmed():
                    continue
                label = track.get_det_class() or "object"
                conf = track.get_det_conf() or 0.0
                self._draw_track(annotated, track, label, conf)
                l, t, r, b = map(int, track.to_ltrb())
                meta.append({
                    "id": track.track_id,
                    "label": label,
                    "confidence": round(conf, 2),
                    "bbox": [l, t, r, b],
                })
            except Exception as e:
                import traceback; traceback.print_exc()
                continue

        cv2.putText(annotated, "Objects: " + str(len(meta)), (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        return annotated, meta

    def annotate_frame(self, frame):
        annotated, _ = self.process_and_annotate(frame)
        return annotated
