import { useEffect, useRef, useState } from "react";

const API_URL = "https://pritha.onrender.com";

function CameraDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const detectingRef = useRef(false);

  const [cameraError, setCameraError] = useState("");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [detections, setDetections] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);

  // --------------------------------
  // START CAMERA
  // --------------------------------

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current.play();

            setIsCameraOn(true);

            startAutoDetection();
          } catch (error) {
            console.error("Video play error:", error);
          }
        };
      }
    } catch (error) {
      console.error("Camera error:", error);

      setCameraError(
        "Camera access denied. Please allow camera permission."
      );
    }
  };

  // --------------------------------
  // STOP CAMERA
  // --------------------------------

  const stopCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    detectingRef.current = false;

    setIsCameraOn(false);
    setIsDetecting(false);
    setDetections([]);
  };

  // --------------------------------
  // AUTOMATIC DETECTION
  // --------------------------------

  const startAutoDetection = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // First detection immediately
    detectObject();

    // Then every 1.5 seconds
    intervalRef.current = setInterval(() => {
      detectObject();
    }, 1500);
  };

  // --------------------------------
  // DETECT OBJECT
  // --------------------------------

  const detectObject = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Prevent multiple API requests at the same time
    if (detectingRef.current) {
      return;
    }

    if (!video || !canvas) {
      return;
    }

    if (
      video.readyState < 2 ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      return;
    }

    detectingRef.current = true;
    setIsDetecting(true);

    const context = canvas.getContext("2d");

    if (!context) {
      detectingRef.current = false;
      setIsDetecting(false);
      return;
    }

    // --------------------------------
    // RESIZE FRAME BEFORE UPLOAD
    // --------------------------------

    const captureWidth = 320;
    const captureHeight = 240;

    canvas.width = captureWidth;
    canvas.height = captureHeight;

    context.drawImage(
      video,
      0,
      0,
      captureWidth,
      captureHeight
    );

    // --------------------------------
    // CREATE COMPRESSED IMAGE
    // --------------------------------

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          detectingRef.current = false;
          setIsDetecting(false);
          return;
        }

        const formData = new FormData();

        formData.append(
          "file",
          blob,
          "camera.jpg"
        );

        try {
          const response = await fetch(
            `${API_URL}/detect`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!response.ok) {
            throw new Error(
              `API Error: ${response.status}`
            );
          }

          const data = await response.json();

          console.log("Live Detection:", data);

          if (data.success) {
            setDetections(data.detections || []);
          }

          setCameraError("");

        } catch (error) {
          console.error(
            "Detection error:",
            error
          );

          setCameraError(
            "Unable to connect to detection server."
          );

        } finally {
          detectingRef.current = false;
          setIsDetecting(false);
        }
      },
      "image/jpeg",
      0.6
    );
  };

  // --------------------------------
  // RENDER
  // --------------------------------

  return (
    <main className="detector-page">

      {/* HEADER */}

      <header className="top-header">

        <div className="brand">

          <div className="brand-icon">
            AI
          </div>

          <div>
            <h2>SmartVision AI</h2>
            <span>
              Object Detection System
            </span>
          </div>

        </div>

        <div className="live-badge">

          <span className="live-dot"></span>

          LIVE

        </div>

      </header>


      {/* HERO */}

      <section className="hero-section">

        <div className="hero-content">

          <span className="eyebrow">
            ARTIFICIAL INTELLIGENCE
          </span>

          <h1>
            Real-Time
            <span> Object Detection</span>
          </h1>

          <p>
            Show an object to the camera and let
            AI identify it instantly with
            confidence-based detection.
          </p>

        </div>

      </section>


      {/* ERROR */}

      {cameraError && (
        <div className="error-message">
          {cameraError}
        </div>
      )}


      {/* MAIN DETECTION AREA */}

      <section className="detection-layout">


        {/* CAMERA CARD */}

        <div className="camera-card">

          <div className="card-header">

            <div>

              <span className="section-label">
                LIVE CAMERA
              </span>

              <h2>
                Detection View
              </h2>

            </div>


            <div
              className={
                isCameraOn
                  ? "status-badge active"
                  : "status-badge"
              }
            >

              <span></span>

              {isCameraOn
                ? "Camera Active"
                : "Camera Off"}

            </div>

          </div>


          {/* CAMERA */}

          <div className="camera-wrapper">

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-video"
            />


            {/* BOUNDING BOXES */}

            {detections.map((item, index) => {

              const video = videoRef.current;

              if (!video) {
                return null;
              }

              const videoWidth =
                video.videoWidth;

              const videoHeight =
                video.videoHeight;

              if (
                !videoWidth ||
                !videoHeight
              ) {
                return null;
              }

              /*
                Backend receives 320x240.
                Camera is normally 640x480.

                Both have the same 4:3 aspect ratio,
                so percentage positioning remains correct.
              */

              const left =
                (item.x1 / 320) * 100;

              const top =
                (item.y1 / 240) * 100;

              const width =
                ((item.x2 - item.x1) / 320) * 100;

              const height =
                ((item.y2 - item.y1) / 240) * 100;


              return (
                <div
                  key={`${item.name}-${index}`}
                  className="bounding-box"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                  }}
                >

                  <div className="object-label">

                    <span>
                      {item.name}
                    </span>

                    <strong>
                      {item.confidence}%
                    </strong>

                  </div>

                </div>
              );

            })}


            {/* SCANNING EFFECT */}

            {isDetecting && (
              <div className="scan-line"></div>
            )}

          </div>


          {/* CAMERA CONTROLS */}

          <div className="camera-controls">

            <div className="ai-status">

              <span
                className={
                  isDetecting
                    ? "status-light detecting"
                    : "status-light"
                }
              ></span>

              <div>

                <strong>
                  {isDetecting
                    ? "Analyzing frame..."
                    : "AI Detection Active"}
                </strong>

                <small>
                  Automatic detection every 1.5 seconds
                </small>

              </div>

            </div>


            {isCameraOn ? (

              <button
                className="stop-button"
                onClick={stopCamera}
              >
                Stop Camera
              </button>

            ) : (

              <button
                className="start-button"
                onClick={startCamera}
              >
                Start Camera
              </button>

            )}

          </div>

        </div>


        {/* SIDE PANEL */}

        <aside className="info-panel">


          {/* AI STATUS */}

          <div className="info-card">

            <div className="info-card-top">

              <span>
                AI ENGINE
              </span>

              <div className="engine-icon">
                AI
              </div>

            </div>

            <h3>
              YOLO Object Detection
            </h3>

            <p>
              Real-time computer vision model
              analyzing your camera feed.
            </p>

            <div className="engine-status">

              <span></span>

              {isCameraOn
                ? "System Active"
                : "System Offline"}

            </div>

          </div>


          {/* OBJECT COUNT */}

          <div className="info-card">

            <div className="metric-label">
              OBJECTS DETECTED
            </div>

            <div className="object-count">
              {detections.length}
            </div>

            <p>
              Objects currently visible to
              the AI model.
            </p>

          </div>


          {/* DETECTION SPEED */}

          <div className="info-card">

            <div className="metric-label">
              DETECTION INTERVAL
            </div>

            <div className="interval-value">
              1.5
              <span> sec</span>
            </div>

            <p>
              Automatic frame analysis
            </p>

          </div>

        </aside>

      </section>


      {/* RESULTS */}

      <section className="results-section">

        <div className="results-heading">

          <div>

            <span className="section-label">
              AI ANALYSIS
            </span>

            <h2>
              Detected Objects
            </h2>

          </div>

          <div className="result-count">

            {detections.length}

            {" "}

            {detections.length === 1
              ? "Object"
              : "Objects"}

          </div>

        </div>


        {detections.length === 0 ? (

          <div className="empty-state">

            <div className="empty-icon">
              AI
            </div>

            <h3>
              Waiting for an object
            </h3>

            <p>
              Place an object in front of the
              camera to begin detection.
            </p>

          </div>

        ) : (

          <div className="results-grid">

            {detections.map(
              (item, index) => (

                <div
                  className="result-card"
                  key={`${item.name}-${index}`}
                >

                  <div className="result-icon">

                    {item.name
                      .charAt(0)
                      .toUpperCase()}

                  </div>


                  <div className="result-info">

                    <span>
                      DETECTED OBJECT
                    </span>

                    <h3>
                      {item.name}
                    </h3>

                  </div>


                  <div className="confidence">

                    <span>
                      CONFIDENCE
                    </span>

                    <strong>
                      {item.confidence}%
                    </strong>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </section>


      {/* FOOTER */}

      <footer className="footer">

        <div>
          SmartVision AI
        </div>

        <span>
          Powered by YOLO + FastAPI + React
        </span>

      </footer>


      {/* HIDDEN CANVAS */}

      <canvas
        ref={canvasRef}
        style={{
          display: "none",
        }}
      />

    </main>
  );
}

export default CameraDetector;