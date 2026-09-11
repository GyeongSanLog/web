import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchGroupSessions } from "../api/groups";

export default function SetlogViewer() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetchGroupSessions(groupId)
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) {
    return (
      <div className="h-full bg-black flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full bg-black flex flex-col items-center justify-center px-5">
        <p className="text-sm text-white/60 mb-4">{error || "불러올 수 없어요"}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-[#5b9dff] font-medium">
          돌아가기
        </button>
      </div>
    );
  }

  const { group, sessions } = data;

  if (sessions.length === 0) {
    return (
      <div className="h-full bg-black flex flex-col">
        <ViewerHeader group={group} onBack={() => navigate(-1)} />
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <p className="text-sm text-white/50 mb-1">아직 기록된 셋로그가 없어요</p>
          <p className="text-xs text-white/30 mb-6 text-center">
            멤버들과 같은 순간을 함께 남겨보세요
          </p>
          <button
            onClick={() => navigate(`/camera/${groupId}`)}
            className="px-5 h-10 rounded-full bg-white text-black text-sm font-medium"
          >
            촬영하기
          </button>
        </div>
      </div>
    );
  }

  const session = sessions[currentIndex];

  return (
    <div className="h-full bg-black flex flex-col">
      <ViewerHeader
        group={group}
        session={session}
        sessions={sessions}
        currentIndex={currentIndex}
        onBack={() => navigate(-1)}
      />

      {/* 분할 화면 - 멤버 수에 따라 레이아웃 자동 결정 */}
      <div className="flex-1 min-h-0 px-1">
        <SplitGrid entries={session.entries} />
      </div>

      {/* 하단: 세션 타임라인 + 촬영 버튼 */}
      <div className="shrink-0 pt-3 pb-4">
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          {sessions.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrentIndex(i)}
              className={`shrink-0 px-3 h-8 rounded-full text-xs transition-colors ${
                i === currentIndex
                  ? "bg-white text-black font-medium"
                  : "bg-white/10 text-white/60"
              }`}
            >
              {s.capturedAt}
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => navigate(`/camera/${groupId}`)}
            className="w-14 h-14 rounded-full border-[3px] border-white flex items-center justify-center"
            aria-label="셋로그 촬영하기"
          >
            <div className="w-11 h-11 rounded-full bg-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewerHeader({ group, session, sessions, currentIndex, onBack }) {
  return (
    <div className="shrink-0 px-4 pt-4 pb-3">
      <div className="flex items-center justify-between mb-2.5">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          aria-label="뒤로가기"
        >
          <ArrowLeftIcon />
        </button>
        <div className="text-center">
          <p className="text-[13px] font-medium text-white">{group.title}</p>
          {session && (
            <p className="text-[10px] text-white/50 mt-0.5">
              {formatDate(session.date)} · {session.capturedAt}
            </p>
          )}
        </div>
        <button
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          aria-label="멤버 보기"
        >
          <UsersIcon />
        </button>
      </div>

      {/* 세션 진행 표시 바 */}
      {sessions && sessions.length > 1 && (
        <div className="flex gap-1">
          {sessions.map((s, i) => (
            <div
              key={s.id}
              className={`flex-1 h-[2px] rounded-full ${
                i === currentIndex ? "bg-white" : "bg-white/25"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 멤버 수에 따라 분할 레이아웃 결정
 * 1명: 전체화면 / 2명: 상하 2분할 / 3명: 1+2 / 4명 이상: 2x2 그리드
 */
function SplitGrid({ entries }) {
  const count = entries.length;

  if (count === 1) {
    return <VideoTile entry={entries[0]} className="h-full" />;
  }

  if (count === 2) {
    return (
      <div className="h-full flex flex-col gap-1">
        {entries.map((e) => (
          <VideoTile key={e.userId} entry={e} className="flex-1 min-h-0" />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="h-full flex flex-col gap-1">
        <VideoTile entry={entries[0]} className="flex-1 min-h-0" />
        <div className="flex-1 min-h-0 flex gap-1">
          <VideoTile entry={entries[1]} className="flex-1 min-w-0" />
          <VideoTile entry={entries[2]} className="flex-1 min-w-0" />
        </div>
      </div>
    );
  }

  // 4명 이상: 2열 그리드
  return (
    <div className="h-full grid grid-cols-2 gap-1 auto-rows-fr">
      {entries.map((e) => (
        <VideoTile key={e.userId} entry={e} />
      ))}
    </div>
  );
}

function VideoTile({ entry, className = "" }) {
  return (
    <div
      className={`relative bg-[#141416] rounded-lg overflow-hidden flex items-center justify-center ${className}`}
    >
      {/* 실제 연동 시 <video src={entry.videoUrl} autoPlay loop muted playsInline /> 로 교체 */}
      <PlayIcon />

      <div className="absolute top-2 left-2 flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-[#5b9dff] flex items-center justify-center text-[9px] text-white font-medium">
          {entry.userName[0]}
        </div>
        <span className="text-[10px] text-white/85">{entry.userName}</span>
      </div>

      {entry.caption && (
        <p className="absolute bottom-2 left-2 right-2 text-[11px] text-white bg-black/45 px-2 py-1 rounded-md leading-snug">
          {entry.caption}
        </p>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/* --- 아이콘 --- */

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3" stroke="white" strokeWidth="1.7" />
      <path d="M3.5 19c1-3 3-4.5 5.5-4.5S13.5 16 14.5 19" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 6.5a3 3 0 0 1 0 5.5M17.5 14.8c1.6.7 2.6 2 3 4.2" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 5.5v13l11-6.5-11-6.5z" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}