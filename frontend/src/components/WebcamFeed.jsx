import { useEffect, useRef, useState } from "react";

const WS_URL = "ws://localhost:8000/ws/webcam";

export default function WebcamFeed() {
  const videoRef   = useRef(null);
  const captureRef = useRef(null);   // hidden canvas for grabbing frames
  const displayRef = useRef(null);   // visible canvas for annotated output
  const wsRef      = useRef(null);
  const loopRef    = useRef(null);   // requestAnimationFrame id
  const sendingRef = useRef(false);  // prevent overlapping sends

  const [status, setStatus]         = useState("idle");
  const [detections, setDetections] = useState([]);
  const [fps, setFps]               = useState(0);
  const fpsRef = useRef({ count: 0, ts: Date.now() });

  const stop = () => {
    cancelAnimationFrame(loopRef.current);
    wsRef.current?.close();
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    setStatus("idle");
    setDetections([]);
    setFps(0);
    sendingRef.current = false;
  };

  const start = async () => {
    setStatus("connecting");

    // 1. Get webcam
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (e) {
      console.error("Camera:", e);
      setStatus("error");
      return;
    }
    videoRef.current.srcObject = stream;
    await videoRef.current.play();

    // 2. Open WebSocket
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WS open");
      setStatus("live");
      startLoop(ws);
    };

    ws.onmessage = (evt) => {
      sendingRef.current = false;           // ready for next frame
      const data = JSON.parse(evt.data);
      if (data.error) return;

      // Draw annotated frame
      const img = new Image();
      img.onload = () => {
        const canvas = displayRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = "data:image/jpeg;base64," + data.frame;

      setDetections(data.detections || []);

      // FPS
      fpsRef.current.count++;
      const now = Date.now();
      if (now - fpsRef.current.ts >= 1000) {
        setFps(fpsRef.current.count);
        fpsRef.current = { count: 0, ts: now };
      }
    };

    ws.onerror = (e) => { console.error("WS error:", e); setStatus("error"); };
    ws.onclose = () => { console.log("WS closed"); stop(); };
  };

  const startLoop = (ws) => {
    const tick = () => {
      if (ws.readyState !== WebSocket.OPEN) return;

      // Only send if previous frame has been processed
      if (!sendingRef.current) {
        const video  = videoRef.current;
        const canvas = captureRef.current;
        const display = displayRef.current;

        if (video && canvas && video.readyState >= 2) {
          const w = video.videoWidth;
          const h = video.videoHeight;

          // Sync canvas sizes
          if (canvas.width !== w)  canvas.width  = w;
          if (canvas.height !== h) canvas.height = h;
          if (display && display.width !== w)  display.width  = w;
          if (display && display.height !== h) display.height = h;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, w, h);

          canvas.toBlob((blob) => {
            if (!blob) return;
            const reader = new FileReader();
            reader.onload = () => {
              const b64 = reader.result.split(",")[1];
              if (ws.readyState === WebSocket.OPEN) {
                sendingRef.current = true;
                ws.send(b64);
              }
            };
            reader.readAsDataURL(blob);
          }, "image/jpeg", 0.7);
        }
      }

      loopRef.current = requestAnimationFrame(tick);
    };
    loopRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => stop(), []);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Video panel */}
      <div className="relative bg-gray-900 rounded-2xl overflow-hidden flex-1 min-h-[360px] flex items-center justify-center">
        <video ref={videoRef} className="hidden" muted playsInline />
        <canvas ref={captureRef} className="hidden" />

        {status === "live" ? (
          <canvas ref={displayRef} className="w-full h-auto rounded-2xl" />
        ) : (
          <div className="text-center text-gray-500 space-y-3 p-8">
            <div className="text-5xl">📷</div>
            <p className="text-sm">
              {status === "connecting" ? "Connecting…" :
               status === "error"      ? "⚠ Camera or server error — check console" :
               "Click Start to begin live detection"}
            </p>
          </div>
        )}

        {status === "live" && (
          <span className="absolute top-3 right-3 bg-black/60 text-emerald-400 text-xs font-mono px-2 py-1 rounded">
            {fps} FPS
          </span>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-72 flex flex-col gap-4">
        <div className="bg-gray-900 rounded-2xl p-4 flex gap-3">
          <button
            onClick={start}
            disabled={status === "live" || status === "connecting"}
            className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
          >
            {status === "connecting" ? "Connecting…" : "▶ Start"}
          </button>
          <button
            onClick={stop}
            disabled={status === "idle"}
            className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 font-semibold text-sm transition-colors"
          >
            ■ Stop
          </button>
        </div>

        <div className="bg-gray-900 rounded-2xl p-4 flex-1 overflow-auto">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
            Detected Objects ({detections.length})
          </p>
          {detections.length === 0 ? (
            <p className="text-gray-600 text-sm">None yet…</p>
          ) : (
            <ul className="space-y-2">
              {detections.map((d) => (
                <li key={d.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
                  <span>
                    <span className="text-emerald-400 font-mono mr-2">#{d.id}</span>
                    {d.label}
                  </span>
                  <span className="text-gray-400 text-xs">{Math.round(d.confidence * 100)}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
