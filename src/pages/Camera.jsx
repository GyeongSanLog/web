import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 촬영 시간(초) — 셔터를 누르면 이 시간만큼 영상이 녹화됩니다.
const RECORD_SECONDS = 2;

export default function Camera() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [facingUser, setFacingUser] = useState(false); // 후면 카메라 기본
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0); // 0 ~ 1

  // 카메라 스트림 시작
  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingUser ? "user" : "environment" },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setReady(true);
        setDenied(false);
      } catch {
        setDenied(true);
        setReady(false);
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [facingUser]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  function handleShutter() {
    if (recording) return;
    setRecording(true);
    setProgress(0);

    const startedAt = Date.now();
    const totalMs = RECORD_SECONDS * 1000;

    const tick = setInterval(() => {
      const ratio = Math.min((Date.now() - startedAt) / totalMs, 1);
      setProgress(ratio);
      if (ratio >= 1) clearInterval(tick);
    }, 30);

    let recorder = null;
    if (streamRef.current && typeof MediaRecorder !== "undefined") {
      try {
        chunksRef.current = [];
        recorder = new MediaRecorder(streamRef.current);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorderRef.current = recorder;
        recorder.start();
      } catch {
        recorder = null;
      }
    }

    setTimeout(() => {
      clearInterval(tick);

      let poster = null;
      const v = videoRef.current;
      if (v && v.videoWidth) {
        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);
        try {
          poster = canvas.toDataURL("image/jpeg", 0.8);
        } catch {
          poster = null;
        }
      }

      const goNext = (videoUrl) => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        navigate("/camera/result", { state: { videoUrl, poster } });
      };

      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "video/webm" });
          goNext(URL.createObjectURL(blob));
        };
        recorder.stop();
      } else {
        goNext(null);
      }
    }, totalMs);
  }

  const ringR = 34;
  const ringC = 2 * Math.PI * ringR;

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden">
      {!denied ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${
            facingUser ? "scale-x-[-1]" : ""
          }`}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#141414]">
          <CameraOffIcon />
          <p className="text-sm text-white/60 text-center px-10 leading-relaxed">
            카메라를 사용할 수 없어요.
            <br />
            셔터를 눌러 미리보기로 진행할 수 있어요.
          </p>
        </div>
      )}

      <div className="relative z-10 pt-10 px-5 pb-4 bg-gradient-to-b from-black/55 to-transparent flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-black/35 backdrop-blur flex items-center justify-center"
          aria-label="닫기"
        >
          <CloseIcon />
        </button>
        <span className="text-[13px] font-medium text-white/90 tracking-wide">
          셋로그 촬영
        </span>
        <button
          onClick={() => !recording && setFacingUser((v) => !v)}
          className="w-9 h-9 rounded-full bg-black/35 backdrop-blur flex items-center justify-center disabled:opacity-40"
          disabled={recording}
          aria-label="카메라 전환"
        >
          <FlipIcon />
        </button>
      </div>

      <div className="relative z-10 flex-1 flex items-start justify-center pt-6 pointer-events-none">
        {recording ? (
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/85 text-white text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            녹화 중 · {RECORD_SECONDS}초
          </span>
        ) : (
          <span className="px-3 py-1.5 rounded-full bg-black/35 text-white/85 text-xs">
            버튼을 누르면 {RECORD_SECONDS}초 영상이 촬영돼요
          </span>
        )}
      </div>

      <div className="relative z-10 pb-10 pt-6 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
        <button
          onClick={handleShutter}
          disabled={recording}
          className="relative w-[76px] h-[76px] flex items-center justify-center"
          aria-label="촬영"
        >
          <svg
            className="absolute inset-0 -rotate-90"
            width="76"
            height="76"
            viewBox="0 0 76 76"
          >
            <circle
              cx="38"
              cy="38"
              r={ringR}
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="3"
            />
            <circle
              cx="38"
              cy="38"
              r={ringR}
              fill="none"
              stroke="#ef4444"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={ringC}
              strokeDashoffset={ringC * (1 - progress)}
            />
          </svg>
          <span
            className={`transition-all duration-200 ${
              recording
                ? "w-7 h-7 rounded-lg bg-red-500"
                : "w-[58px] h-[58px] rounded-full bg-white"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

/* --- 아이콘 --- */

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FlipIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <path d="M4 8a8 8 0 0 1 13.5-3.5L20 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 4v3h-3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 16a8 8 0 0 1-13.5 3.5L4 17" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20v-3h3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CameraOffIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <path d="M3 3l18 18" stroke="#6b6b6b" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4.5 7.5A1.5 1.5 0 0 0 3 9v9a1.5 1.5 0 0 0 1.5 1.5h13.5" stroke="#6b6b6b" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 5h6l1.5 2.5H21V16" stroke="#6b6b6b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}