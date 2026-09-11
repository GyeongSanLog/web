import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SectionTitle from "../components/SectionTitle";
import {
  AREA_TYPE_LABELS,
  fetchAreaDetail,
  toggleAreaFavorite,
  fetchAreaRecommendations,
} from "../api/areas";
import { categoryStyle } from "../utils/category";

export default function SpotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [spot, setSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorited, setFavorited] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    setLoading(true);
    fetchAreaDetail(id)
      .then((data) => {
        setSpot(data);
        // 서버가 찜 여부를 함께 내려주면 하트를 그 상태로 맞춘다.
        // 스웨거의 PlaceDetailResponse에는 아직 이 필드가 없어서(추가 요청 필요)
        // 필드가 없으면 false로 두고, 사용자가 누르는 순간부터만 반영된다.
        setFavorited(Boolean(data?.favorited ?? data?.isFavorite ?? false));
      })
      .catch((err) => {
        if (err.message === "AUTH_EXPIRED") {
          navigate("/login");
          return;
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // 같은 장소 기준 추천 3곳 - 상세 로드와 별개로 실패해도 화면 전체에 영향 없게 분리
  useEffect(() => {
    fetchAreaRecommendations({ placeId: id })
      .then((res) => setRecommendations(res ?? []))
      .catch((err) => {
        if (err.message === "AUTH_EXPIRED") return; // 메인 조회에서 이미 처리됨
        console.error("추천 조회 실패:", err);
      });
  }, [id]);

  async function handleToggleFavorite() {
    if (togglingFavorite) return;
    setTogglingFavorite(true);
    try {
      const res = await toggleAreaFavorite(id);
      setFavorited(res.favorited);
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") {
        navigate("/login");
        return;
      }
      console.error("찜하기 실패:", err);
    } finally {
      setTogglingFavorite(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-[#FDFAF4] px-5 pt-6">
        <div className="w-full h-[190px] rounded-2xl gs-skeleton mb-4" />
        <div className="w-1/2 h-4 rounded gs-skeleton mb-2" />
        <div className="w-2/3 h-3 rounded gs-skeleton" />
      </div>
    );
  }

  if (error || !spot) {
    return (
      <div className="h-full bg-[#FDFAF4] flex flex-col items-center justify-center px-5">
        <p className="text-sm text-[#8C8274] mb-4">
          {error || "장소 정보를 불러올 수 없어요"}
        </p>
        <button onClick={() => navigate(-1)} className="text-sm text-[#8B4A26] font-medium gs-press">
          돌아가기
        </button>
      </div>
    );
  }

  // 실제 API의 무장애 정보는 elevator/restroom/stroller 3종만 있음
  // (값이 null이면 "정보 없음"으로 표시. 문자열 값 자체를 그대로 보여줌 —
  //  예: "가능"/"불가능" 등 서버가 주는 표현을 그대로 신뢰)
  const accessibilityItems = [
    { label: "엘리베이터", value: spot.elevator, icon: ElevatorIcon },
    { label: "화장실", value: spot.restroom, icon: ToiletIcon },
    { label: "유모차 대여", value: spot.stroller, icon: StrollerIcon },
  ];

  const images = spot.imageUrls?.length ? spot.imageUrls : spot.imageUrl ? [spot.imageUrl] : [];
  const cat = categoryStyle(spot.category);

  return (
    <div className="h-full overflow-y-auto bg-[#FDFAF4] pb-8">

      {/* 이미지 슬라이드 영역 */}
      <div className="relative">
        <div className="w-full h-[210px] bg-gradient-to-br from-[#DCE7D6] to-[#9DB894] flex items-center justify-center overflow-hidden">
          {images[0] ? (
            <img src={images[0]} alt={spot.name} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon />
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#FDFAF4] to-transparent" />
        </div>
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3.5 left-3.5 w-9 h-9 rounded-full bg-[#FFFCF6]/92 backdrop-blur shadow-sm shadow-black/10 flex items-center justify-center gs-press"
          aria-label="뒤로가기"
        >
          <ArrowLeftIcon />
        </button>
        <button
          onClick={handleToggleFavorite}
          disabled={togglingFavorite}
          className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-[#FFFCF6]/92 backdrop-blur shadow-sm shadow-black/10 flex items-center justify-center gs-press disabled:opacity-60"
          aria-label="찜하기"
        >
          <HeartIcon filled={favorited} />
        </button>
        {images.length > 0 && (
          <span className="absolute bottom-2.5 right-3.5 text-[11px] text-white bg-black/45 px-2 py-0.5 rounded-full">
            슬라이드 1 / {images.length}
          </span>
        )}
      </div>

      <div className="px-5 pt-4">

        <div className="flex items-center gap-1.5 mb-1.5 gs-rise">
          {spot.category && (
            <span
              className="text-[10.5px] font-medium rounded-full px-2 py-0.5"
              style={{ backgroundColor: cat.bg, color: cat.fg }}
            >
              {AREA_TYPE_LABELS[spot.category] ?? spot.category}
            </span>
          )}
          <p className="text-[11px] text-[#8C8274] truncate">{spot.address}</p>
        </div>
        <p className="font-brand text-[22px] font-bold text-[#2A2420] mb-3.5 gs-rise">
          {spot.name}
        </p>

        {spot.content && (
          <p className="text-[13px] leading-relaxed text-[#6B6156] mb-5">
            {spot.content}
          </p>
        )}

        {/* 관광 정보 */}
        <SectionTitle tone="#8B4A26">관광 정보</SectionTitle>
        <div className="rounded-2xl bg-[#F8F3E9] border border-[#EFE4D2] px-3.5 py-1 mb-6">
          <InfoRow label="전화번호" value={spot.phoneNumber || "정보 없음"} />
          <InfoRow label="운영시간" value={spot.useTime || "정보 없음"} />
          <InfoRow label="휴무일" value={spot.restDate || "정보 없음"} />
          <InfoRow label="주차" value={spot.parking || "정보 없음"} last />
        </div>

        {/* 무장애 관광정보 */}
        <SectionTitle tone="#3F6B45">무장애 관광정보</SectionTitle>
        <div className="flex gap-4 overflow-x-auto -mx-5 px-5 pb-1 mb-6 scrollbar-hide gs-stagger">
          {accessibilityItems.map((item) => (
            <AccessIcon key={item.label} {...item} />
          ))}
        </div>

        {/* 지도 - 위경도는 있지만 이 화면의 지도 SDK 연동은 별도 작업 필요
            (지도 탭에는 이미 붙어 있음 - utils/kakaoMap.js) */}
        <div className="relative w-full h-[130px] rounded-2xl bg-gradient-to-b from-[#E7EFE4] to-[#D6E3D1] border border-[#D5E0CF] overflow-hidden flex flex-col items-center justify-center">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 340 130" fill="none" aria-hidden="true">
            <path d="M0 104l44-30 34 20 46-34 44 30 52-26 60 30v36H0z" fill="#9DB894" fillOpacity="0.45" />
            <path d="M0 118l52-20 40 12 50-18 48 16 56-14 94 16v20H0z" fill="#4B6B4E" fillOpacity="0.35" />
          </svg>
          <div className="relative gs-float">
            <MapPinOffIcon />
          </div>
          <p className="relative text-[11px] text-[#4B6B4E] mt-1.5">
            지도는 지도 탭에서 볼 수 있어요
          </p>
        </div>

        {/* 추천 - 같은 장소 기준 가까운 3곳 */}
        {recommendations.length > 0 && (
          <>
            <div className="mt-7">
              <SectionTitle tone="#B04A46">이런 곳도 있어요</SectionTitle>
            </div>
            <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide gs-stagger">
              {recommendations.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => navigate(`/spots/${rec.id}`)}
                  className="shrink-0 w-[110px] text-left gs-press"
                >
                  <div className="w-[110px] h-[110px] rounded-2xl bg-[#F6F0E4] border border-[#EBE0CE] flex items-center justify-center mb-1.5 overflow-hidden shadow-sm shadow-[#8B4A26]/5">
                    {rec.imageUrl ? (
                      <img src={rec.imageUrl} alt={rec.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon />
                    )}
                  </div>
                  <p className="text-xs text-[#2A2420] leading-tight">{rec.name}</p>
                  <p className="text-[10px] text-[#8C8274] mt-0.5">{rec.address}</p>
                </button>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

function InfoRow({ label, value, last }) {
  return (
    <div className={`flex items-center justify-between text-xs py-2.5 ${!last ? "border-b border-[#E6DDCD]" : ""}`}>
      <span className="text-[#8C8274]">{label}</span>
      <span className="text-[#2A2420]">{value}</span>
    </div>
  );
}

/**
 * value가 "있음"을 의미하는 문자열이면 활성 스타일로 표시.
 * null/undefined/"없음" 계열이면 비활성 스타일로 표시.
 * 서버가 정확히 어떤 문자열들을 주는지 아직 확정 전이라, 일단
 * "없음"/"불가"가 포함되지 않으면 있는 것으로 간주하는 느슨한 판정.
 * 실제 값 종류가 확인되면 이 판정 로직을 더 정확히 다듬을 필요 있음.
 */
function AccessIcon({ label, value, icon: Icon }) {
  const available = Boolean(value) && !/없음|불가/.test(value);
  return (
    <div className="flex flex-col items-center shrink-0 w-[52px]">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
          available ? "bg-[#E7F0E2] border border-[#D3E3CC]" : "bg-[#F4EFE6] border border-[#EBE0CE]"
        }`}
      >
        <Icon color={available ? "#3F7A47" : "#C6B9A4"} />
      </div>
      <p className="text-[9.5px] text-[#6B6156] leading-tight text-center">{label}</p>
    </div>
  );
}

/* --- 아이콘 (공통) --- */

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="#2A2420" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 20s-7-4.35-9.5-8.8C.7 7.8 2.6 4 6.2 4c2 0 3.4 1.1 4 2.4C10.8 5.1 12.2 4 14.2 4c3.6 0 5.5 3.8 3.7 7.2C19 15.65 12 20 12 20z"
        fill={filled ? "#d70015" : "none"}
        stroke={filled ? "#d70015" : "#2A2420"}
        strokeWidth="1.7"
      />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" stroke="#C6B9A4" strokeWidth="1.5" />
      <circle cx="8.3" cy="9.3" r="1.4" stroke="#C6B9A4" strokeWidth="1.4" />
      <path d="M5 17l4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 16m-1.5-1.5l1.3-1.3a1.5 1.5 0 0 1 2.1 0L19.5 16" stroke="#C6B9A4" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MapPinOffIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" fill="#ffffff" fillOpacity="0.7" stroke="#4B6B4E" strokeWidth="1.6" />
      <circle cx="12" cy="9" r="2.2" fill="#8B4A26" />
    </svg>
  );
}

/* --- 무장애 정보 아이콘 (3종만 사용) --- */

function ElevatorIcon({ color }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <rect x="4.5" y="3.5" width="15" height="17" rx="2" stroke={color} strokeWidth="1.7" />
      <path d="M10 8l-2 2.3h4L10 8zM14 15.7l2-2.3h-4l2 2.3z" fill={color} />
    </svg>
  );
}

function ToiletIcon({ color }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="5.5" r="1.6" stroke={color} strokeWidth="1.6" />
      <path d="M9 8v4.5M6.5 20l2.5-7.5M11.5 20L9 12.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17" cy="5.5" r="1.6" stroke={color} strokeWidth="1.6" />
      <path d="M14.5 20V11a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 19.5 11v9" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function StrollerIcon({ color }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <circle cx="7" cy="19" r="1.6" stroke={color} strokeWidth="1.5" />
      <circle cx="17" cy="19" r="1.6" stroke={color} strokeWidth="1.5" />
      <path d="M5 17h13l-2-8H9.5L5 17zM9.5 9L8 5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 9c1.5-1 2.5-.3 2.5 1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}