import { useState } from "react";
import WebcamFeed from "./components/WebcamFeed";
import VideoUpload from "./components/VideoUpload";

export default function App() {
  const [tab, setTab] = useState("webcam"); // "webcam" | "upload"

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-lg">
          👁️
        </div>
        <h1 className="text-xl font-bold tracking-tight">VisionTrack</h1>
        <span className="ml-auto text-xs text-gray-500">
          YOLOv8 + DeepSORT
        </span>
      </header>

      {/* Tab switcher */}
      <div className="flex gap-2 px-6 pt-6">
        {["webcam", "upload"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === t
                ? "bg-emerald-500 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {t === "webcam" ? "📷 Live Webcam" : "📁 Upload Video"}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="px-6 py-6">
        {tab === "webcam" ? <WebcamFeed /> : <VideoUpload />}
      </main>
    </div>
  );
}
