import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchGroupDetail } from "../api/groups";

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchGroupDetail(groupId)
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-white px-5 pt-6">
        <div className="w-2/3 h-4 bg-[#f5f5f7] rounded animate-pulse mb-5" />
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-square bg-[#f5f5f7] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full bg-white flex flex-col items-center justify-center px-5">
        <p className="text-sm text-[#98989d] mb-4">{error || "정보를 불러올 수 없어요"}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-[#3d7ce0] font-medium">
          돌아가기
        </button>
      </div>
    );
  }

  const { group, clips } = data;
  // 편지 기능은 추후 확정 후 재적용 예정. data.letters는 api.js에서 계속 내려주고 있으니
  // 다시 넣을 때는 위 줄을 `const { group, clips, letters } = data;`로 바꾸고
  // 아래 편지 섹션 주석을 해제하면 됨.

  return (
    <div className="h-full overflow-y-auto bg-white pb-8">
      <div className="px-5 pt-6">

        {/* 헤더 */}
        <div className="flex items-center gap-2.5 mb-5">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center shrink-0"
            aria-label="뒤로가기"
          >
            <ArrowLeftIcon />
          </button>
          <div>
            <p className="text-[15px] font-medium text-[#1c1c1e]">{group.title}</p>
            <p className="text-[11px] text-[#98989d] mt-0.5">
              {formatShortDate(group.startDate)} ~ {formatShortDate(group.endDate)} · {group.memberCount}명 참여
            </p>
          </div>
        </div>

        {/* 영상 그리드 */}
        {clips.length === 0 ? (
          <p className="text-sm text-[#98989d] text-center py-10">
            아직 업로드된 셋로그가 없어요
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {clips.map((clip, i) => (
              <button
                key={clip.id}
                onClick={() => navigate(`/gallery/${groupId}/clips/${clip.id}`)}
                className={`bg-[#f5f5f7] rounded-lg flex items-center justify-center relative ${
                  i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
                }`}
              >
                <PlayIcon size={i === 0 ? 22 : 15} />
                <span className="absolute bottom-1.5 left-1.5 text-[9px] text-white bg-black/45 px-1.5 py-0.5 rounded">
                  {clip.capturedAt}
                </span>
              </button>
            ))}
          </div>
        )}

        {/*
          편지 섹션 - 추후 확정 후 재적용
          <p className="text-sm font-medium text-[#1c1c1e] mb-2.5 mt-7">편지</p>
          {letters.length === 0 ? (
            <p className="text-xs text-[#98989d] py-4">아직 남겨진 편지가 없어요</p>
          ) : (
            <div className="flex flex-col gap-2">
              {letters.map((letter) => (
                <div key={letter.id} className="bg-[#f5f5f7] rounded-xl p-3 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#3d7ce0] flex items-center justify-center text-xs text-white font-medium shrink-0">
                    {letter.authorName[0]}
                  </div>
                  <div>
                    <p className="text-xs text-[#1c1c1e]">{letter.authorName}가 남긴 편지</p>
                    <p className="text-[11px] text-[#98989d] mt-0.5">{letter.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        */}

      </div>
    </div>
  );
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

/* --- 아이콘 --- */

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="#1c1c1e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 5.5v13l11-6.5-11-6.5z" fill="#c7c7cc" />
    </svg>
  );
}