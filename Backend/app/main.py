from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from io import BytesIO

from .detector import detector


# Create FastAPI application
app = FastAPI(
    title="Smart Object Detection API",
    version="1.0.0"
)


# Allow React frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Home route
@app.get("/")
def root():
    return {
        "success": True,
        "message": "Smart Object Detection API is running"
    }


# Object detection route
@app.post("/detect")
async def detect_object(file: UploadFile = File(...)):

    # Read uploaded image
    image_bytes = await file.read()

    # Convert image bytes into PIL image
    image = Image.open(
        BytesIO(image_bytes)
    ).convert("RGB")

    # Send image to YOLO detector
    detections = detector.detect(image)

    # Return detection result
    return {
        "success": True,
        "detections": detections
    }