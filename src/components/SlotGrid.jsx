import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TRIP_BEFORE,
  TRIP_ONGOING,
  TRIP_ENDED,
  getTripStatus,
  slotIndexToDate,
  dateToSlotIndex,
  latestAvailableSlotIndex,
  formatSlotLabel,
  formatShortDate,
} from "../utils/trip";

// ============================================================
// SlotGrid - 한 시간대(slot)에 멤버들이 찍은 클립을 그리드로 보여주는 컴포넌트
//
// 그리드 칸 수 = 그룹 멤버 수. 각 멤버가 그 시간대에 찍었으면 클립을,
// 안 찍었으면 프로필/닉네임만 보여줌(클릭 비활성화).
//
// slot 계산과 여행 상태 판단은 utils/trip.js로 옮김 (GroupDetail.jsx와
// 같은 기준을 써야 편지 공개/촬영 가능 조건이 어긋나지 않음).
//
// 시간 관련 주의사항:
// - 조회 상한(maxSlotIndex)은 "오늘"이 아니라 여행 상태에 따라 달라짐.
//   시작 전=0 / 진행중=지금 시각 / 종료됨=endAt 당일 23시.
// - 정각이 지나면 useHourlyTick으로 화면이 스스로 갱신됨. 예전엔 렌더
//   시점에만 시각을 계산해서, 14:50에 열어두고 15:05가 돼도 14시 슬롯에
//   머물러 있었고 그 상태로 촬영하면 "찍었는데 안 보이는" 상황이 생겼음.
// ============================================================

/**
 * 정각마다 리렌더를 유발해서 현재 시각을 최신으로 유지하는 훅.
 * setInterval(1분)로 계속 도는 대신, 다음 정각까지만 setTimeout을 걸고
 * 깨어나면 다시 다음 정각을 예약하는 방식 (불필요한 렌더를 줄임).
 */
