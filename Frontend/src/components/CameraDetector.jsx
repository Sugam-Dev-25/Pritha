import { useEffect, useRef, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

function CameraDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const detectingRef = useRef(false);

  // ==========================================
  // ALARM REFERENCES
  // ==========================================

  const audioContextRef = useRef(null);
  const alarmIntervalRef = useRef(null);

  // Always contains the latest alarm status
  const alarmEnabledRef = useRef(false);

  // Prevent multiple alarm intervals
  const isAlarmPlayingRef = useRef(false);

  // ==========================================
  // STATES
  // ==========================================

  const [cameraError, setCameraError] = useState("");

  const [isCameraOn, setIsCameraOn] = useState(false);

  const [detections, setDetections] = useState([]);

  const [isDetecting, setIsDetecting] = useState(false);

  const [alarmEnabled, setAlarmEnabled] = useState(false);

  const [personDetected, setPersonDetected] = useState(false);

  // ==========================================
  // INITIAL SETUP
  // ==========================================

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
      stopAlarm();

      if (audioContextRef.current) {
        audioContextRef.current
          .close()
          .catch(() => {});
      }
    };
  }, []);

  // ==========================================
  // ENABLE ALARM
  // ==========================================

  const enableAlarm = async () => {
    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) {
        alert(
          "Your browser does not support Web Audio."
        );

        return;
      }

      // Create audio context
      if (!audioContextRef.current) {
        audioContextRef.current =
          new AudioContext();
      }

      // Resume audio context
      if (
        audioContextRef.current.state ===
        "suspended"
      ) {
        await audioContextRef.current.resume();
      }

      // ==========================================
      // IMPORTANT
      // ==========================================

      alarmEnabledRef.current = true;

      setAlarmEnabled(true);

      console.log(
        "🔊 Alarm enabled:",
        audioContextRef.current.state
      );

      // ==========================================
      // TEST BEEP
      // ==========================================

      await playAlarmBeep();

      // ==========================================
      // IF PERSON IS ALREADY DETECTED
      // ==========================================

      if (personDetected) {
        startAlarm();
      }

    } catch (error) {
      console.error(
        "Audio initialization error:",
        error
      );

      alarmEnabledRef.current = false;

      setAlarmEnabled(false);
    }
  };

  // ==========================================
  // PLAY ONE ALARM BEEP
  // ==========================================

  const playAlarmBeep = async () => {
    try {
      const audioContext =
        audioContextRef.current;

      if (!audioContext) {
        console.log(
          "AudioContext not initialized"
        );

        return;
      }

      // Resume if browser suspended audio
      if (
        audioContext.state === "suspended"
      ) {
        await audioContext.resume();
      }

      if (
        audioContext.state !== "running"
      ) {
        console.log(
          "AudioContext state:",
          audioContext.state
        );

        return;
      }

      // ==========================================
      // OSCILLATOR
      // ==========================================

      const oscillator =
        audioContext.createOscillator();

      // ==========================================
      // VOLUME
      // ==========================================

      const gainNode =
        audioContext.createGain();

      // Alarm tone
      oscillator.type = "square";

      oscillator.frequency.setValueAtTime(
        1000,
        audioContext.currentTime
      );

      // Volume
      gainNode.gain.setValueAtTime(
        0.4,
        audioContext.currentTime
      );

      // Fade out
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.4
      );

      // Connect
      oscillator.connect(gainNode);

      gainNode.connect(
        audioContext.destination
      );

      // Start
      oscillator.start();

      // Stop
      oscillator.stop(
        audioContext.currentTime + 0.4
      );

      console.log("🔊 Alarm beep");

    } catch (error) {
      console.error(
        "Alarm beep error:",
        error
      );
    }
  };

  // ==========================================
  // START ALARM
  // ==========================================

  const startAlarm = () => {
    // Alarm must be enabled
    if (!alarmEnabledRef.current) {
      console.log(
        "⚠️ Alarm is not enabled"
      );

      return;
    }

    // Don't create another interval
    if (isAlarmPlayingRef.current) {
      return;
    }

    isAlarmPlayingRef.current = true;

    console.log(
      "🚨 PERSON DETECTED - ALARM ON"
    );

    // First beep immediately
    playAlarmBeep();

    // Repeat every 700ms
    alarmIntervalRef.current =
      setInterval(() => {
        playAlarmBeep();
      }, 700);
  };

  // ==========================================
  // STOP ALARM
  // ==========================================

  const stopAlarm = () => {
    if (alarmIntervalRef.current) {
      clearInterval(
        alarmIntervalRef.current
      );

      alarmIntervalRef.current = null;
    }

    isAlarmPlayingRef.current = false;

    console.log("🔕 ALARM OFF");
  };

  // ==========================================
  // START CAMERA
  // ==========================================

  const startCamera = async () => {
    try {
      setCameraError("");

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              width: {
                ideal: 640,
              },
              height: {
                ideal: 480,
              },
            },

            audio: false,
          }
        );

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject =
          stream;

        videoRef.current.onloadedmetadata =
          async () => {
            try {
              await videoRef.current.play();

              setIsCameraOn(true);

              startAutoDetection();

            } catch (error) {
              console.error(
                "Video play error:",
                error
              );
            }
          };
      }

    } catch (error) {
      console.error(
        "Camera error:",
        error
      );

      setCameraError(
        "Camera access denied. Please allow camera permission."
      );
    }
  };

  // ==========================================
  // STOP CAMERA
  // ==========================================

  const stopCamera = () => {
    // Stop detection interval
    if (intervalRef.current) {
      clearInterval(
        intervalRef.current
      );

      intervalRef.current = null;
    }

    // Stop camera
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    // Remove video stream
    if (videoRef.current) {
      videoRef.current.srcObject =
        null;
    }

    detectingRef.current = false;

    // Stop alarm
    stopAlarm();

    setIsCameraOn(false);

    setIsDetecting(false);

    setDetections([]);

    setPersonDetected(false);
  };

  // ==========================================
  // AUTOMATIC DETECTION
  // ==========================================

  const startAutoDetection = () => {
    if (intervalRef.current) {
      clearInterval(
        intervalRef.current
      );
    }

    // First detection immediately
    detectObject();

    // Then every 1 second
    intervalRef.current =
      setInterval(() => {
        detectObject();
      }, 1000);
  };

  // ==========================================
  // DETECT OBJECT
  // ==========================================

  const detectObject = async () => {
    const video = videoRef.current;

    const canvas = canvasRef.current;

    // Prevent duplicate API requests
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

    const context =
      canvas.getContext("2d");

    if (!context) {
      detectingRef.current = false;

      setIsDetecting(false);

      return;
    }

    // ==========================================
    // CAPTURE FRAME
    // ==========================================

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

    // ==========================================
    // CONVERT FRAME TO JPEG
    // ==========================================

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          detectingRef.current = false;

          setIsDetecting(false);

          return;
        }

        const formData =
          new FormData();

        formData.append(
          "file",
          blob,
          "camera.jpg"
        );

        try {
          // ==========================================
          // SEND TO FASTAPI
          // ==========================================

          const response =
            await fetch(
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

          const data =
            await response.json();

          console.log(
            "Live Detection:",
            data
          );

          if (data.success) {
            const detectedObjects =
              data.detections || [];

            // ==========================================
            // UPDATE DETECTIONS
            // ==========================================

            setDetections(
              detectedObjects
            );

            // ==========================================
            // CHECK PERSON
            // ==========================================

            const hasPerson =
              detectedObjects.some(
                (item) =>
                  item.name &&
                  item.name
                    .toLowerCase() ===
                    "person"
              );

            setPersonDetected(
              hasPerson
            );

            // ==========================================
            // AUTOMATIC ALARM
            // ==========================================

            if (
              hasPerson &&
              alarmEnabledRef.current
            ) {
              console.log(
                "🚨 PERSON FOUND → STARTING ALARM"
              );

              startAlarm();

            } else if (!hasPerson) {

              console.log(
                "Person not detected → stopping alarm"
              );

              stopAlarm();
            }
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
          detectingRef.current =
            false;

          setIsDetecting(false);
        }
      },
      "image/jpeg",
      0.6
    );
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className="detector-page">

      {/* HEADER */}

      <header className="top-header">

        <div className="brand">

          <div className="brand-icon">
            AI
          </div>

          <div>

            <h2>
              SmartVision AI
            </h2>

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
            <span>
              {" "}Object Detection
            </span>
          </h1>

          <p>
            Show an object to the camera
            and let AI identify it instantly
            with confidence-based detection.
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

            {detections.map(
              (item, index) => {

                const left =
                  (item.x1 / 320) *
                  100;

                const top =
                  (item.y1 / 240) *
                  100;

                const width =
                  ((item.x2 -
                    item.x1) /
                    320) *
                  100;

                const height =
                  ((item.y2 -
                    item.y1) /
                    240) *
                  100;

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
              }
            )}


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
                  Automatic detection every
                  1 second
                </small>

              </div>

            </div>


            {/* ALARM BUTTON */}

            <button
              className={
                alarmEnabled
                  ? "start-button"
                  : "stop-button"
              }
              onClick={enableAlarm}
              disabled={alarmEnabled}
            >

              {alarmEnabled
                ? "🔊 Alarm Enabled"
                : "🔔 Enable Alarm"}

            </button>


            {/* CAMERA BUTTON */}

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
              Real-time computer vision
              model analyzing your camera feed.
            </p>

            <div className="engine-status">

              <span></span>

              {isCameraOn
                ? "System Active"
                : "System Offline"}

            </div>

          </div>


          {/* PERSON ALERT */}

          <div className="info-card">

            <div className="metric-label">
              PERSON ALERT
            </div>

            <div className="object-count">

              {personDetected
                ? "ON"
                : "OFF"}

            </div>

            <p>

              {personDetected
                ? alarmEnabled
                  ? "Person detected — Alarm active"
                  : "Person detected — Enable alarm"
                : "No person detected"}

            </p>

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
              Objects currently visible
              to the AI model.
            </p>

          </div>


          {/* DETECTION SPEED */}

          <div className="info-card">

            <div className="metric-label">
              DETECTION INTERVAL
            </div>

            <div className="interval-value">

              1

              <span>
                {" "}sec
              </span>

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

            {detections.length}{" "}

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
              Place an object in front
              of the camera to begin detection.
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