/**
 * 섹션 제목 - 화면마다 회색 소제목만 반복되던 걸 대신한다.
 * 왼쪽에 계절색 잎사귀 표식을 두고, 제목 아래로 같은 색 밑줄이 좌→우로 그어진다.
 *
 * tone 은 그 섹션의 성격에 맞는 색을 준다 (축제=진달래, 자연=솔빛, 기록=황토 …).
 */
export default function SectionTitle({ children, tone = "#8B4A26", action = null, className = "" }) {
  return (
    <div className={`flex items-end justify-between mb-3 ${className}`}>
      <div>
        <div className="flex items-center gap-1.5">
          <LeafMark color={tone} />
          <p className="font-brand text-[17px] font-bold text-[#2A2420]">{children}</p>
        </div>
        <span
          className="block h-[2.5px] w-[26px] rounded-full mt-1.5 gs-draw"
          style={{ backgroundColor: tone, opacity: 0.5 }}
        />
      </div>
      {action}
    </div>
  );
}

/** 작은 잎사귀 표식 - 섹션 제목 외에 빈 상태/뱃지에도 쓴다 */
export function LeafMark({ color = "#4B6B4E", size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13.5 2.5C8 2 3 4.5 3 9a4.5 4.5 0 0 0 7.6 3.3c2.4-2.3 3-6.6 2.9-9.8z"
        fill={color}
        fillOpacity="0.25"
      />
      <path
        d="M13.5 2.5C8 2 3 4.5 3 9a4.5 4.5 0 0 0 7.6 3.3c2.4-2.3 3-6.6 2.9-9.8zM2.5 13.5C5 11 8 8.5 11 7"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
