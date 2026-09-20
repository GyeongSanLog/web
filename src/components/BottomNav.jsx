import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { fetchOngoingGroups } from "../api/groups";

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
      const ongoing = await fetchOngoingGroups();
      if (ongoing.length === 1) {
        // 진행중인 그룹이 정확히 하나면 그 그룹으로 바로 촬영 화면 진입
        // (Camera.jsx가 groupId를 경로 파라미터로 받는 구조)
        navigate(`/camera/${ongoing[0].id}`);
      } else if (ongoing.length > 1) {
        // 동시에 여러 그룹이 진행 중이면 여기서 임의로 하나를 고르지 않고,
        // 갤러리에서 어느 그룹에 남길지 직접 선택하게 한다.
        navigate("/gallery");
      } else {
        // 없으면 새 그룹 생성 여부를 묻는 모달 표시
        setShowNoGroupModal(true);
      }
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") {
        navigate("/login");
        return;
      }
      console.error("진행중인 그룹 조회 실패:", err);
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <nav
        className="absolute bottom-0 left-0 right-0 mx-3 mb-3 rounded-[28px] bg-[#FFFCF6]/95 backdrop-blur shadow-lg shadow-[#5C4433]/15 border border-[#EBE0CE] px-2 py-2.5 flex items-center justify-around"
        aria-label="하단 내비게이션"
      >
        {navItems.slice(0, 2).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {/* 촬영 버튼 - 한가운데 떠 있는 황토색 셔터 */}
        <button
          onClick={handlePlusClick}
          disabled={checking}
          className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#A45B2C] to-[#7A3D1C] flex items-center justify-center -mt-3 shrink-0 shadow-md shadow-[#8B4A26]/40 gs-press disabled:opacity-60"
          aria-label="촬영하기"
        >
          {/* 셔터 링 */}
          <span className="absolute inset-[3px] rounded-full border border-white/25" />
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
            className="absolute inset-0 bg-[#2A1A0C]/45 gs-fade-in"
            onClick={() => setShowNoGroupModal(false)}
          />
          <div className="relative bg-[#FFFCF6] rounded-2xl px-6 py-6 w-full max-w-[280px] text-center shadow-xl shadow-black/25 border border-[#EBE0CE] gs-scale-in">
            <div className="w-12 h-12 rounded-full bg-[#F6ECDD] flex items-center justify-center mx-auto mb-3 gs-float">
              <MapPlusIcon />
            </div>
            <p className="text-sm font-medium text-[#2A2420] mb-1.5">
              진행 중인 여행이 없어요
            </p>
            <p className="text-xs text-[#6B6156] leading-relaxed mb-5">
              새로운 여행 그룹을 만들까요?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNoGroupModal(false)}
                className="flex-1 h-10 rounded-xl bg-[#F4EFE6] text-[#2A2420] text-sm gs-press"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowNoGroupModal(false);
                  navigate("/gallery/new");
                }}
                className="flex-1 h-10 rounded-xl bg-[#8B4A26] text-white text-sm font-medium gs-press hover:bg-[#6B3618]"
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
    <NavLink
      to={to}
      className="flex flex-col items-center gap-0.5 min-w-[46px] gs-press"
    >
      {({ isActive }) => (
        <>
          {/* 활성 탭만 아이콘 뒤에 옅은 황토 타원이 깔리고, 아이콘이 한 번 통 튄다 */}
          <span
            className={`w-9 h-6 rounded-full flex items-center justify-center transition-colors duration-200 ${
              isActive ? "bg-[#F6ECDD]" : "bg-transparent"
            }`}
          >
            <span className={isActive ? "gs-tab-pop" : undefined}>
              <Icon active={isActive} />
            </span>
          </span>
          <span
            className={`text-[10px] whitespace-nowrap transition-colors duration-200 ${
              isActive ? "text-[#8B4A26] font-medium" : "text-[#9A9082]"
            }`}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

/* --- 아이콘 ---
   활성 상태에서는 황토색 선 + 옅은 솔빛 채움으로 바뀌어, 색이 한 번 더 들어간다 */

function HomeIcon({ active }) {
  const c = active ? "#8B4A26" : "#9A9082";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      {active && (
        <path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" fill="#E8B769" fillOpacity="0.3" />
      )}
      <path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon({ active }) {
  const c = active ? "#8B4A26" : "#9A9082";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      {active && (
        <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" fill="#9DB894" fillOpacity="0.35" />
      )}
      <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" stroke={c} strokeWidth="1.8" />
      <circle cx="12" cy="9" r="2.3" stroke={c} strokeWidth="1.8" />
    </svg>
  );
}

function GalleryIcon({ active }) {
  const c = active ? "#8B4A26" : "#9A9082";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      {active && <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" fill="#9DB894" fillOpacity="0.3" />}
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" stroke={c} strokeWidth="1.8" />
      <circle cx="8.3" cy="9.3" r="1.5" stroke={active ? "#E8B769" : c} strokeWidth="1.6" />
      <path d="M5 17l4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 16m-1.5-1.5l1.3-1.3a1.5 1.5 0 0 1 2.1 0L19.5 16" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon({ active }) {
  const c = active ? "#8B4A26" : "#9A9082";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      {active && <circle cx="12" cy="8" r="3.3" fill="#E8B769" fillOpacity="0.35" />}
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
      <path d="M9 5L4 7v13l5-2 6 2 5-2V5l-5 2-6-2z" fill="#9DB894" fillOpacity="0.3" stroke="#8B4A26" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 5v13" stroke="#8B4A26" strokeWidth="1.7" />
      <path d="M18 3v6M15 6h6" stroke="#E8B769" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
