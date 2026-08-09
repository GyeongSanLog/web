import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import AppHeader from "../components/AppHeader";

// 더미데이터
const user = {
  name: "신유진",
  nickname: "여행중독자",
  initial: "신",
  favoriteCount: 12,
};

export default function MyPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // TODO: 로그아웃 API 연동
    navigate("/login");
  };

  return (
    <div className="h-full flex flex-col">
      <AppHeader />
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-28">
        {/* 상단 타이틀 */}
        <h1 className="text-2xl font-bold text-[#1c1c1e] mb-5">마이페이지</h1>

        {/* 프로필 카드 */}
        <button
          onClick={() => navigate("/profile")}
          className="w-full flex items-center gap-4 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] px-4 py-4 mb-4 text-left"
        >
          <div className="w-14 h-14 rounded-full bg-[#f3ece4] border-2 border-[#6F4A2C] flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-[#6F4A2C]">
              {user.initial}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-[#1c1c1e] truncate">
              {user.nickname}
            </p>
            <p className="text-sm text-[#98989d] mt-0.5 truncate">
              {user.name}
            </p>
          </div>
          <ChevronIcon />
        </button>

        {/* 찜 목록 */}
        <button
          onClick={() => navigate("/favorites")}
          className="w-full flex items-center gap-3 rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] px-4 py-4 mb-7 text-left"
        >
          <HeartIcon />
          <span className="flex-1 text-sm font-medium text-[#1c1c1e]">
            찜 목록
          </span>
          <span className="text-sm text-[#98989d]">{user.favoriteCount}곳</span>
          <ChevronIcon />
        </button>

        {/* 고객지원 */}
        <SectionLabel>고객지원</SectionLabel>
        <div className="rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] mb-7 overflow-hidden">
          <MenuRow
            label="문의사항"
            onClick={() => navigate("/support/contact")}
          />
          <Divider />
          <MenuRow
            label="공지사항"
            onClick={() => navigate("/support/notice")}
          />
        </div>

        {/* 설정 */}
        <SectionLabel>설정</SectionLabel>
        <div className="rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] overflow-hidden">
          <MenuRow
            label="비밀번호 재설정"
            onClick={() => navigate("/password-reset")}
          />
          <Divider />
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-4 text-left"
          >
            <span className="text-sm font-medium text-[#d70015]">로그아웃</span>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

/* --- 하위 컴포넌트 --- */

function SectionLabel({ children }) {
  return (
    <p className="text-xs text-[#98989d] font-medium mb-2 px-1">{children}</p>
  );
}

function MenuRow({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center px-4 py-4 text-left"
    >
      <span className="flex-1 text-sm font-medium text-[#1c1c1e]">{label}</span>
      <ChevronIcon />
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-[#e5e5ea] mx-4" />;
}

/* --- 아이콘 --- */

function ChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="#c7c7cc"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M12 20s-7-4.5-9.2-9C1.4 8.2 2.6 5 5.7 5c1.9 0 3.1 1.2 3.8 2.3l.5.8.5-.8C11.2 6.2 12.4 5 14.3 5c3.1 0 4.3 3.2 2.9 6-2.2 4.5-9.2 9-9.2 9z"
        fill="#6F4A2C"
        stroke="#6F4A2C"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
