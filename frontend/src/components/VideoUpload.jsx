import { useRef, useState } from "react";

const API_URL = "http://localhost:8000/detect/video";

export default function VideoUpload() {
  const inputRef  = useRef(null);
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);   // original video preview URL
  const [result, setResult]     = useState(null);   // annotated video blob URL
  const [status, setStatus]     = useState("idle"); // idle | uploading | done | error
  const [progress, setProgress] = useState(0);

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0] || e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setStatus("idle");
  };

  const upload = async () => {
    if (!file) return;
    setStatus("uploading");
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Use XHR for progress tracking
      const xhr = new XMLHttpRequest();
      xhr.open("POST", API_URL);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          setProgress(Math.round((e.loaded / e.total) * 50)); // upload = 0-50%
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const blob = new Blob([xhr.response], { type: "video/mp4" });
          setResult(URL.createObjectURL(blob));
          setStatus("done");
          setProgress(100);
        } else {
          setStatus("error");
        }
      };

      xhr.onerror = () => setStatus("error");
      xhr.responseType = "arraybuffer";

      // Simulate processing progress (50-95%) while server works
      const tick = setInterval(() => {
        setProgress((p) => (p < 95 ? p + 1 : p));
      }, 300);
      xhr.onloadend = () => clearInterval(tick);

      xhr.send(formData);
    } catch {
      setStatus("error");
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setStatus("idle");
    setProgress(0);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Drop zone */}
      {!file && (
        <div
          onClick={() => inputRef.current.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-700 hover:border-emerald-500 rounded-2xl p-16 text-center cursor-pointer transition-colors"
        >
          <div className="text-5xl mb-4">📁</div>
          <p className="text-gray-300 font-medium">Drop a video file here</p>
          <p className="text-gray-500 text-sm mt-1">MP4, MOV, AVI supported</p>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleDrop}
          />
        </div>
      )}

      {/* Preview + result side by side */}
      {file && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Original */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
              Original
            </p>
            <video
              src={preview}
              controls
              className="w-full rounded-xl"
            />
            <p className="text-xs text-gray-500 mt-2 truncate">{file.name}</p>
          </div>

          {/* Annotated result */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
              Annotated Output
            </p>
            {result ? (
              <>
                <video src={result} controls className="w-full rounded-xl" />
                <a
                  href={result}
                  download="tracked_output.mp4"
                  className="mt-3 block text-center py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition-colors"
                >
                  ⬇ Download
                </a>
              </>
            ) : (
              <div className="aspect-video bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-sm">
                {status === "uploading" ? "Processing…" : "Result will appear here"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {status === "uploading" && (
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Processing video…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="bg-red-900/30 border border-red-700 rounded-2xl p-4 text-red-400 text-sm">
          ⚠ Something went wrong. Make sure the backend is running on port 8000.
        </div>
      )}

      {/* Action buttons */}
      {file && (
        <div className="flex gap-3">
          <button
            onClick={upload}
            disabled={status === "uploading"}
            className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 font-semibold transition-colors"
          >
            {status === "uploading" ? "Processing…" : "🚀 Run Detection"}
          </button>
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
