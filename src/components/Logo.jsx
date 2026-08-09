export default function Logo({ size = 56, color = "#6F4A2C" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="경산로그 로고"
    >
      {/* 바깥 링 */}
      <circle cx="24" cy="24" r="20" fill={color} />
      {/* 렌즈 유리 */}
      <circle cx="24" cy="24" r="16" fill="#ffffff" />
      <circle
        cx="24"
        cy="24"
        r="16"
        fill="none"
        stroke={color}
        strokeWidth="1.1"
        strokeOpacity="0.35"
      />
      <circle
        cx="24"
        cy="24"
        r="12.4"
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeOpacity="0.18"
      />
      {/* 유리 반사광 */}
      <path
        d="M13 17.5A15.8 15.8 0 0 1 30 10.6"
        stroke="#D8C3A0"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />

      {/* 갓 */}
      <ellipse cx="24" cy="18.4" rx="6.6" ry="1.7" fill={color} />
      {/* 머리 */}
      <circle cx="24" cy="21.6" r="2.1" fill={color} />
      {/* 몸통 */}
      <path
        d="M24 22.3c-4 0-6.6 2.7-6.9 6.7-.1 1.5 .1 2.8 .1 2.8h13.6s.2-1.3 .1-2.8c-.3-4-2.9-6.7-6.9-6.7z"
        fill={color}
      />
    </svg>
  );
}
