import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { fetchGallery } from "../api";

export default function Gallery() {
  const navigate = useNavigate();
  const [ongoing, setOngoing] = useState(null);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGallery()
      .then((res) => {
        setOngoing(res.ongoing);
        setPast(res.past);
      })
      .catch((err) => console.error("갤러리 로드 실패:", err))
      .finally(() => setLoading(false));
  }, []);

  const groupedPast = groupByMonth(past);

  return (
    // 화면 전체를 세로로 채우고, 스크롤 영역과 하단바 영역을 분리
    <div className="h-full flex flex-col">

      {/* 스크롤되는 콘텐츠 영역 (하단바는 이 안에 없음) */}
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-28">

        <p className="text-lg font-medium text-[#1c1c1e] mb-5">갤러리</p>

        {loading ? (
          <GallerySkeleton />
        ) : (
          <>
            <p className="text-xs text-[#98989d] mb-2.5">진행중인 log</p>
            <div className="flex gap-2.5 mb-7">
              {ongoing ? (
                <button
                  onClick={() => navigate(`/gallery/${ongoing.id}`)}
                  className="w-[130px] h-[130px] rounded-2xl bg-[#1c1c1e] border-[1.5px] border-[#3d7ce0] relative flex items-end p-2.5 text-left overflow-hidden shrink-0"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="relative">
                    <p className="text-[13px] font-medium text-white leading-tight">
                      {ongoing.title}
                    </p>
                    <p className="text-[11px] text-white/75 mt-0.5">
                      {formatShortDate(ongoing.startDate)} ~ {formatShortDate(ongoing.endDate)}
                    </p>
                  </div>
                </button>
              ) : null}

              <button
                onClick={() => navigate("/camera")}
                className="w-[130px] h-[130px] rounded-2xl bg-[#f5f5f7] border border-dashed border-[#c7c7cc] flex flex-col items-center justify-center gap-1.5 shrink-0"
              >
                <PlusIcon />
                <span className="text-[11px] text-[#98989d] text-center leading-tight px-2">
                  {ongoing ? "새 여행\n그룹 만들기" : "진행중인 여행이\n없으면\n그룹 만들기"}
                </span>
              </button>
            </div>

            <div className="h-px bg-[#e5e5ea] mb-6" />

            {groupedPast.length === 0 ? (
              <p className="text-sm text-[#98989d] text-center py-10">
                지난 여행 기록이 아직 없어요
              </p>
            ) : (
              groupedPast.map(({ month, items }) => (
                <div key={month} className="mb-6">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs text-[#98989d]">날짜 {month}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {items.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => navigate(`/gallery/${g.id}`)}
                        className="aspect-square rounded-xl bg-[#f5f5f7] relative flex items-center justify-center overflow-hidden text-left"
                      >
                        <PhotoPlaceholderIcon />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                        <p className="absolute bottom-2 left-2.5 text-[11px] text-white font-medium">
                          {g.title}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}

      </div>

      {/* 하단바는 스크롤 영역 밖에 위치 (항상 고정) */}
      <BottomNav />
    </div>
  );
}

function GallerySkeleton() {
  return (
    <>
      <div className="flex gap-2.5 mb-7">
        <div className="w-[130px] h-[130px] rounded-2xl bg-[#f5f5f7] animate-pulse" />
        <div className="w-[130px] h-[130px] rounded-2xl bg-[#f5f5f7] animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-square rounded-xl bg-[#f5f5f7] animate-pulse" />
        ))}
      </div>
    </>
  );
}

function groupByMonth(groups) {
  const map = {};
  groups.forEach((g) => {
    const d = new Date(g.startDate);
    const key = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map[key]) map[key] = [];
    map[key].push(g);
  });
  return Object.entries(map)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([month, items]) => ({ month, items }));
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

/* --- 아이콘 --- */

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="#98989d" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PhotoPlaceholderIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" stroke="#d4d4d8" strokeWidth="1.6" />
      <circle cx="8.3" cy="9.3" r="1.4" stroke="#d4d4d8" strokeWidth="1.4" />
      <path d="M5 17l4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 16m-1.5-1.5l1.3-1.3a1.5 1.5 0 0 1 2.1 0L19.5 16" stroke="#d4d4d8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}