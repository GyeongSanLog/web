import { NavLink, useNavigate } from "react-router-dom";

const navItems = [
  { to: "/home", label: "홈", icon: HomeIcon },
  { to: "/map", label: "지도", icon: PinIcon },
  { to: "/gallery", label: "갤러리", icon: GalleryIcon },
  { to: "/mypage", label: "마이페이지", icon: UserIcon },
];

export default function BottomNav() {
  const navigate = useNavigate();

  return (
    <nav
      className="absolute bottom-0 left-0 right-0 mx-3 mb-3 rounded-[28px] bg-white shadow-lg shadow-black/10 border border-[#e5e5ea] px-2 py-2.5 flex items-center justify-around"
      aria-label="하단 내비게이션"
    >
      {navItems.slice(0, 2).map((item) => (
        <NavItem key={item.to} {...item} />
      ))}

      <button
        onClick={() => navigate("/camera")}
        className="w-11 h-11 rounded-full bg-[#3d7ce0] flex items-center justify-center -mt-2 shrink-0"
        aria-label="촬영하기"
      >
        <PlusIcon />
      </button>

      {navItems.slice(2).map((item) => (
        <NavItem key={item.to} {...item} />
      ))}
    </nav>
  );
}

function NavItem({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className="flex flex-col items-center gap-0.5 min-w-[44px]"
    >
      {({ isActive }) => (
        <>
          <Icon active={isActive} />
          <span
            className={`text-[10px] whitespace-nowrap ${
              isActive ? "text-[#3d7ce0] font-medium" : "text-[#98989d]"
            }`}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

/* --- 아이콘: 외부 라이브러리 없이 순수 SVG로 --- */

function HomeIcon({ active }) {
  const c = active ? "#3d7ce0" : "#98989d";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"
        stroke={c}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon({ active }) {
  const c = active ? "#3d7ce0" : "#98989d";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"
        stroke={c}
        strokeWidth="1.8"
      />
      <circle cx="12" cy="9" r="2.3" stroke={c} strokeWidth="1.8" />
    </svg>
  );
}

function GalleryIcon({ active }) {
  const c = active ? "#3d7ce0" : "#98989d";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" stroke={c} strokeWidth="1.8" />
      <circle cx="8.3" cy="9.3" r="1.5" stroke={c} strokeWidth="1.6" />
      <path
        d="M5 17l4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 16m-1.5-1.5l1.3-1.3a1.5 1.5 0 0 1 2.1 0L19.5 16"
        stroke={c}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon({ active }) {
  const c = active ? "#3d7ce0" : "#98989d";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.3" stroke={c} strokeWidth="1.8" />
      <path
        d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5"
        stroke={c}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke="white"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  );
}