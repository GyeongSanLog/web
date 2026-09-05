import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

// 촬영 시간(초) — 셔터를 누르면 이 시간만큼 영상이 녹화됩니다.
const RECORD_SECONDS = 2;

/**
 * Date를 "로컬 시:분:초 값에 Z(UTC 표시)만 붙인" ISO 문자열로 변환.
 * (예: 한국 시간대에서 오전 11시32분에 촬영 -> "2026-09-04T11:32:34.753Z")
 *
 * 배경: 서버가 capturedAt의 date-time 형식 검증에서 타임존 오프셋
 * (+09:00 등)이 포함된 문자열을 400으로 거부하는 것이 확인됨.
 * 반면 Z가 붙은 UTC 형식은 정상 처리되는데, 예전 관찰에 따르면
 * 서버는 이 문자열의 시:분 숫자를 그대로 슬롯 계산에 사용하고
 * 있어서(진짜 UTC 변환을 하지 않음), 한국시간 값 그대로에 Z만
 * 붙여 보내면 슬롯도 올바르게 계산되고 서버 검증도 통과함.
 *
 * 즉 이 함수는 "진짜 UTC로 변환"하는 게 아니라, 로컬 시:분:초를
 * 유지한 채 서버가 받아들이는 형식(Z)으로만 포장하는 임시 처리임.
 * 서버가 나중에 오프셋을 올바르게 파싱하도록 고쳐지면, 이 함수
 * 대신 date.toISOString()이나 오프셋 포함 버전으로 되돌리면 됨.
 */
function toLocalIsoString(date) {
  const pad = (n, len = 2) => String(n).padStart(len, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const ms = pad(date.getMilliseconds(), 3);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}Z`;
}

export default function Camera() {
  const navigate = useNavigate();
  const { groupId } = useParams();
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
        // 셋로그 클립은 소리가 필요 없어서 audio: false로 아예 마이크를
        // 켜지 않음. 이러면 브라우저가 마이크 권한도 안 물어보고,
        // 녹화되는 원본 자체에 오디오 트랙이 없어서 이후 단계에서
        // 오디오 처리(합성, 뮤트 등)를 신경 쓸 필요가 없어짐.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingUser ? "user" : "environment" },
          audio: false,
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
    console.log("[Camera] handleShutter 시작", {
      hasStream: !!streamRef.current,
      hasMediaRecorder: typeof MediaRecorder !== "undefined",
    });
    if (streamRef.current && typeof MediaRecorder !== "undefined") {
      try {
        chunksRef.current = [];
        recorder = new MediaRecorder(streamRef.current);
        console.log("[Camera] MediaRecorder 생성됨", { state: recorder.state, mimeType: recorder.mimeType });
        recorder.ondataavailable = (e) => {
          console.log("[Camera] ondataavailable, size:", e.data.size);
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorderRef.current = recorder;
        recorder.start();
        console.log("[Camera] recorder.start() 호출됨, state:", recorder.state);
      } catch (err) {
        console.error("[Camera] MediaRecorder 생성/시작 실패:", err);
        recorder = null;
      }
    } else {
      console.warn("[Camera] 스트림 또는 MediaRecorder 없음 - 녹화 불가");
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

      // 셔터를 누른 시점을 촬영 시각으로 기록.
      // 업로드 API(capturedAt)가 이 값을 기준으로 시간대(slotIndex)를 계산함.
      //
      // 주의: toISOString()은 항상 UTC로 변환하는데, 서버가 이 값을
      // "그 지역(KST) 시각"으로 오인하고 slotIndex를 계산하는 문제가
      // 발견됨 (한국시간 11시 촬영 → UTC 2시로 변환되어 전송 → 서버가
      // 이를 그대로 "2시대"로 slotIndex 계산). 그래서 UTC 대신 타임존
      // 오프셋을 포함한 로컬 시간 문자열(KST면 +09:00)을 만들어서 보냄.
      const capturedAt = toLocalIsoString(new Date(startedAt));

      const goNext = (videoUrl, videoBlob) => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        navigate(`/camera/${groupId}/result`, {
          state: { videoUrl, videoBlob, poster, capturedAt },
        });
      };

      if (recorder && recorder.state !== "inactive") {
        console.log("[Camera] recorder.stop() 호출, 현재 chunk 개수:", chunksRef.current.length);
        recorder.onstop = () => {
          console.log("[Camera] recorder onstop, 최종 chunk 개수:", chunksRef.current.length);
          const blob = new Blob(chunksRef.current, { type: "video/webm" });
          console.log("[Camera] 생성된 blob", { size: blob.size, type: blob.type });
          goNext(URL.createObjectURL(blob), blob);
        };
        recorder.stop();
      } else {
        console.warn("[Camera] recorder가 없거나 이미 inactive라 blob 없이 이동", {
          hasRecorder: !!recorder,
          state: recorder?.state,
        });
        goNext(null, null);
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