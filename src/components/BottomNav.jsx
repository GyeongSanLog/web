import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { fetchOngoingGroup } from "../api";

const navItems = [
  { to: "/home", label: "홈", icon: HomeIcon },
  { to: "/map", label: "지도", icon: PinIcon },
  { to: "/gallery", label: "갤러리", icon: GalleryIcon },
  { to: "/mypage", label: "마이페이지", icon: UserIcon },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [showNoGroupModal, setShowNoGroupModal] = useState(false);

  async function handlePlusClick() {
    if (checking) return; // 중복 클릭 방지
    setChecking(true);
    try {
      const ongoing = await fetchOngoingGroup();
      if (ongoing) {
        // 진행중인 그룹이 있으면 바로 촬영 화면으로
        navigate(`/camera/${ongoing.id}`);
      } else {
        // 없으면 새 그룹 생성 여부를 묻는 모달 표시
        setShowNoGroupModal(true);
      }
    } catch (err) {
      console.error("진행중인 그룹 조회 실패:", err);
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <nav
        className="absolute bottom-0 left-0 right-0 mx-3 mb-3 rounded-[28px] bg-white shadow-lg shadow-black/10 border border-[#e5e5ea] px-2 py-2.5 flex items-center justify-around"
        aria-label="하단 내비게이션"
      >
        {navItems.slice(0, 2).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <button
          onClick={handlePlusClick}
          disabled={checking}
          className="w-11 h-11 rounded-full bg-[#6F4A2C] flex items-center justify-center -mt-2 shrink-0 disabled:opacity-60"
          aria-label="촬영하기"
        >
          {checking ? <SpinnerIcon /> : <PlusIcon />}
        </button>

        {navItems.slice(2).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* 진행중인 여행이 없을 때: 새 그룹 생성 확인 모달 */}
      {showNoGroupModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-8">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowNoGroupModal(false)}
          />
          <div className="relative bg-white rounded-2xl px-6 py-6 w-full max-w-[280px] text-center shadow-xl">
            <div className="w-11 h-11 rounded-full bg-[#eef4ff] flex items-center justify-center mx-auto mb-3">
              <MapPlusIcon />
            </div>
            <p className="text-sm font-medium text-[#1c1c1e] mb-1.5">
              진행 중인 여행이 없어요
            </p>
            <p className="text-xs text-[#6e6e73] leading-relaxed mb-5">
              새로운 여행 그룹을 만들까요?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNoGroupModal(false)}
                className="flex-1 h-10 rounded-xl bg-[#f5f5f7] text-[#1c1c1e] text-sm"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowNoGroupModal(false);
                  navigate("/gallery/new");
                  // TODO: /gallery/new (그룹 생성 화면) 아직 미구현.
                  // 만들어지면 이 경로로 정상 연결됨.
                }}
                className="flex-1 h-10 rounded-xl bg-[#6F4A2C] text-white text-sm font-medium"
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavItem({ to, label, icon: Icon }) {
  return (
    <NavLink to={to} className="flex flex-col items-center gap-0.5 min-w-[44px]">
      {({ isActive }) => (
        <>
          <Icon active={isActive} />
          <span
            className={`text-[10px] whitespace-nowrap ${
              isActive ? "text-[#6F4A2C] font-medium" : "text-[#98989d]"
            }`}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

/* --- 아이콘 --- */

function HomeIcon({ active }) {
  const c = active ? "#6F4A2C" : "#98989d";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon({ active }) {
  const c = active ? "#6F4A2C" : "#98989d";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" stroke={c} strokeWidth="1.8" />
      <circle cx="12" cy="9" r="2.3" stroke={c} strokeWidth="1.8" />
    </svg>
  );
}

function GalleryIcon({ active }) {
  const c = active ? "#6F4A2C" : "#98989d";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        rx="2.2"
        stroke={c}
        strokeWidth="1.8"
      />
      <circle cx="8.3" cy="9.3" r="1.5" stroke={c} strokeWidth="1.6" />
      <path d="M5 17l4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 16m-1.5-1.5l1.3-1.3a1.5 1.5 0 0 1 2.1 0L19.5 16" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon({ active }) {
  const c = active ? "#6F4A2C" : "#98989d";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.3" stroke={c} strokeWidth="1.8" />
      <path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.3" strokeLinecap="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.2" strokeOpacity="0.3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function MapPlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M9 5L4 7v13l5-2 6 2 5-2V5l-5 2-6-2z" stroke="#3d7ce0" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 5v13" stroke="#3d7ce0" strokeWidth="1.7" />
      <path d="M18 3v6M15 6h6" stroke="#3d7ce0" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
