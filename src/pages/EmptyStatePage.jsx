import { useNavigate } from "react-router-dom";

/**
 * 아직 API/데이터가 준비되지 않은 마이페이지 하위 메뉴(공지사항, 문의사항, 찜 목록 등)를 위한
 * 공용 빈 상태 페이지. title/description/icon만 바꿔 재사용한다.
 */
export default function EmptyStatePage({
  title,
  description,
  icon: Icon = BellIcon,
  backTo = null, // 지정하면 뒤로가기 대신 그 경로로 이동 (404처럼 돌아갈 곳이 없을 때)
}) {
  const navigate = useNavigate();
  const goBack = () => (backTo ? navigate(backTo, { replace: true }) : navigate(-1));

  return (
    <div className="relative h-full overflow-y-auto bg-[#FDFAF4] px-6 py-8">
      <div className="w-full max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-full bg-[#F6ECDD] border border-[#EBDCC4] flex items-center justify-center text-[#2A2420] gs-press"
            aria-label="뒤로가기"
          >
            <ArrowLeftIcon />
          </button>
          <p className="font-brand text-[19px] font-bold text-[#2A2420]">{title}</p>
        </div>

        <div className="flex flex-col items-center pt-16 gs-rise">
          <div className="relative w-20 h-20 flex items-center justify-center mb-4">
            {/* 배지 뒤로 옅은 해가 천천히 숨쉰다 */}
            <span className="absolute inset-0 rounded-full bg-[#E8B769]/20 gs-float" />
            <span className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#FAEDD9] to-[#F0DFC2] border border-[#EBDCC4] flex items-center justify-center">
              <Icon />
            </span>
          </div>
          <p className="text-sm font-medium text-[#2A2420] mb-1.5">
            {description.headline}
          </p>
          <p className="text-xs text-[#8C8274] text-center leading-relaxed whitespace-pre-line">
            {description.body}
          </p>
        </div>
      </div>

      {/* 화면 아래를 능선으로 닫아, 빈 화면도 "경산 어딘가"처럼 보이게 한다 */}
      <svg
        className="pointer-events-none absolute bottom-0 left-0 w-full h-24"
        viewBox="0 0 390 96"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 96V58l58-30 44 24 62-38 52 34 66-28 108 36v40z" fill="#9DB894" fillOpacity="0.28" />
        <path d="M0 96V76l62-22 48 18 60-26 56 24 62-18 102 26v18z" fill="#4B6B4E" fillOpacity="0.22" />
      </svg>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 19l-7-7 7-7"
        stroke="#2A2420"
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
        stroke="#8B4A26"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 19.5a2.5 2.5 0 0 0 5 0"
        stroke="#8B4A26"
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
        stroke="#8B4A26"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M7.5 9.5h9M7.5 12.5h6" stroke="#8B4A26" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function HeartOutlineIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 20s-7-4.5-9.2-9C1.4 8.2 2.6 5 5.7 5c1.9 0 3.1 1.2 3.8 2.3l.5.8.5-.8C11.2 6.2 12.4 5 14.3 5c3.1 0 4.3 3.2 2.9 6-2.2 4.5-9.2 9-9.2 9z"
        stroke="#8B4A26"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
