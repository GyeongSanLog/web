import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import AppHeader from "../components/AppHeader";
import { fetchPopularAreas, fetchOngoingFestivals, fetchAreaList } from "../api/areas";
import SectionTitle from "../components/SectionTitle";
import { categoryStyle, rankStyle } from "../utils/category";
import { useNotifications } from "../context/NotificationsContext";

/**
 * 이름 매칭용 정규화 - 공백/대소문자 차이로 매칭이 실패하는 걸 줄임
 * (예: "갓 바위" vs "갓바위", "대구CC" vs "대구cc")
 */
function normalizeName(name) {
  return (name ?? "").replace(/\s+/g, "").toLowerCase();
}

/** 시간대에 맞는 인사 - 같은 문장만 계속 보이지 않게 아침/낮/저녁을 구분 */
function greetingForNow(date = new Date()) {
  const h = date.getHours();
  if (h < 6) return "늦은 밤이에요";
  if (h < 11) return "좋은 아침이에요";
  if (h < 17) return "볕 좋은 오후예요";
  if (h < 21) return "해 지는 저녁이에요";
  return "오늘 하루 수고했어요";
}

/**
 * 축제 카드에 사진이 없을 때 쓰는 대체 배경.
 * 예전엔 전부 같은 회색 상자였는데, 그 탓에 홈 화면에서 색이 다 빠져 보였다.
 * 경산의 계절색(진달래/가을볕/솔숲)을 번갈아 깔아준다.
 */
const FALLBACK_SCENES = [
  { from: "#E7A9A2", to: "#B4603F", deco: "blossom" },
  { from: "#EFC784", to: "#A4682A", deco: "sun" },
  { from: "#A9C29C", to: "#4B6B4E", deco: "pine" },
];