function useHourlyTick() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timerId;

    const scheduleNextTick = () => {
      const nextHour = new Date();
      // 다음 정각 + 5초 (시계 오차로 아직 이전 시각으로 읽히는 걸 방지)
      nextHour.setHours(nextHour.getHours() + 1, 0, 5, 0);

      timerId = setTimeout(() => {
        setNow(new Date());
        scheduleNextTick();
      }, nextHour.getTime() - Date.now());
    };

    scheduleNextTick();
    return () => clearTimeout(timerId);
  }, []);

  return now;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function SlotGrid({ startAt, endAt, members, clips, myId, groupId, onOpenClip }) {
  const navigate = useNavigate();
  const now = useHourlyTick();

  const tripStatus = getTripStatus(startAt, endAt, now);
  const maxSlotIndex = latestAvailableSlotIndex(startAt, endAt, now);
  const minSlotIndex = 0; // 그룹 시작일 이전으로는 못 감

  const [slotIndex, setSlotIndex] = useState(maxSlotIndex);
  const [showCalendar, setShowCalendar] = useState(false);

  // 정각이 넘어가 상한이 올라갔을 때, 사용자가 "최신 시간대"를 보고 있었다면
  // 같이 따라 올라가게 함. 과거 시간대를 들여다보던 중이면 건드리지 않음.
  const prevMaxRef = useRef(maxSlotIndex);
  useEffect(() => {
    if (maxSlotIndex === prevMaxRef.current) return;
    const previousMax = prevMaxRef.current;
    prevMaxRef.current = maxSlotIndex;
    setSlotIndex((current) => (current === previousMax ? maxSlotIndex : current));
  }, [maxSlotIndex]);

  // 방어적 보정: 어떤 이유로든 slotIndex가 범위를 벗어나면 경계로 되돌림
  const safeSlotIndex = Math.max(minSlotIndex, Math.min(maxSlotIndex, slotIndex));

  const canGoPrev = safeSlotIndex > minSlotIndex;
  const canGoNext = safeSlotIndex < maxSlotIndex;
  const isViewingLatestSlot = safeSlotIndex === maxSlotIndex;

  // 촬영 버튼은 "여행이 진행 중이고" + "지금 이 시간대를 보고 있을 때"만.
  // 시작 전이거나 이미 끝난 여행이면 지금 찍어도 소급되지 않으므로 숨김.
  const canRecordNow = tripStatus === TRIP_ONGOING && isViewingLatestSlot;

  // 이 시간대(slot)에 찍힌 클립들을 userId 기준으로 매핑
  const clipsByUser = useMemo(() => {
    const map = new Map();
    clips
      .filter((c) => c.slotIndex === safeSlotIndex)
      .forEach((c) => map.set(c.userId, c));
    return map;
  }, [clips, safeSlotIndex]);

  function goPrev() {
    if (canGoPrev) setSlotIndex(safeSlotIndex - 1);
  }

  function goNext() {
    if (canGoNext) setSlotIndex(safeSlotIndex + 1);
  }

  function handlePickDate(date) {
    // 선택한 날짜의 00:00으로 이동
    const picked = new Date(date);
    picked.setHours(0, 0, 0, 0);
    const newSlot = dateToSlotIndex(startAt, picked);
    setSlotIndex(Math.max(minSlotIndex, Math.min(maxSlotIndex, newSlot)));
    setShowCalendar(false);
  }

  // 아직 시작하지 않은 여행은 볼 로그도, 찍을 것도 없음.
  // (예전엔 dateToSlotIndex가 음수를 뱉어서 시작일보다 이전 날짜가
  //  라벨에 뜨고 + 버튼까지 나타났음)
  if (tripStatus === TRIP_BEFORE) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-12 bg-[#F8F3E9] border border-[#EFE4D2] rounded-2xl">
        <span className="w-11 h-11 rounded-full bg-[#F6ECDD] flex items-center justify-center gs-float">
          <CalendarIcon />
        </span>
        <p className="text-xs text-[#6B6156] mt-1">아직 여행이 시작되지 않았어요</p>
        <p className="text-[11px] text-[#8C8274]">
          {formatShortDate(startAt)}부터 셋로그를 남길 수 있어요
        </p>
      </div>
    );
  }

  return (
    <div>
      {tripStatus === TRIP_ENDED && (
        <p className="text-[11px] text-[#8C8274] text-center mb-2">
          종료된 여행이에요 · 기록만 볼 수 있어요
        </p>
      )}

      <MemberGrid
        members={members}
        clipsByUser={clipsByUser}
        onOpenClip={onOpenClip}
        myId={myId}
        canRecordNow={canRecordNow}
        onRecord={() => navigate(`/camera/${groupId}`)}
      />

      {/* 시간대 이동 컨트롤 */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={goPrev}
          disabled={!canGoPrev}
          className="w-9 h-9 rounded-full bg-[#F6ECDD] border border-[#EBDCC4] flex items-center justify-center gs-press disabled:opacity-30"
          aria-label="이전 시간대"
        >
          <ChevronLeftIcon />
        </button>

        <button
          onClick={() => setShowCalendar(true)}
          className="font-brand text-[15px] text-[#2A2420] font-bold min-w-[110px] text-center rounded-full px-3 py-1 gs-press hover:bg-[#F6ECDD]"
        >
          {formatSlotLabel(startAt, safeSlotIndex)}
        </button>

        <button
          onClick={goNext}
          disabled={!canGoNext}
          className="w-9 h-9 rounded-full bg-[#F6ECDD] border border-[#EBDCC4] flex items-center justify-center gs-press disabled:opacity-30"
          aria-label="다음 시간대"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* 날짜 선택 캘린더 모달
          absolute를 쓰는 이유: GroupDetail의 최상위 래퍼(h-full relative)가
          위치 기준이 되고, 중간의 스크롤 컨테이너는 position이 없어서
          이 모달을 잘라내지 않음 → 스크롤 위치와 무관하게 화면에 딱 맞게 뜸.
          fixed로 두면 데스크톱에서 430px 폰 프레임을 뚫고 브라우저 전체를
          덮어버려서 "휴대폰 화면" 컨셉이 깨짐. */}
      {showCalendar && (
        <div
          className="absolute inset-0 bg-[#2A1A0C]/45 flex items-center justify-center px-8 z-30 gs-fade-in"
          onClick={() => setShowCalendar(false)}
        >
          <div
            className="w-full max-w-[300px] bg-[#FFFCF6] border border-[#EBE0CE] rounded-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <MiniCalendar
              startAt={startAt}
              endAt={endAt}
              now={now}
              selectedDate={slotIndexToDate(startAt, safeSlotIndex)}
              onPick={handlePickDate}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 그룹 여행기간(startAt~endAt) 밖의 날짜는 비활성화된 미니 달력.
 * 여행이 진행 중이면 오늘 이후(미래) 날짜도 비활성화.
 * 여행이 끝났으면 endAt까지 전부 선택 가능.
 */
function MiniCalendar({ startAt, endAt, now, selectedDate, onPick }) {
  const rangeStart = new Date(startAt);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(endAt);
  rangeEnd.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // 실제 선택 가능한 마지막 날 = 종료일과 오늘 중 이른 쪽
  const lastSelectable = rangeEnd < today ? rangeEnd : today;

  const [viewMonth, setViewMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const firstDayOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const startWeekday = firstDayOfMonth.getDay();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
  }

  function isSelectable(date) {
    if (!date) return false;
    return date >= rangeStart && date <= lastSelectable;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
          }
          className="w-7 h-7 rounded-full bg-[#F6ECDD] flex items-center justify-center gs-press"
          aria-label="이전 달"
        >
          <ChevronLeftIcon size={12} />
        </button>
        <p className="text-sm font-medium text-[#2A2420]">
          {viewMonth.getFullYear()}.{String(viewMonth.getMonth() + 1).padStart(2, "0")}
        </p>
        <button
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
          }
          className="w-7 h-7 rounded-full bg-[#F6ECDD] flex items-center justify-center gs-press"
          aria-label="다음 달"
        >
          <ChevronRightIcon size={12} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="text-center text-[10px] text-[#8C8274] py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const selectable = isSelectable(date);
          const selected = isSameDay(date, selectedDate);

          return (
            <button
              key={date.toISOString()}
              onClick={() => selectable && onPick(date)}
              disabled={!selectable}
              className={`aspect-square rounded-lg text-xs flex items-center justify-center ${
                selected
                  ? "bg-[#8B4A26] text-white font-medium"
                  : selectable
                  ? "text-[#2A2420]"
                  : "text-[#C6B9A4] opacity-40"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 멤버 그리드 레이아웃 규칙:
 * - 4명 이하: 1열, 각 칸이 가로로 꽉 차는 직사각형, 세로로 쌓임
 * - 4명 초과: 2열. 정사각형을 강제하지 않고, 좌우 살짝 여백만 두고
 *   가로폭을 최대한 채우는 비율(2:1)로 표시
 * - 4명 초과 & 홀수: 마지막 한 명은 그 아랫줄에 폭 절반 크기로 혼자,
 *   가운데 정렬
 */
function MemberGrid({ members, clipsByUser, onOpenClip, myId, canRecordNow, onRecord }) {
  const total = members.length;

  if (total === 0) return null;

  if (total <= 4) {
    // 비율(aspect-*) 대신 뷰포트 높이 기준으로 칸 높이를 계산해서,
    // 인원수와 무관하게 4칸이 스크롤 없이 한 화면에 들어오도록 함.
    // 46vh를 그리드 전체가 쓸 수 있는 대략적인 영역으로 보고
    // (헤더, 초대코드 배너, 하단 컨트롤·네비바를 뺀 나머지 감안),
    // 인원수로 나눠 칸 하나의 높이를 정함. 최소 72px는 보장해서
    // 인원이 많아도 너무 납작해지지 않게 함.
    //
    // Tailwind는 동적으로 조합된 클래스 문자열(h-[...vh])을 빌드 시
    // 인식하지 못하므로, 여기서는 style로 직접 높이를 지정함.
    const cellHeight = `max(72px, ${(46 / total).toFixed(1)}vh)`;

    return (
      <div className="flex flex-col gap-1.5">
        {members.map((member) => (
          <MemberCell
            key={member.userId}
            member={member}
            clip={clipsByUser.get(member.userId)}
            onOpenClip={onOpenClip}
            style={{ height: cellHeight }}
            isMe={member.userId === myId}
            canRecordNow={canRecordNow}
            onRecord={onRecord}
          />
        ))}
      </div>
    );
  }

  const isOdd = total % 2 === 1;
  const pairedMembers = isOdd ? members.slice(0, -1) : members;
  const lastMember = isOdd ? members[members.length - 1] : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        {pairedMembers.map((member) => (
          <MemberCell
            key={member.userId}
            member={member}
            clip={clipsByUser.get(member.userId)}
            onOpenClip={onOpenClip}
            aspectClass="aspect-[2/1]" // 2열일 때 가로를 최대한 채우는 비율
            isMe={member.userId === myId}
            canRecordNow={canRecordNow}
            onRecord={onRecord}
          />
        ))}
      </div>

      {/* 홀수 인원의 마지막 한 명 - 위쪽 2열 그리드의 칸과 동일한 폭
          (전체폭 - gap) / 2 을 calc로 직접 지정해서 가운데 배치 */}
      {lastMember && (
        <div className="flex justify-center">
          <div className="w-[calc((100%-0.375rem)/2)]">
            <MemberCell
              member={lastMember}
              clip={clipsByUser.get(lastMember.userId)}
              onOpenClip={onOpenClip}
              aspectClass="aspect-[2/1]"
              isMe={lastMember.userId === myId}
              canRecordNow={canRecordNow}
              onRecord={onRecord}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 그리드 한 칸
 * - 클립 있으면 자동재생 영상, 없으면 프로필/닉네임만(클릭 불가)
 * - 단, "내 칸"이고 촬영 가능한 상태(진행 중 여행 + 현재 시간대)라면
 *   프로필/닉네임을 살짝 위로 올리고 그 아래에 촬영하러 가는 + 버튼을 보여줌
 */
function MemberCell({ member, clip, onOpenClip, aspectClass, style, isMe, canRecordNow, onRecord }) {
  if (!clip) {
    const showRecordButton = isMe && canRecordNow;

    return (
      <div
        className={`${aspectClass ?? ""} rounded-lg flex flex-col items-center justify-center gap-1 transition-colors ${
          showRecordButton
            ? "bg-[#FBF0DA] border border-[#E8B769]"
            : "bg-[#F6F1E6] border border-dashed border-[#DFD2BC]"
        }`}
        style={style}
      >
        <div className={`flex flex-col items-center gap-1.5 ${showRecordButton ? "-translate-y-1.5" : ""}`}>
          <div className="w-9 h-9 rounded-full bg-[#EFE4D0] flex items-center justify-center overflow-hidden shrink-0">
            {member.profileImageUrl ? (
              <img
                src={member.profileImageUrl}
                alt={member.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-[#8B4A26] font-medium">
                {member.nickname?.[0] ?? "?"}
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#A2977F]">{member.nickname}</span>
        </div>

        {showRecordButton && (
          <button
            onClick={onRecord}
            aria-label="지금 셋로그 촬영하기"
            className="w-7 h-7 rounded-full bg-gradient-to-br from-[#A45B2C] to-[#7A3D1C] flex items-center justify-center mt-0.5 shadow-sm shadow-[#8B4A26]/35 gs-press gs-float"
          >
            <PlusIcon />
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onOpenClip(clip)}
      className={`${aspectClass ?? ""} w-full rounded-lg relative overflow-hidden bg-[#2A2420] ring-1 ring-[#8B4A26]/25 gs-press`}
      style={style}
    >
      {clip.videoUrl && (
        <video
          src={clip.videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/45 rounded-full pr-2 pl-0.5 py-0.5">
        <div className="w-4 h-4 rounded-full bg-[#E6DDCD] flex items-center justify-center overflow-hidden shrink-0">
          {member.profileImageUrl ? (
            <img
              src={member.profileImageUrl}
              alt={member.nickname}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[7px] text-[#6B6156] font-medium">
              {member.nickname?.[0] ?? "?"}
            </span>
          )}
        </div>
        <span className="text-[9px] text-white">{member.nickname}</span>
      </div>
    </button>
  );
}

/* --- 아이콘 --- */

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" stroke="#8C8274" strokeWidth="1.7" />
      <path d="M3.5 10h17" stroke="#8C8274" strokeWidth="1.7" />
      <path d="M8 3.5v4M16 3.5v4" stroke="#8C8274" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ChevronLeftIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="#2A2420" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 5l7 7-7 7" stroke="#2A2420" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}