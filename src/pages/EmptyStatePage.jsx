import { useNavigate } from "react-router-dom";

/**
 * 아직 API/데이터가 준비되지 않은 마이페이지 하위 메뉴(공지사항, 문의사항, 찜 목록 등)를 위한
 * 공용 빈 상태 페이지. title/description/icon만 바꿔 재사용한다.
 */
export default function EmptyStatePage({ title, description, icon: Icon = BellIcon }) {
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto bg-white px-6 py-8">
      <div className="w-full max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#1c1c1e]"
            aria-label="뒤로가기"
          >
            <ArrowLeftIcon />
          </button>
          <p className="text-base font-medium text-[#1c1c1e]">{title}</p>
        </div>

        <div className="flex flex-col items-center pt-16">
          <div className="w-16 h-16 rounded-full bg-[#f3ece4] flex items-center justify-center mb-4">
            <Icon />
          </div>
          <p className="text-sm font-medium text-[#1c1c1e] mb-1.5">
            {description.headline}
          </p>
          <p className="text-xs text-[#98989d] text-center leading-relaxed whitespace-pre-line">
            {description.body}
          </p>
        </div>
      </div>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 19l-7-7 7-7"
        stroke="#1c1c1e"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 10a6 6 0 1 1 12 0c0 3.4 1 5.2 1.6 6.1a1 1 0 0 1-.8 1.6H5.2a1 1 0 0 1-.8-1.6C5 15.2 6 13.4 6 10z"
        stroke="#6F4A2C"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 19.5a2.5 2.5 0 0 0 5 0"
        stroke="#6F4A2C"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChatIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5.5h16a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9l-4.5 3.5V16H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z"
        stroke="#6F4A2C"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M7.5 9.5h9M7.5 12.5h6" stroke="#6F4A2C" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function HeartOutlineIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 20s-7-4.5-9.2-9C1.4 8.2 2.6 5 5.7 5c1.9 0 3.1 1.2 3.8 2.3l.5.8.5-.8C11.2 6.2 12.4 5 14.3 5c3.1 0 4.3 3.2 2.9 6-2.2 4.5-9.2 9-9.2 9z"
        stroke="#6F4A2C"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
