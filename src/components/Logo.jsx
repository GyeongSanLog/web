import { useId } from "react";

/**
 * 경산로그 로고 - 카메라 렌즈 배지 안에 "갓바위 위로 해가 뜨는 팔공산" 풍경.
 *
 * 레이어 순서가 곧 원근이다:
 *   렌즈테 → 유리(하늘) → 해 → 뒷능선(연한 솔빛) → 앞능선(짙은 솔빛) → 갓바위
 * 모든 풍경은 유리 원 안으로 clip 되어 렌즈를 들여다보는 느낌을 준다.
 *
 * @param {number}  size      픽셀 크기 (헤더 24, 로그인 56 등)
 * @param {string}  color     렌즈테 색 (기본 황토)
 * @param {boolean} animated  해가 아주 느리게 돌지 여부 (로그인 화면처럼 큰 곳에서만 true)
 */
export default function Logo({ size = 56, color = "#8B4A26", animated = false }) {
  // 한 페이지에 로고가 여러 개 있어도 그라데이션/클립 id가 겹치지 않도록
  const uid = useId().replace(/:/g, "");
  const skyId = `gs-sky-${uid}`;
  const clipId = `gs-lens-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="경산로그 로고"
    >
      <defs>
        <linearGradient id={skyId} x1="24" y1="8" x2="24" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FDF4E4" />
          <stop offset="1" stopColor="#F1E3CD" />
        </linearGradient>
        <clipPath id={clipId}>
          <circle cx="24" cy="24" r="16" />
        </clipPath>
      </defs>

      {/* 렌즈테 */}
      <circle cx="24" cy="24" r="20" fill={color} />
      {/* 렌즈 유리 = 하늘 */}
      <circle cx="24" cy="24" r="16" fill={`url(#${skyId})`} />

      <g clipPath={`url(#${clipId})`}>
        {/* 해 - 갓 위로 반쯤 떠오른 상태 */}
        <circle cx="24" cy="13.2" r="7.4" fill="#F3D9A4" opacity="0.55" />
        <circle cx="24" cy="13.2" r="4.3" fill="#E8B769" />
        <g className={animated ? "gs-sun" : undefined} style={{ transformOrigin: "24px 13.2px" }}>
          <path
            d="M24 6.4v-2M24 22v-2M31 13.2h2M15 13.2h2M28.9 8.3l1.4-1.4M17.7 19.5l1.4-1.4M28.9 18.1l1.4 1.4M17.7 6.9l1.4 1.4"
            stroke="#E8B769"
            strokeWidth="1.3"
            strokeLinecap="round"
            opacity="0.85"
          />
        </g>

        {/* 뒷 능선 - 연한 솔빛 */}
        <path
          d="M8 40V30.5l5.5-5.5 4 4L24 21.5l6.5 7.5 4-4 5.5 5.5V40z"
          fill="#9DB894"
        />
        {/* 앞 능선 - 짙은 솔빛 */}
        <path
          d="M8 40v-5.5l5.5-5 5.5 3.5L24 28l5.5 5.5 5-3.5 5.5 4.5V40z"
          fill="#4B6B4E"
        />

        {/* 갓바위 - 능선 위에 실루엣으로 앉아 있다 */}
        <ellipse cx="24" cy="19.6" rx="6.4" ry="1.6" fill="#5C4433" />
        <circle cx="24" cy="22.5" r="2" fill="#5C4433" />
        <path
          d="M24 23.1c-3.9 0-6.4 2.7-6.7 6.6-.1 1.5.1 2.7.1 2.7h13.2s.2-1.2.1-2.7c-.3-3.9-2.8-6.6-6.7-6.6z"
          fill="#5C4433"
        />
      </g>

      {/* 렌즈 테두리 + 조리개 링 */}
      <circle cx="24" cy="24" r="16" fill="none" stroke={color} strokeWidth="1.2" strokeOpacity="0.4" />
      <circle cx="24" cy="24" r="12.4" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.22" />
      {/* 유리 반사광 */}
      <path
        d="M10.6 29.4A15.8 15.8 0 0 1 14.8 13.4"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
    </svg>
  );
}
