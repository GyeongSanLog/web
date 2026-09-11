import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import AppHeader from "../components/AppHeader";
import { fetchMyInfo } from "../api/member";
import { logout } from "../api/auth";
import { LeafMark } from "../components/SectionTitle";

export default function MyPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyInfo()
      .then(setUser)
      .catch((err) => {
        if (err.message === "AUTH_EXPIRED") {
          navigate("/login");
          return;
        }
        setError(err.message || "회원 정보를 불러오지 못했습니다");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="h-full flex flex-col bg-[#FDFAF4]">
      <AppHeader />
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-28">
        {/* 상단 타이틀 */}
        <div className="flex items-center gap-2 mb-5 gs-rise">
          <LeafMark color="#8B4A26" size={18} />
          <h1 className="font-brand text-[24px] font-bold text-[#2A2420]">마이페이지</h1>
        </div>

        {/* 프로필 카드 */}
        {loading ? (
          <div className="w-full rounded-2xl px-4 py-4 mb-4 h-[90px] gs-skeleton" />
        ) : error ? (
          <div className="w-full rounded-2xl bg-[#F8F3E9] border border-[#EFE4D2] px-4 py-4 mb-4">
            <p className="text-sm text-[#8C8274]">{error}</p>
          </div>
        ) : (
          <button
            onClick={() => navigate("/profile", { state: { user } })}
            className="relative w-full flex items-center gap-4 rounded-2xl bg-gradient-to-br from-[#FBF1DF] to-[#F2E7D3] border border-[#EBDCC4] px-4 py-4 mb-4 text-left overflow-hidden gs-press gs-rise shadow-sm shadow-[#8B4A26]/5"
          >
            {/* 카드 오른쪽 아래로 옅은 능선 */}
            <svg className="absolute right-0 bottom-0 w-40 h-12" viewBox="0 0 160 48" fill="none" aria-hidden="true">
              <path d="M0 48l30-22 24 14 30-24 28 20 48-16v28z" fill="#9DB894" fillOpacity="0.35" />
            </svg>
            <ProfileAvatar user={user} size={56} />
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-[#2A2420] truncate">
                {user.nickname}
              </p>
              <p className="text-sm text-[#8C8274] mt-0.5 truncate">
                {user.name}
              </p>
            </div>
            <ChevronIcon />
          </button>
        )}

        {/* 찜 목록 */}
        <button
          onClick={() => navigate("/favorites")}
          className="w-full flex items-center gap-3 rounded-2xl bg-[#FFFCF6] border border-[#EBE0CE] px-4 py-3.5 mb-7 text-left gs-press gs-rise hover:bg-[#FDF7EB]"
        >
          <span className="w-9 h-9 rounded-full bg-[#FAE7E5] flex items-center justify-center shrink-0">
            <HeartIcon />
          </span>
          <span className="flex-1 text-sm font-medium text-[#2A2420]">
            찜 목록
          </span>
          <ChevronIcon />
        </button>

        {/* 고객지원 */}
        <SectionLabel tone="#3D6E7C">고객지원</SectionLabel>
        <div className="rounded-2xl bg-[#FFFCF6] border border-[#EBE0CE] mb-7 overflow-hidden">
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
        <SectionLabel tone="#3F6B45">설정</SectionLabel>
        <div className="rounded-2xl bg-[#FFFCF6] border border-[#EBE0CE] overflow-hidden">
          <MenuRow
            label="비밀번호 재설정"
            onClick={() => navigate("/password-reset")}
          />
          <Divider />
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-4 text-left gs-press"
          >
            <span className="text-sm font-medium text-[#d70015]">로그아웃</span>
          </button>
        </div>

        {/* 실수로 누르기 쉬우면 안 되니까 다른 메뉴들과 묶지 않고 아래에 조용히 둠 */}
        <button
          onClick={() => navigate("/account/delete")}
          className="w-full text-center text-xs text-[#8C8274] underline mt-6 gs-press"
        >
          회원 탈퇴
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

/* --- 하위 컴포넌트 --- */

export function ProfileAvatar({ user, size = 56 }) {
  const initial = (user?.nickname || user?.name || "?").charAt(0);

  if (user?.profileImageUrl) {
    return (
      <img
        src={user.profileImageUrl}
        alt="프로필 사진"
        className="rounded-full object-cover border-2 border-[#8B4A26] shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-gradient-to-br from-[#F9E9CF] to-[#EFD9B4] border-2 border-[#8B4A26] flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <span
        className="font-bold text-[#8B4A26]"
        style={{ fontSize: size * 0.32 }}
      >
        {initial}
      </span>
    </div>
  );
}

function SectionLabel({ children, tone = "#8B4A26" }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 px-1">
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tone }} />
      <p className="text-xs text-[#6B6156] font-medium">{children}</p>
    </div>
  );
}

function MenuRow({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center px-4 py-4 text-left gs-press hover:bg-[#FBF5EA]"
    >
      <span className="flex-1 text-sm font-medium text-[#2A2420]">{label}</span>
      <ChevronIcon />
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-[#EFE7D9] mx-4" />;
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
        stroke="#B9AC97"
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
        fill="#B04A46"
        stroke="#B04A46"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
