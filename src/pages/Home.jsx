import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import AppHeader from "../components/AppHeader";
import { fetchPopularAreas, fetchOngoingFestivals, fetchAreaList } from "../api/areas";

/**
 * 이름 매칭용 정규화 - 공백/대소문자 차이로 매칭이 실패하는 걸 줄임
 * (예: "갓 바위" vs "갓바위", "대구CC" vs "대구cc")
 */
function normalizeName(name) {
  return (name ?? "").replace(/\s+/g, "").toLowerCase();
}

export default function Home() {
  const navigate = useNavigate();
  const [popularSpots, setPopularSpots] = useState([]); // TOP5 전체 (인기 장소)
  const [loading, setLoading] = useState(true);

  const [festivals, setFestivals] = useState([]);
  const [showAllFestivals, setShowAllFestivals] = useState(false); // 더보기 눌렀는지

  useEffect(() => {
    // popular API(TourAPI 원본)는 imageUrl과 placeId를 주지 않아서,
    // 우리 DB의 관광지 목록을 함께 받아 "이름"으로 매칭해 부족한 정보를 채움.
    // 매칭되면 썸네일과 상세페이지 이동이 가능해지고, 매칭 실패한 항목은
    // 지금처럼 텍스트 정보만 보여줌.
    Promise.all([
      fetchPopularAreas(),
      fetchAreaList({ page: 0, size: 200 }).catch(() => ({ content: [] })),
    ])
      .then(([popularRes, listRes]) => {
        const popular = popularRes ?? [];
        const ourPlaces = listRes?.content ?? [];

        // 우리 DB 관광지를 정규화된 이름으로 색인
        const placeByName = new Map(
          ourPlaces.map((p) => [normalizeName(p.name), p])
        );

        const merged = popular.map((spot) => {
          const matched = placeByName.get(normalizeName(spot.name));
          return {
            ...spot,
            // 매칭 성공 시에만 값이 채워짐 (실패하면 undefined)
            placeId: matched?.id,
            imageUrl: matched?.imageUrl,
          };
        });

        setPopularSpots(merged);
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
        setFestivals(res ?? []);
      })
      .catch((err) => {
        if (err.message === "AUTH_EXPIRED") return; // 인기장소 쪽에서 이미 처리됨
        console.error("축제 목록 로드 실패:", err);
      });
  }, []);

  const visibleFestivals = showAllFestivals ? festivals : festivals.slice(0, 3);

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

        {/* 진행중인 축제 - 예전엔 로그인 직후 팝업으로 띄웠으나, 화면을
            가리는 느낌이라 경산소식이 있던 자리에 상시 노출 섹션으로 변경.
            인기 장소 섹션과 동일한 인터페이스: 3개까지 가로 스크롤,
            초과분은 더보기로 펼침. 축제가 0개여도 섹션은 유지하고
            빈 상태 문구를 보여줌. */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-medium text-[#1c1c1e]">진행중인 축제</p>
          {!showAllFestivals && festivals.length > 3 && (
            <button
              onClick={() => setShowAllFestivals(true)}
              className="text-xs text-[#98989d]"
            >
              더보기
            </button>
          )}
        </div>

        {festivals.length === 0 ? (
          <p className="text-xs text-[#98989d] py-4 mb-4">
            현재 진행중인 축제가 없습니다
          </p>
        ) : (
          <div
            className={
              showAllFestivals
                ? "flex flex-wrap gap-2.5 mb-8"
                : "flex gap-2.5 overflow-x-auto mb-8 -mx-5 px-5 pb-1 scrollbar-hide"
            }
          >
            {visibleFestivals.map((f) => (
              <button
                key={f.id}
                onClick={() => navigate(`/spots/${f.id}`)}
                className="shrink-0 w-[150px] h-[130px] rounded-2xl bg-[#f5f5f7] relative overflow-hidden text-left"
              >
                {f.imageUrl ? (
                  <img
                    src={f.imageUrl}
                    alt={f.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
                <div className="absolute bottom-2.5 left-3 right-3">
                  <p className="text-[13px] font-medium text-white leading-tight truncate">
                    {f.name}
                  </p>
                  <p className="text-[11px] text-white/80 mt-0.5">
                    {formatFestivalPeriod(f.eventStartDate, f.eventEndDate)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 인기 장소 (중심 관광지 TOP5)
            popular API(TourAPI 원본)는 imageUrl/placeId를 주지 않아서
            썸네일 없이 순위 리스트 형식으로 표시. 카드 자체는 클릭 불가.
            우리 DB와 이름 매칭에 성공한 항목만 이름 옆에 ⓘ 아이콘을 두고,
            그 아이콘만 눌러서 상세페이지로 이동 가능.
            TOP5 전부를 처음부터 다 보여줌 (더보기 없음). */}
        <p className="text-base font-medium text-[#1c1c1e] mb-3">인기 장소</p>

        {loading ? (
          <div className="flex flex-col gap-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-[#f5f5f7] animate-pulse" />
            ))}
          </div>
        ) : popularSpots.length === 0 ? (
          <p className="text-xs text-[#98989d] py-4">아직 준비된 인기 장소가 없어요</p>
        ) : (
          <div className="flex flex-col">
            {popularSpots.map((spot, i) => (
              <div
                key={spot.rank}
                className={`flex items-center gap-3 py-3 ${
                  i !== popularSpots.length - 1 ? "border-b border-[#f0f0f2]" : ""
                }`}
              >
                <span className="w-5 text-sm font-bold text-[#6F4A2C] shrink-0 text-center">
                  {spot.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-[#1c1c1e] truncate">{spot.name}</p>
                    {spot.placeId && (
                      <button
                        onClick={() => navigate(`/spots/${spot.placeId}`)}
                        aria-label={`${spot.name} 상세정보 보기`}
                        className="shrink-0"
                      >
                        <InfoIcon />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-[#98989d] mt-0.5">{spot.categoryMedium}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

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

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#6F4A2C" strokeWidth="1.6" />
      <path d="M12 11v5.5" stroke="#6F4A2C" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="8" r="1" fill="#6F4A2C" />
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