import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// How long a scan result stays on screen before the camera resumes looking
// for the next code — long enough to read, short enough that staff can
// scan badges back-to-back without extra taps.
const RESULT_DISPLAY_MS = 1800;

export default function QrScanModal({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const pausedRef = useRef(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { status: "success" | "error", message }

  // onScan is read through a ref, not closed over directly, because the
  // capture loop below is set up once (empty deps) — without this, every
  // scan would keep calling the very first render's onScan, which closes
  // over whatever attendee state existed when the camera was opened.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let stream;
    let rafId;
    let cancelled = false;
    canvasRef.current = document.createElement("canvas");

    function tick() {
      if (cancelled) return;
      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA && !pausedRef.current) {
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code?.data) handleDecode(code.data);
      }
      rafId = requestAnimationFrame(tick);
    }

    // Scanning pauses while a result is on screen so the same code isn't
    // decoded a dozen times a second while still in frame, then resumes on
    // its own once the result clears.
    function handleDecode(text) {
      pausedRef.current = true;
      const outcome = onScanRef.current(text);
      setResult(outcome);
      setTimeout(() => {
        setResult(null);
        pausedRef.current = false;
      }, RESULT_DISPLAY_MS);
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        tick();
      } catch {
        if (!cancelled) setError("Couldn't access the camera — check permissions and try again.");
      }
    }

    start();
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="scanner" onClick={(e) => e.stopPropagation()}>
        <div className="scanner__header">
          <h3>Scan a badge</h3>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            Close
          </button>
        </div>

        {error ? (
          <div className="scanner__error">{error}</div>
        ) : (
          <div className="scanner__viewport">
            <video ref={videoRef} className="scanner__video" playsInline muted />
            <div className="scanner__frame" />
            {result && (
              <div className={`scanner__result scanner__result--${result.status}`}>
                {result.message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
