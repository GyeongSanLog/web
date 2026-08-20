import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// API 미구현 → 함께한 사람 더미 데이터
const members = [
  { id: 1, name: "지민" },
  { id: 2, name: "서연" },
  { id: 3, name: "도윤" },
  { id: 4, name: "하윤" },
  { id: 5, name: "은우" },
];

export default function CameraResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { videoUrl = null, poster = null } = location.state || {};

  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const selected = members.find((m) => m.id === selectedId) || null;

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  function handleSave() {
    if (uploading) return;
    // API 연동 전
    setUploading(true);
    setTimeout(() => {
      // 카메라(-1)와 결과(-2)를 건너뛰고 촬영 전 페이지로 돌아감
      navigate(-2);
    }, 1400);
  }

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* 헤더 */}
      <div className="shrink-0 pt-10 px-5 pb-3 flex items-center justify-between border-b border-[#f0f0f2]">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center shrink-0"
            aria-label="뒤로가기"
          >
            <ArrowLeftIcon />
          </button>
          <p className="text-[15px] font-medium text-[#1c1c1e]">영상 확인</p>
        </div>
        {/* 다시 찍기 */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-[13px] text-[#6F4A2C] font-medium"
        >
          <RetakeIcon />
          다시 찍기
        </button>
      </div>

      {/* 스크롤 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6">
        {/* 영상 미리보기 */}
        <div className="relative rounded-2xl overflow-hidden bg-[#1c1c1e] aspect-[3/4] mb-6">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              poster={poster || undefined}
              playsInline
              onEnded={() => setPlaying(false)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : poster ? (
            <img
              src={poster}
              alt="촬영 미리보기"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <PlaceholderPlay />
            </div>
          )}

          {/* 재생 버튼 오버레이 */}
          {videoUrl && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center"
              aria-label={playing ? "일시정지" : "재생"}
            >
              {!playing && (
                <span className="w-14 h-14 rounded-full bg-black/45 backdrop-blur flex items-center justify-center">
                  <PlayIcon />
                </span>
              )}
            </button>
          )}

          <span className="absolute top-3 left-3 text-[11px] text-white bg-black/45 px-2 py-1 rounded-full">
            셋로그 · 2초
          </span>
        </div>

        {/* 사람 선택 */}
        <p className="text-base font-medium text-[#1c1c1e] mb-1">
          누구에게 편지를 남길까요?
        </p>
        <p className="text-xs text-[#98989d] mb-3.5">
          함께한 사람을 선택해 마음을 전해보세요
        </p>

        <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1 mb-7 scrollbar-hide">
          {members.map((m) => {
            const active = m.id === selectedId;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedId(active ? null : m.id)}
                className="flex flex-col items-center gap-1.5 shrink-0"
              >
                <span
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-base font-medium transition-all ${
                    active
                      ? "bg-[#6F4A2C] text-white ring-2 ring-[#6F4A2C] ring-offset-2"
                      : "bg-[#f3ece4] text-[#6F4A2C]"
                  }`}
                >
                  {m.name[0]}
                </span>
                <span
                  className={`text-[11px] ${
                    active ? "text-[#6F4A2C] font-medium" : "text-[#98989d]"
                  }`}
                >
                  {m.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* 편지 입력 */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-base font-medium text-[#1c1c1e]">편지 남기기</p>
          <span className="text-[11px] text-[#98989d]">
            {message.length}/200
          </span>
        </div>
        <textarea
          value={message}
          maxLength={200}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            selected
              ? `${selected.name}님에게 전하고 싶은 말을 적어보세요`
              : "이 순간에 남기고 싶은 말을 적어보세요"
          }
          className="w-full h-32 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] p-4 text-sm text-[#1c1c1e] placeholder:text-[#b0b0b5] resize-none focus:outline-none focus:border-[#6F4A2C]"
        />
      </div>

      {/* 하단 저장 버튼 */}
      <div className="shrink-0 px-5 pt-3 pb-6 border-t border-[#f0f0f2] bg-white">
        <button
          onClick={handleSave}
          disabled={uploading || (!selectedId && !message.trim())}
          className="w-full h-12 rounded-2xl bg-[#6F4A2C] text-white text-sm font-medium disabled:opacity-35 disabled:cursor-not-allowed"
        >
          편지와 함께 저장하기
        </button>
      </div>

      {/* 업로드 완료 */}
      {uploading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/25">
          <div className="flex flex-col items-center gap-2.5 rounded-2xl bg-white px-8 py-6 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-[#f3ece4] flex items-center justify-center">
              <CheckIcon />
            </div>
            <p className="text-sm font-medium text-[#1c1c1e]">업로드 완료</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- 아이콘 --- */

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="#1c1c1e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 5.5v13l11-6.5-11-6.5z" fill="white" />
    </svg>
  );
}

function PlaceholderPlay() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#4b4b4b" strokeWidth="1.4" />
      <path d="M10 8.5v7l6-3.5-6-3.5z" fill="#4b4b4b" />
    </svg>
  );
}

function RetakeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M4 12a8 8 0 1 1 2.3 5.6" stroke="#6F4A2C" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 20v-4h4" stroke="#6F4A2C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#6F4A2C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}