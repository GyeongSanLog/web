import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchAreaDetail } from "../api/areas";

export default function SpotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [spot, setSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchAreaDetail(id)
      .then((data) => setSpot(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-white px-5 pt-6">
        <div className="w-full h-[190px] rounded-2xl bg-[#f5f5f7] animate-pulse mb-4" />
        <div className="w-1/2 h-4 bg-[#f5f5f7] rounded animate-pulse mb-2" />
        <div className="w-2/3 h-3 bg-[#f5f5f7] rounded animate-pulse" />
      </div>
    );
  }

  if (error || !spot) {
    return (
      <div className="h-full bg-white flex flex-col items-center justify-center px-5">
        <p className="text-sm text-[#98989d] mb-4">
          {error || "장소 정보를 불러올 수 없어요"}
        </p>
        <button onClick={() => navigate(-1)} className="text-sm text-[#3d7ce0] font-medium">
          돌아가기
        </button>
      </div>
    );
  }

  // 무장애 정보: 백엔드 명세 미확정 상태 → 프론트 임시 목데이터 (API 확정 시 spot.accessibility로 교체)
  const accessibility = mockAccessibility;

  return (
    <div className="h-full overflow-y-auto bg-white pb-8">

      {/* 이미지 슬라이드 영역 */}
      <div className="relative">
        <div className="w-full h-[190px] bg-[#f5f5f7] flex items-center justify-center">
          <ImageIcon />
        </div>
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3.5 left-3.5 w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center"
          aria-label="뒤로가기"
        >
          <ArrowLeftIcon />
        </button>
        <button
          onClick={() => console.log("찜하기 TODO")}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center"
          aria-label="찜하기"
        >
          <HeartIcon />
        </button>
        <span className="absolute bottom-2.5 right-3.5 text-[11px] text-white bg-black/45 px-2 py-0.5 rounded-full">
          슬라이드 1 / {spot.imageUrls.length}
        </span>
      </div>

      <div className="px-5 pt-4">

        <p className="text-xs text-[#3d7ce0] mb-1">
          {spot._display.category} · {spot.address}
        </p>
        <p className="text-[19px] font-medium text-[#1c1c1e] mb-3.5">
          {spot._display.name}
        </p>

        <p className="text-[13px] leading-relaxed text-[#6e6e73] mb-5">
          {spot.content}
        </p>

        {/* 관광 정보 */}
        <p className="text-sm font-medium text-[#1c1c1e] mb-2">관광 정보</p>
        <div className="rounded-xl bg-[#f5f5f7] px-3.5 py-1 mb-6">
          <InfoRow label="전화번호" value={spot.phoneNumber || "정보 없음"} last />
        </div>

        {/* 무장애 관광정보 - 가로 스크롤 한 줄로 표시 (세로 공간 최소화) */}
        <p className="text-sm font-medium text-[#1c1c1e] mb-2.5">무장애 관광정보</p>
        <div className="flex gap-4 overflow-x-auto -mx-5 px-5 pb-1 mb-6 scrollbar-hide">
          {accessibility.map((item) => (
            <AccessIcon key={item.label} {...item} />
          ))}
        </div>

        {/* 지도 */}
        <div className="w-full h-[130px] rounded-xl bg-[#f5f5f7] flex items-center justify-center">
          <MapPinOffIcon />
        </div>

      </div>
    </div>
  );
}

function InfoRow({ label, value, last }) {
  return (
    <div className={`flex items-center justify-between text-xs py-2.5 ${!last ? "border-b border-[#e5e5ea]" : ""}`}>
      <span className="text-[#98989d]">{label}</span>
      <span className="text-[#1c1c1e]">{value}</span>
    </div>
  );
}

function AccessIcon({ label, available, icon: Icon }) {
  return (
    <div className="flex flex-col items-center shrink-0 w-[52px]">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
          available ? "bg-[#e6f4ea]" : "bg-[#f5f5f7]"
        }`}
      >
        <Icon color={available ? "#1f8b3f" : "#c7c7cc"} />
      </div>
      <p className="text-[9.5px] text-[#6e6e73] leading-tight text-center">{label}</p>
    </div>
  );
}

/* 무장애 정보: 백엔드 필드 확정 시 이 배열 제거하고 spot.accessibility 사용 */
const mockAccessibility = [
  { label: "휠체어 대여", available: true, icon: WheelchairIcon },
  { label: "점자블록", available: true, icon: BrailleIcon },
  { label: "자막 안내", available: false, icon: SubtitleIcon },
  { label: "오디오 가이드", available: true, icon: AudioIcon },
  { label: "엘리베이터", available: true, icon: ElevatorIcon },
  { label: "화장실", available: true, icon: ToiletIcon },
  { label: "주차", available: true, icon: ParkingIcon },
  { label: "유모차", available: false, icon: StrollerIcon },
];

/* --- 아이콘 (공통) --- */

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="#1c1c1e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 20s-7-4.35-9.5-8.8C.7 7.8 2.6 4 6.2 4c2 0 3.4 1.1 4 2.4C10.8 5.1 12.2 4 14.2 4c3.6 0 5.5 3.8 3.7 7.2C19 15.65 12 20 12 20z" stroke="#1c1c1e" strokeWidth="1.7" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" stroke="#c7c7cc" strokeWidth="1.5" />
      <circle cx="8.3" cy="9.3" r="1.4" stroke="#c7c7cc" strokeWidth="1.4" />
      <path d="M5 17l4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 16m-1.5-1.5l1.3-1.3a1.5 1.5 0 0 1 2.1 0L19.5 16" stroke="#c7c7cc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MapPinOffIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" stroke="#c7c7cc" strokeWidth="1.5" />
      <path d="M4 4l16 16" stroke="#c7c7cc" strokeWidth="1.5" />
    </svg>
  );
}

/* --- 무장애 정보 아이콘 (8종) --- */

function WheelchairIcon({ color }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <circle cx="14" cy="15" r="6" stroke={color} strokeWidth="1.8" />
      <circle cx="9" cy="5" r="1.7" fill={color} />
      <path d="M9 8v5h6M9 8H6.5M14 15l3-8" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrailleIcon({ color }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="7" r="1.4" fill={color} />
      <circle cx="16" cy="7" r="1.4" fill={color} />
      <circle cx="8" cy="12" r="1.4" fill={color} />
      <circle cx="16" cy="12" r="1.4" fill={color} />
      <circle cx="8" cy="17" r="1.4" fill={color} />
      <circle cx="16" cy="17" r="1.4" fill={color} />
    </svg>
  );
}

function SubtitleIcon({ color }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2.2" stroke={color} strokeWidth="1.7" />
      <path d="M6.5 14h3M12 14h5.5M6.5 10.5h6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AudioIcon({ color }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <path d="M4 10v4h3l4 3.5v-11L7 10H4z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M16 9.5a4 4 0 0 1 0 5.5M18.5 7a7.5 7.5 0 0 1 0 10.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

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

function ParkingIcon({ color }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke={color} strokeWidth="1.7" />
      <path d="M9 17V7h3.3a2.8 2.8 0 1 1 0 5.6H9" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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