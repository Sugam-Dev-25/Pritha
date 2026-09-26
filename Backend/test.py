from ultralytics import YOLO


# Load pretrained YOLO model
model = YOLO("yolo11n.pt")


# Run detection
results = model.predict(
    source="https://ultralytics.com/images/bus.jpg",
    conf=0.5,
    save=True
)


print("\nDetection completed successfully!")

for result in results:

    for box in result.boxes:

        class_id = int(box.cls[0])
        confidence = float(box.conf[0])

        name = model.names[class_id]

        print(
            f"Object: {name} | "
            f"Confidence: {confidence * 100:.2f}%"
        )