import { useNavigate } from "react-router-dom";
import Logo from "./Logo";

/**
 * 메인 탭 화면(홈/지도/갤러리/마이페이지) 위에 항상 붙는 브랜드 헤더.
 * 아래쪽 경계는 평범한 1px 선 대신 팔공산 능선 실루엣으로 처리해서
 * 화면을 넘길 때마다 자연 모티브가 반복되게 했다.
 */
export default function AppHeader({ right = null }) {
  const navigate = useNavigate();

  return (
    <header className="relative shrink-0 pt-8 pb-3.5 px-5 bg-gradient-to-b from-[#FBF2E3] to-[#FEFBF6]">
      <div className="h-10 flex items-center justify-between">
        <button
          onClick={() => navigate("/home")}
          className="flex items-center gap-2 gs-press"
          aria-label="경산로그 홈으로"
        >
          <Logo size={26} />
          <span className="font-brand text-[17px] font-bold tracking-tight text-[#8B4A26]">
            경산로그
          </span>
        </button>
        {right}
      </div>

      <RidgeDivider />
    </header>
  );
}

/**
 * 헤더 하단 능선. 선(stroke)으로 그리면 "초록 꺾은선 그래프"처럼 보여서
 * 두 겹의 채워진 실루엣으로 그린다 (뒤: 연한 솔빛 / 앞: 짙은 솔빛).
 */
function RidgeDivider() {
  return (
    <svg
      className="absolute bottom-0 left-0 w-full h-[11px]"
      viewBox="0 0 390 14"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 14V7l34-6 30 5 38-6 34 7 42-8 36 7 40-5 32 6 36-4 68 5v6z"
        fill="#9DB894"
        opacity="0.5"
      />
      <path
        d="M0 14v-4l30 3 34-5 28 5 44-6 30 6 38-4 34 5 40-3 36 4 76-2v1z"
        fill="#4B6B4E"
      />
    </svg>
  );
}
