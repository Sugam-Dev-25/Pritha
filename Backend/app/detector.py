from ultralytics import YOLO


class ObjectDetector:

    def __init__(self):
        self.model = YOLO("yolo11n.pt")

    def detect(self, image):

        results = self.model.predict(
            source=image,
            conf=0.5,
            imgsz=320,
            device="cpu",
            verbose=False
        )

        detections = []

        for result in results:

            for box in result.boxes:

                confidence = float(box.conf[0])
                class_id = int(box.cls[0])
                name = self.model.names[class_id]

                x1, y1, x2, y2 = box.xyxy[0].tolist()

                detections.append({
                    "name": name,
                    "confidence": round(confidence * 100, 2),
                    "x1": round(x1, 2),
                    "y1": round(y1, 2),
                    "x2": round(x2, 2),
                    "y2": round(y2, 2)
                })

        return detections


detector = ObjectDetector()