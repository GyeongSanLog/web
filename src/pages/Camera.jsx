import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { uploadSetlog } from "../api";

const MAX_DURATION = 4; // 셋로그 방식: 2~4초 짧은 영상

export default function Camera() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const [facingMode, setFacingMode] = useState("environment"); // 후면 카메라 기본
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [camError, setCamError] = useState(null);
  const [now, setNow] = useState(new Date());

  // 현재 시각 표시 (셋로그 특유의 화면 중앙 시간 표시)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 카메라 시작
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        stopStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamError(null);
      } catch (err) {
        console.error("카메라 접근 실패:", err);
        setCamError(
          "카메라를 사용할 수 없어요. 브라우저 권한을 허용했는지 확인해주세요."
        );
      }
    }

    if (!recordedBlob) startCamera();

    return () => {
      cancelled = true;
    };
  }, [facingMode, recordedBlob]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function startRecording() {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      stopStream();
    };

    recorder.start();
    setRecording(true);
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 0.1;
        if (next >= MAX_DURATION) {
          stopRecording();
          return MAX_DURATION;
        }
        return next;
      });
    }, 100);
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setRecordedBlob(null);
    setPreviewUrl(null);
    setCaption("");
    setElapsed(0);
  }

  async function handleUpload() {
    setUploading(true);
    try {
      await uploadSetlog({ groupId, videoBlob: recordedBlob, caption });
      navigate(`/setlog/${groupId}`);
    } catch (err) {
      console.error("업로드 실패:", err);
      setUploading(false);
    }
  }

  const timeString = now.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div className="h-full bg-black flex flex-col">

      {/* 상단바 */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          aria-label="닫기"
        >
          <XIcon />
        </button>
        <span className="text-[11px] text-white/70 bg-white/10 px-3 py-1.5 rounded-full">
          {recordedBlob ? "미리보기" : `최대 ${MAX_DURATION}초`}
        </span>
        {!recordedBlob ? (
          <button
            onClick={() =>
              setFacingMode((m) => (m === "user" ? "environment" : "user"))
            }
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
            aria-label="카메라 전환"
          >
            <FlipIcon />
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* 카메라 / 미리보기 영역 */}
      <div className="flex-1 min-h-0 px-2 relative">
        <div className="h-full rounded-2xl overflow-hidden bg-[#141416] relative">
          {camError && !recordedBlob ? (
            <div className="h-full flex flex-col items-center justify-center px-8 text-center">
              <p className="text-sm text-white/60 leading-relaxed">{camError}</p>
            </div>
          ) : recordedBlob ? (
            <video
              src={previewUrl}
              autoPlay
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          )}

          {/* 화면 중앙 시간 표시 (셋로그 특유의 요소) */}
          {!recordedBlob && !camError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-[42px] font-light text-white/85 tracking-wide">
                {timeString}
              </p>
            </div>
          )}

          {/* 녹화 중 표시 */}
          {recording && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/50 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-[#ff3b30] animate-pulse" />
              <span className="text-[11px] text-white tabular-nums">
                {elapsed.toFixed(1)}초
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 하단 컨트롤 */}
      <div className="shrink-0 px-4 pt-4 pb-5">
        {recordedBlob ? (
          <>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={30}
              placeholder="짧은 자막을 남겨보세요"
              className="w-full h-11 rounded-xl bg-white/10 px-4 text-sm text-white placeholder-white/35 outline-none mb-3"
            />
            <div className="flex gap-2.5">
              <button
                onClick={retake}
                disabled={uploading}
                className="flex-1 h-12 rounded-xl bg-white/10 text-white text-sm font-medium"
              >
                다시 찍기
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-[1.4] h-12 rounded-xl bg-white text-black text-sm font-medium disabled:opacity-50"
              >
                {uploading ? "올리는 중..." : "올리기"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* 녹화 진행 링 */}
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={!!camError}
              className="relative w-[68px] h-[68px] rounded-full flex items-center justify-center disabled:opacity-40"
              aria-label="길게 눌러 촬영"
            >
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 68 68">
                <circle cx="34" cy="34" r="31" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3.5" />
                <circle
                  cx="34"
                  cy="34"
                  r="31"
                  fill="none"
                  stroke="#ff3b30"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 31}
                  strokeDashoffset={2 * Math.PI * 31 * (1 - elapsed / MAX_DURATION)}
                  style={{ transition: "stroke-dashoffset 0.1s linear" }}
                />
              </svg>
              <div
                className={`rounded-full bg-white transition-all ${
                  recording ? "w-6 h-6 rounded-lg" : "w-[54px] h-[54px]"
                }`}
              />
            </button>
            <p className="text-[11px] text-white/40">길게 눌러서 촬영</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* --- 아이콘 --- */

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FlipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-8z" stroke="white" strokeWidth="1.6" />
      <path d="M9.5 12.5l2-2-2-2M14.5 11.5l-2 2 2 2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}