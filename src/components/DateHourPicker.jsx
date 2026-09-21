import { useEffect, useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0 ~ 23

/**
 * 날짜 + 정시(시 단위) 선택기.
 *
 * props
 * - label:    입력칸 위 라벨 ("시작 일시" 등)
 * - value:    "YYYY-MM-DDTHH:00" 형식 문자열, 선택 전이면 ""
 * - onChange: 확인 버튼을 눌렀을 때 새 값("YYYY-MM-DDTHH:00")으로 호출됨
 * - min:      이 시각 이전은 선택 불가 ("YYYY-MM-DDTHH:00"), 없으면 제한 없음
 *
 * ⚠️ 시트는 position: absolute로 화면을 덮는다.
 *    그래서 이 컴포넌트를 쓰는 페이지의 최상위 div에 "relative"가 있어야
 *    휴대폰 프레임 안에 딱 맞게 뜬다. (GroupNew.jsx 참고)
 */
export default function DateHourPicker({ label, value, onChange, min, placeholder = "날짜와 시간을 선택하세요" }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <label className="text-sm text-[#2A2420] font-medium block mb-2">{label}</label>

      {/* input처럼 생긴 버튼. 누르면 시트가 열린다 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-12 px-4 rounded-2xl bg-[#FFFDF8] border border-[#E7DAC4] flex items-center justify-between text-left transition-colors hover:border-[#B99C74] gs-press"
      >
        <span className={`text-[15px] ${value ? "text-[#2A2420]" : "text-[#9A9082]"}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarIcon />
      </button>

      {/* open일 때만 시트를 렌더링한다 (닫히면 DOM에서 사라짐) */}
      {open && (
        <PickerSheet
          value={value}
          min={min}
          onCancel={() => setOpen(false)}
          onConfirm={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * 실제로 올라오는 바텀시트.
 *
 * 핵심 개념: "draft(임시) 상태"
 * 시트 안에서 고르는 값은 draftDate/draftHour에만 저장되고,
 * 확인을 눌러야 부모(onConfirm)에게 전달된다. 취소하면 그냥 버려짐.
 */
function PickerSheet({ value, min, onCancel, onConfirm }) {
  const minDate = min ? min.slice(0, 10) : null; // "YYYY-MM-DD"
  const minHour = min ? Number(min.slice(11, 13)) : 0;

  // ← 수정: 처음 열었을 때 기본으로 골라둘 값
  // 1) 이미 고른 값 → 2) min(시작=지금 시각, 종료=시작 시각) → 3) 지금 시각
  // 예전엔 값이 없으면 null로 시작해서, 날짜를 한 번 눌러야 시간이 활성화됐음
  const initial = value || min || toHourValue(new Date());

  const [draftDate, setDraftDate] = useState(initial.slice(0, 10)); // ← 수정
  const [draftHour, setDraftHour] = useState(Number(initial.slice(11, 13))); // ← 수정

  // 달력에 지금 보여주는 연/월 (월은 1~12) - 기본 선택값이 있는 달을 보여준다
  const base = parseDate(initial.slice(0, 10)); // ← 수정
  const [viewYear, setViewYear] = useState(base.y);
  const [viewMonth, setViewMonth] = useState(base.m);

  // 열림/닫힘 애니메이션용.
  // 처음엔 shown=false(시트가 화면 아래)로 그려지고, 바로 다음에 true가 되면서
  // CSS transition으로 쓱 올라온다.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 10);
    return () => clearTimeout(t);
  }, []);

  // 닫을 때도 내려가는 애니메이션(200ms)을 보여준 뒤에 실제로 닫는다
  function closeThen(callback) {
    setShown(false);
    setTimeout(callback, 200);
  }

  const today = toDateStr(new Date());

  // ----- 선택 가능 여부 -----
  function isDateDisabled(dateStr) {
    return minDate !== null && dateStr < minDate;
  }
  function isHourDisabled(h) {
    if (draftDate === null) return true; // 날짜부터 골라야 함
    return draftDate === minDate && h < minHour;
  }

  // ----- 선택 처리 -----
  function selectDate(dateStr) {
    setDraftDate(dateStr);
    // 날짜를 바꿨더니 이미 고른 시간이 막힌 시간이 되면 시간 선택 해제
    if (dateStr === minDate && draftHour !== null && draftHour < minHour) {
      setDraftHour(null);
    }
  }

  // ----- 월 이동 -----
  const viewKey = `${viewYear}-${pad(viewMonth)}`; // "YYYY-MM"
  const canGoPrev = minDate === null || viewKey > minDate.slice(0, 7);

  function goPrevMonth() {
    if (!canGoPrev) return;
    if (viewMonth === 1) {
      setViewYear(viewYear - 1);
      setViewMonth(12);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }
  function goNextMonth() {
    if (viewMonth === 12) {
      setViewYear(viewYear + 1);
      setViewMonth(1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  // ----- 달력 칸 만들기 -----
  // 1일이 무슨 요일인지만큼 앞에 빈칸(null)을 넣고, 그 뒤에 1일~말일
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0=일
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate(); // 다음 달 0일 = 이번 달 말일
  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const canConfirm = draftDate !== null && draftHour !== null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      {/* 뒷배경: 누르면 취소 */}
      <div
        onClick={() => closeThen(onCancel)}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
      />

      {/* 시트 본체 */}
      <div
        className={`relative bg-[#FDFAF4] rounded-t-3xl px-5 pt-3 pb-6 max-h-[92%] overflow-y-auto transition-transform duration-200 ease-out ${
          shown ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* 손잡이 모양 */}
        <div className="w-10 h-1 rounded-full bg-[#E7DAC4] mx-auto mb-4" />

        {/* 현재 고른 값 요약 */}
        <p className="text-[13px] text-[#8C8274] mb-1">선택한 일시</p>
        <p className="text-[18px] font-bold text-[#2A2420] mb-5 min-h-[27px]">
          {draftDate
            ? `${formatDateOnly(draftDate)}  ${draftHour !== null ? `${pad(draftHour)}:00` : "--:00"}`
            : "날짜를 골라주세요"}
        </p>

        {/* 월 이동 */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={goPrevMonth}
            disabled={!canGoPrev}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F6ECDD] disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="이전 달"
          >
            <ChevronIcon direction="left" />
          </button>
          <p className="text-[16px] font-semibold text-[#2A2420]">
            {viewYear}년 {viewMonth}월
          </p>
          <button
            type="button"
            onClick={goNextMonth}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F6ECDD]"
            aria-label="다음 달"
          >
            <ChevronIcon direction="right" />
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((w, i) => (
            <p
              key={w}
              className={`text-center text-xs font-medium py-1 ${i === 0 ? "text-[#C4553A]" : "text-[#8C8274]"}`}
            >
              {w}
            </p>
          ))}
        </div>

        {/* 날짜 칸 */}
        <div className="grid grid-cols-7 gap-y-1 mb-5">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`blank-${idx}`} />;

            const dateStr = `${viewYear}-${pad(viewMonth)}-${pad(day)}`;
            const disabled = isDateDisabled(dateStr);
            const selected = dateStr === draftDate;
            const isToday = dateStr === today;
            const isSunday = idx % 7 === 0;

            let cls = "text-[#2A2420] hover:bg-[#F6ECDD]";
            if (isSunday) cls = "text-[#C4553A] hover:bg-[#F6ECDD]";
            if (isToday) cls += " ring-1 ring-inset ring-[#D2C2A6] font-semibold";
            if (disabled) cls = "text-[#D8CFC0] cursor-not-allowed";
            if (selected) cls = "bg-[#8B4A26] text-white font-semibold";

            return (
              <button
                key={dateStr}
                type="button"
                disabled={disabled}
                onClick={() => selectDate(dateStr)}
                className={`h-10 mx-0.5 rounded-xl text-[15px] transition-colors ${cls}`}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className="h-px bg-[#EFE4D2] mb-4" />

        {/* 시간 (정시만) */}
        <p className="text-sm font-medium text-[#2A2420] mb-2">시간</p>
        <div className="grid grid-cols-6 gap-1.5 mb-6">
          {HOURS.map((h) => {
            const disabled = isHourDisabled(h);
            const selected = h === draftHour;

            let cls = "bg-[#FFFDF8] border border-[#E7DAC4] text-[#2A2420] hover:border-[#B99C74]";
            if (disabled) cls = "bg-transparent border border-transparent text-[#D8CFC0] cursor-not-allowed";
            if (selected) cls = "bg-[#8B4A26] border border-[#8B4A26] text-white font-semibold";

            return (
              <button
                key={h}
                type="button"
                disabled={disabled}
                onClick={() => setDraftHour(h)}
                className={`h-10 rounded-xl text-[13px] transition-colors ${cls}`}
              >
                {pad(h)}:00
              </button>
            );
          })}
        </div>

        {/* 취소 / 확인 */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => closeThen(onCancel)}
            className="flex-1 h-12 rounded-xl bg-[#F6ECDD] text-[#2A2420] text-[15px] font-medium gs-press"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              const v = `${draftDate}T${pad(draftHour)}:00`;
              closeThen(() => onConfirm(v));
            }}
            className="flex-[2] h-12 rounded-xl bg-[#8B4A26] text-white text-[15px] font-medium disabled:bg-[#C6B9A4] disabled:cursor-not-allowed active:bg-[#6B3618] gs-press"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- 유틸 -----

function pad(n) {
  return String(n).padStart(2, "0");
}

/** Date → "YYYY-MM-DD" (로컬 시간 기준) */
function toDateStr(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Date → 정시로 내린 "YYYY-MM-DDTHH:00" (로컬 시간 기준) ← 수정: 새로 추가 */
function toHourValue(date) {
  return `${toDateStr(date)}T${pad(date.getHours())}:00`;
}

/** "YYYY-MM-DD" → { y, m, d } (숫자) */
function parseDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

/** "YYYY-MM-DD" → "9월 21일 (월)" */
function formatDateOnly(dateStr) {
  const { y, m, d } = parseDate(dateStr);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${wd})`;
}

/** "YYYY-MM-DDTHH:00" → "2026. 9. 21 (월) 14:00" */
function formatDisplay(value) {
  const { y, m, d } = parseDate(value.slice(0, 10));
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${y}. ${m}. ${d} (${wd}) ${value.slice(11, 16)}`;
}

// ----- 아이콘 -----

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="#8C8274" strokeWidth="1.6" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="#8C8274" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ direction }) {
  const d = direction === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d={d} stroke="#2A2420" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}