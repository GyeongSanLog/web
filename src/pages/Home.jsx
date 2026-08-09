import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import AppHeader from "../components/AppHeader";
import { fetchAreaList } from "../api";

export default function Home() {
  const navigate = useNavigate();
  const [topSpots, setTopSpots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAreaList()
      .then((res) => {
        const sorted = [...res.contents].sort((a, b) => a.rank - b.rank);
        setTopSpots(sorted.slice(0, 3));
      })
      .catch((err) => console.error("인기 장소 로드 실패:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full flex flex-col">

      <AppHeader />

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-28">

        {/* 상단 인사말 + 알림 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm text-[#6e6e73]">안녕하세요</p>
            <p className="text-lg font-medium text-[#1c1c1e] mt-0.5">
              오늘은 어디로 가볼까요
            </p>
          </div>
          <button
            onClick={() => navigate("/notifications")}
            className="w-9 h-9 rounded-full bg-[#f3ece4] flex items-center justify-center shrink-0"
            aria-label="알림"
          >
            <BellIcon />
          </button>
        </div>

        {/* 검색 */}
        <button
          onClick={() => navigate("/search")}
          className="w-full h-11 rounded-xl bg-[#f5f5f7] border border-[#e5e5ea] flex items-center gap-2 px-4 mb-7 text-left"
        >
          <SearchIcon />
          <span className="text-sm text-[#98989d]">관광장소 / 키워드로 검색</span>
        </button>

        {/* 경산 소식 */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-medium text-[#1c1c1e]">경산 소식</p>
          <button onClick={() => navigate("/news")} className="text-xs text-[#98989d]">
            더보기
          </button>
        </div>

        <div className="flex gap-2.5 overflow-x-auto mb-8 -mx-5 px-5 pb-1 scrollbar-hide">
          {newsItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/news/${item.id}`)}
              className="shrink-0 w-[150px] h-[130px] rounded-2xl bg-[#f5f5f7] relative overflow-hidden text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
              <div className="absolute bottom-2.5 left-3 right-3">
                <p className="text-[13px] font-medium text-white leading-tight">{item.title}</p>
                <p className="text-[11px] text-white/80 mt-0.5">{item.date}</p>
              </div>
            </button>
          ))}
        </div>

        {/* 인기 장소 Top3 */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-medium text-[#1c1c1e]">인기 장소 Top3</p>
          <span className="text-[11px] text-[#98989d]">중심관광지 API</span>
        </div>

        {loading ? (
          <div className="flex gap-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-[100px] h-[100px] rounded-2xl bg-[#f5f5f7] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
            {topSpots.map((spot) => (
              <button
                key={spot.id}
                onClick={() => navigate(`/spots/${spot.id}`)}
                className="shrink-0 w-[100px] text-left"
              >
                <div className="w-[100px] h-[100px] rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] relative flex items-center justify-center mb-1.5">
                  <span className="absolute top-1.5 left-1.5 w-[18px] h-[18px] rounded-[5px] bg-white shadow-sm text-[11px] font-bold text-[#6F4A2C] flex items-center justify-center">
                    {spot.rank}
                  </span>
                  <ImageIcon />
                </div>
                <p className="text-xs text-[#1c1c1e] leading-tight">{spot.name}</p>
              </button>
            ))}
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  );
}

const newsItems = [
  { id: 1, title: "경산 벚꽃축제", date: "4.1 ~ 4.10" },
  { id: 2, title: "경산자인단오제", date: "5.20 ~ 5.22" },
];

/* --- 아이콘 --- */

function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z" stroke="#6F4A2C" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 18.5a2 2 0 0 0 4 0" stroke="#6F4A2C" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="#98989d" strokeWidth="1.8" />
      <path d="M20 20l-4.5-4.5" stroke="#98989d" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" stroke="#c7c7cc" strokeWidth="1.6" />
      <circle cx="8.3" cy="9.3" r="1.4" stroke="#c7c7cc" strokeWidth="1.4" />
      <path d="M5 17l4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 16m-1.5-1.5l1.3-1.3a1.5 1.5 0 0 1 2.1 0L19.5 16" stroke="#c7c7cc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}