export default function Home() {
  const navigate = useNavigate();
  const [popularSpots, setPopularSpots] = useState([]); // TOP5 전체 (인기 장소)
  const [loading, setLoading] = useState(true);

  const [festivals, setFestivals] = useState([]);
  const [showAllFestivals, setShowAllFestivals] = useState(false); // 더보기 눌렀는지

  // 종 아이콘에 안 읽은 알림 개수 뱃지를 표시하기 위함.
  // (알림 자체는 아직 로컬에만 쌓임 — NotificationsContext 주석 참고)
  const { unreadCount } = useNotifications();

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
    <div className="h-full flex flex-col relative bg-[#FDFAF4]">
      <AppHeader
        right={
          <button
            onClick={() => navigate("/notifications")}
            className="relative w-9 h-9 rounded-full bg-[#F6ECDD] border border-[#EBDCC4] flex items-center justify-center shrink-0 gs-press"
            aria-label={unreadCount > 0 ? `알림, 안 읽은 알림 ${unreadCount}개` : "알림"}
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#B04A46] text-white text-[9.5px] font-bold flex items-center justify-center"
                aria-hidden="true"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto pb-28">

        {/* 인사말 + 검색 - 아침볕 같은 그라데이션 위에 얹는다 */}
        <div className="relative px-5 pt-6 pb-8 bg-gradient-to-b from-[#FCF3E2] via-[#FBF6EC] to-[#FDFAF4] overflow-hidden">
          {/* 오른쪽 위로 떠 있는 해 */}
          <div
            className="absolute -top-4 -right-5 w-28 h-28 rounded-full bg-[#E8B769]/20 gs-float"
            aria-hidden="true"
          />

          <div className="relative gs-rise">
            <p className="text-sm text-[#6B6156]">{greetingForNow()}</p>
            <p className="font-brand text-[22px] font-bold text-[#2A2420] mt-1 leading-snug">
              오늘은 경산 어디로 가볼까요
            </p>
          </div>

          <button
            onClick={() => navigate("/search")}
            className="relative w-full h-12 rounded-2xl bg-[#FFFDF8] border border-[#E7DAC4] shadow-sm shadow-[#8B4A26]/5 flex items-center gap-2.5 px-4 mt-5 text-left gs-press gs-rise hover:border-[#D8C3A0]"
            style={{ animationDelay: "80ms" }}
          >
            <SearchIcon />
            <span className="text-sm text-[#9A9082]">관광장소 / 키워드로 검색</span>
          </button>
        </div>

        <div className="px-5">

          {/* 진행중인 축제 - 예전엔 로그인 직후 팝업으로 띄웠으나, 화면을
              가리는 느낌이라 경산소식이 있던 자리에 상시 노출 섹션으로 변경.
              인기 장소 섹션과 동일한 인터페이스: 3개까지 가로 스크롤,
              초과분은 더보기로 펼침. 축제가 0개여도 섹션은 유지하고
              빈 상태 문구를 보여줌. */}
          <SectionTitle
            tone="#B04A46"
            action={
              !showAllFestivals && festivals.length > 3 ? (
                <button
                  onClick={() => setShowAllFestivals(true)}
                  className="text-xs text-[#8B4A26] font-medium gs-press"
                >
                  더보기
                </button>
              ) : null
            }
          >
            진행중인 축제
          </SectionTitle>

          {festivals.length === 0 ? (
            <p className="text-xs text-[#8C8274] py-4 mb-4">
              현재 진행중인 축제가 없습니다
            </p>
          ) : (
            <div
              className={
                showAllFestivals
                  ? "flex flex-wrap gap-2.5 mb-8 gs-stagger"
                  : "flex gap-2.5 overflow-x-auto mb-8 -mx-5 px-5 pb-1 scrollbar-hide gs-stagger"
              }
            >
              {visibleFestivals.map((f, i) => (
                <FestivalCard
                  key={f.id}
                  festival={f}
                  scene={FALLBACK_SCENES[i % FALLBACK_SCENES.length]}
                  onClick={() => navigate(`/spots/${f.id}`)}
                />
              ))}
            </div>
          )}

          {/* 인기 장소 (중심 관광지 TOP5)
              popular API(TourAPI 원본)는 imageUrl/placeId를 주지 않아서
              썸네일 없이 순위 리스트 형식으로 표시. 카드 자체는 클릭 불가.
              우리 DB와 이름 매칭에 성공한 항목만 이름 옆에 ⓘ 아이콘을 두고,
              그 아이콘만 눌러서 상세페이지로 이동 가능.
              TOP5 전부를 처음부터 다 보여줌 (더보기 없음). */}
          <SectionTitle tone="#3F6B45">인기 장소</SectionTitle>

          {loading ? (
            <div className="flex flex-col gap-2.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 rounded-xl gs-skeleton" />
              ))}
            </div>
          ) : popularSpots.length === 0 ? (
            <p className="text-xs text-[#8C8274] py-4">아직 준비된 인기 장소가 없어요</p>
          ) : (
            <div className="flex flex-col gs-stagger">
              {popularSpots.map((spot, i) => {
                const rank = rankStyle(spot.rank);
                const cat = categoryStyle(spot.categoryMedium);
                return (
                  <div
                    key={spot.rank}
                    className={`flex items-center gap-3 py-3 ${
                      i !== popularSpots.length - 1 ? "border-b border-[#EFE7D9]" : ""
                    }`}
                  >
                    {/* 순위 - 1·2·3등은 금/솔/황토로 구분 */}
                    <span
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[13px] font-bold"
                      style={{ backgroundColor: rank.bg, color: rank.fg }}
                    >
                      {spot.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-[#2A2420] truncate">{spot.name}</p>
                        {spot.placeId && (
                          <button
                            onClick={() => navigate(`/spots/${spot.placeId}`)}
                            aria-label={`${spot.name} 상세정보 보기`}
                            className="shrink-0 gs-press"
                          >
                            <InfoIcon />
                          </button>
                        )}
                      </div>
                      {spot.categoryMedium && (
                        <span
                          className="inline-block text-[10px] rounded-full px-2 py-0.5 mt-1"
                          style={{ backgroundColor: cat.bg, color: cat.fg }}
                        >
                          {spot.categoryMedium}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <BottomNav />
    </div>
  );
}

/** 축제 카드 - 사진이 없으면 계절색 그라데이션 + 작은 장식으로 채운다 */
function FestivalCard({ festival, scene, onClick }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 w-[150px] h-[134px] rounded-2xl relative overflow-hidden text-left gs-press shadow-sm shadow-[#8B4A26]/10"
      style={
        festival.imageUrl
          ? { backgroundColor: "#F4EFE6" }
          : { backgroundImage: `linear-gradient(150deg, ${scene.from}, ${scene.to})` }
      }
    >
      {festival.imageUrl ? (
        <img
          src={festival.imageUrl}
          alt={festival.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <SceneDeco kind={scene.deco} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
      <div className="absolute bottom-2.5 left-3 right-3">
        <p className="text-[13px] font-medium text-white leading-tight truncate">
          {festival.name}
        </p>
        <p className="text-[11px] text-white/85 mt-0.5">
          {formatFestivalPeriod(festival.eventStartDate, festival.eventEndDate)}
        </p>
      </div>
    </button>
  );
}

/** 사진 없는 축제 카드 위에 얹는 계절 장식 (진달래 / 가을볕 / 솔숲) */
function SceneDeco({ kind }) {
  if (kind === "blossom") {
    return (
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 150 134" fill="none" aria-hidden="true">
        <g className="gs-sway" style={{ transformOrigin: "112px 30px" }}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse
              key={a}
              cx="112"
              cy="30"
              rx="7"
              ry="13"
              fill="#ffffff"
              fillOpacity="0.45"
              transform={`rotate(${a} 112 30)`}
            />
          ))}
          <circle cx="112" cy="30" r="4" fill="#FFF1C9" fillOpacity="0.9" />
        </g>
        <circle cx="34" cy="88" r="5" fill="#ffffff" fillOpacity="0.25" />
        <circle cx="58" cy="62" r="3.5" fill="#ffffff" fillOpacity="0.2" />
      </svg>
    );
  }
  if (kind === "sun") {
    return (
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 150 134" fill="none" aria-hidden="true">
        <circle cx="112" cy="32" r="18" fill="#FFF3D4" fillOpacity="0.35" />
        <circle cx="112" cy="32" r="11" fill="#FFF3D4" fillOpacity="0.6" />
        <path d="M0 110l26-18 24 13 26-22 30 20 44-16v27H0z" fill="#ffffff" fillOpacity="0.16" />
      </svg>
    );
  }
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 150 134" fill="none" aria-hidden="true">
      <path d="M0 106l24-26 22 18 26-32 28 26 30-20v62H0z" fill="#ffffff" fillOpacity="0.18" />
      <path d="M0 118l30-18 26 14 30-20 34 18 30-12v34H0z" fill="#ffffff" fillOpacity="0.14" />
      <circle cx="116" cy="30" r="9" fill="#FFF3D4" fillOpacity="0.45" />
    </svg>
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
      <path
        d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z"
        fill="#E8B769"
        fillOpacity="0.35"
        stroke="#8B4A26"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 18.5a2 2 0 0 0 4 0" stroke="#8B4A26" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="#8B4A26" strokeWidth="1.8" strokeOpacity="0.75" />
      <path d="M20 20l-4.5-4.5" stroke="#8B4A26" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.75" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#8B4A26" strokeWidth="1.6" />
      <path d="M12 11v5.5" stroke="#8B4A26" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="8" r="1" fill="#8B4A26" />
    </svg>
  );
}