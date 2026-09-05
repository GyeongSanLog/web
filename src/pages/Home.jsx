import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import AppHeader from "../components/AppHeader";
import { fetchPopularAreas, fetchOngoingFestivals } from "../api/areas";

// 축제 팝업 "다시보지않기" 저장 키. 축제 id별로 저장해서, 같은 축제가
// 계속 진행중이면 그 축제에 한해 다시 안 뜨고, 새로운 축제가 열리면
// 그건 다시 안내되도록 함.
const HIDDEN_FESTIVAL_KEY = "gyeongsanlog:hiddenFestivalIds";

function getHiddenFestivalIds() {
  try {
    const raw = localStorage.getItem(HIDDEN_FESTIVAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addHiddenFestivalIds(ids) {
  try {
    const current = getHiddenFestivalIds();
    const merged = Array.from(new Set([...current, ...ids]));
    localStorage.setItem(HIDDEN_FESTIVAL_KEY, JSON.stringify(merged));
  } catch (err) {
    console.error("다시보지않기 저장 실패:", err);
  }
}

export default function Home() {
  const navigate = useNavigate();
  const [popularSpots, setPopularSpots] = useState([]); // TOP5 전체 (인기 장소)
  const [showAllPopular, setShowAllPopular] = useState(false); // 더보기 눌렀는지
  const [loading, setLoading] = useState(true);

  const [festivals, setFestivals] = useState([]);
  const [showFestivalPopup, setShowFestivalPopup] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    fetchPopularAreas()
      .then((res) => {
        setPopularSpots(res ?? []);
      })
      .catch((err) => {
        if (err.message === "AUTH_EXPIRED") {
          navigate("/login");
          return;
        }
        console.error("인기 장소 로드 실패:", err);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    fetchOngoingFestivals()
      .then((res) => {
        const list = res ?? [];
        const hiddenIds = getHiddenFestivalIds();
        const visible = list.filter((f) => !hiddenIds.includes(f.id));
        setFestivals(list);
        if (visible.length > 0) {
          setShowFestivalPopup(true);
        }
      })
      .catch((err) => {
        if (err.message === "AUTH_EXPIRED") return; // 인기장소 쪽에서 이미 처리됨
        console.error("축제 목록 로드 실패:", err);
      });
  }, []);

  function closeFestivalPopup() {
    if (dontShowAgain) {
      addHiddenFestivalIds(festivals.map((f) => f.id));
    }
    setShowFestivalPopup(false);
  }

  const visiblePopular = showAllPopular ? popularSpots : popularSpots.slice(0, 3);

  return (
    <div className="h-full flex flex-col relative">
      <AppHeader
        right={
          <button
            onClick={() => navigate("/notifications")}
            className="w-9 h-9 rounded-full bg-[#f3ece4] flex items-center justify-center shrink-0"
            aria-label="알림"
          >
            <BellIcon />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-28">

        {/* 상단 인사말 */}
        <div className="mb-5">
          <p className="text-sm text-[#6e6e73]">안녕하세요</p>
          <p className="text-lg font-medium text-[#1c1c1e] mt-0.5">
            오늘은 어디로 가볼까요
          </p>
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

        {/* 인기 장소 (중심 관광지 TOP5) */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-medium text-[#1c1c1e]">인기 장소</p>
          {!showAllPopular && popularSpots.length > 3 && (
            <button
              onClick={() => setShowAllPopular(true)}
              className="text-xs text-[#98989d]"
            >
              더보기
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex gap-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-[100px] h-[100px] rounded-2xl bg-[#f5f5f7] animate-pulse" />
            ))}
          </div>
        ) : visiblePopular.length === 0 ? (
          <p className="text-xs text-[#98989d] py-4">아직 준비된 인기 장소가 없어요</p>
        ) : (
          <div className={showAllPopular ? "grid grid-cols-3 gap-2.5" : "flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide"}>
            {visiblePopular.map((spot) => (
              // popular API는 TourAPI 원본이라 우리 DB의 id와 연결되지 않음
              // (placeId가 없어 /spots/:id로 이동 불가) - 정보성 카드로만 표시.
              // 나중에 백엔드가 placeId를 내려주면 버튼으로 바꿔 이동 가능하게 할 것.
              <div key={spot.rank} className="shrink-0 w-[100px] text-left">
                <div className="w-[100px] h-[100px] rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] relative flex items-center justify-center mb-1.5 overflow-hidden">
                  <span className="absolute top-1.5 left-1.5 w-[18px] h-[18px] rounded-[5px] bg-white shadow-sm text-[11px] font-bold text-[#6F4A2C] flex items-center justify-center">
                    {spot.rank}
                  </span>
                  <ImageIcon />
                </div>
                <p className="text-xs text-[#1c1c1e] leading-tight">{spot.name}</p>
                <p className="text-[10px] text-[#98989d] mt-0.5">{spot.categoryMedium}</p>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* 진행중인 축제 팝업 */}
      {showFestivalPopup && festivals.length > 0 && (
        <div className="absolute inset-0 z-30 flex items-center justify-center px-8 bg-black/40">
          <div className="w-full bg-white rounded-2xl overflow-hidden">
            <div className="flex items-center justify-end px-3 pt-3">
              <button
                onClick={closeFestivalPopup}
                aria-label="닫기"
                className="w-7 h-7 rounded-full bg-[#f5f5f7] flex items-center justify-center"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="px-5 pb-2">
              <p className="text-[15px] font-medium text-[#1c1c1e] mb-3">
                진행중인 축제 소식
              </p>
              <div className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto">
                {festivals.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setShowFestivalPopup(false);
                      navigate(`/spots/${f.id}`);
                    }}
                    className="flex gap-3 items-center text-left bg-[#f5f5f7] rounded-xl p-2.5"
                  >
                    <div className="w-14 h-14 rounded-lg bg-[#e5e5ea] shrink-0 overflow-hidden flex items-center justify-center">
                      {f.imageUrl ? (
                        <img src={f.imageUrl} alt={f.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#1c1c1e] truncate">{f.name}</p>
                      <p className="text-[11px] text-[#98989d] mt-0.5">
                        {formatFestivalPeriod(f.eventStartDate, f.eventEndDate)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#f0f0f2]">
              <label className="flex items-center gap-1.5 text-xs text-[#6e6e73]">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#6F4A2C]"
                />
                다시 보지 않기
              </label>
              <button
                onClick={closeFestivalPopup}
                className="text-xs text-[#6F4A2C] font-medium"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function formatFestivalPeriod(startDate, endDate) {
  if (!startDate) return "";
  const s = new Date(startDate);
  const label = `${s.getMonth() + 1}.${s.getDate()}`;
  if (!endDate) return label;
  const e = new Date(endDate);
  return `${label} ~ ${e.getMonth() + 1}.${e.getDate()}`;
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

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="#1c1c1e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}