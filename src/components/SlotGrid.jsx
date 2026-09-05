import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// ============================================================
// SlotGrid - 한 시간대(slot)에 멤버들이 찍은 클립을 그리드로 보여주는 컴포넌트
//
// 그리드 칸 수 = 그룹 멤버 수. 각 멤버가 그 시간대에 찍었으면 클립을,
// 안 찍었으면 프로필/닉네임만 보여줌(클릭 비활성화).
//
// slotIndex 가정: 그룹 시작일 자정(00:00)을 0으로 놓고 몇 시간째인지
// 나타내는 절대 인덱스 (예: 시작일 다음날 17시 = 24 + 17 = 41).
// 실제 서버 계산 기준이 다르면 dateToSlotIndex / slotIndexToDate 두
// 함수만 고치면 나머지 로직(이동, 경계 계산)은 그대로 재사용 가능.
// ============================================================

/** 그룹 시작일 자정 기준으로 slotIndex → Date 변환 */
function slotIndexToDate(startAt, slotIndex) {
  const start = new Date(startAt);
  start.setHours(0, 0, 0, 0);
  return new Date(start.getTime() + slotIndex * 60 * 60 * 1000);
}

/** 특정 Date가 그룹 시작일 기준 몇 번째 slotIndex인지 계산 */
function dateToSlotIndex(startAt, date) {
  const start = new Date(startAt);
  start.setHours(0, 0, 0, 0);
  return Math.floor((date - start) / (1000 * 60 * 60));
}

/** 현재 시각 기준 slotIndex (그리드 초기값으로 사용) */
function currentSlotIndex(startAt) {
  return dateToSlotIndex(startAt, new Date());
}

function formatSlotDateLabel(startAt, slotIndex) {
  const d = slotIndexToDate(startAt, slotIndex);
  return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:00`;
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
  const [slotIndex, setSlotIndex] = useState(() => currentSlotIndex(startAt));
  const [showCalendar, setShowCalendar] = useState(false);

  const maxSlotIndex = currentSlotIndex(startAt); // 미래로는 못 감
  const minSlotIndex = 0; // 그룹 시작일 이전으로는 못 감

  const canGoPrev = slotIndex > minSlotIndex;
  const canGoNext = slotIndex < maxSlotIndex;
  const isViewingCurrentSlot = slotIndex === maxSlotIndex; // 지금 이 순간의 시간대를 보고 있는지

  // 이 시간대(slot)에 찍힌 클립들을 userId 기준으로 매핑
  const clipsByUser = useMemo(() => {
    const map = new Map();
    clips
      .filter((c) => c.slotIndex === slotIndex)
      .forEach((c) => map.set(c.userId, c));
    return map;
  }, [clips, slotIndex]);

  function goPrev() {
    if (canGoPrev) setSlotIndex((v) => v - 1);
  }

  function goNext() {
    if (canGoNext) setSlotIndex((v) => v + 1);
  }

  function handlePickDate(date) {
    // 선택한 날짜의 00:00으로 이동
    const picked = new Date(date);
    picked.setHours(0, 0, 0, 0);
    const newSlot = dateToSlotIndex(startAt, picked);
    // 범위를 벗어나면(이론상 캘린더에서 막혀있어야 하지만 방어적으로) 경계로 보정
    setSlotIndex(Math.max(minSlotIndex, Math.min(maxSlotIndex, newSlot)));
    setShowCalendar(false);
  }

  return (
    <div>
      <MemberGrid
        members={members}
        clipsByUser={clipsByUser}
        onOpenClip={onOpenClip}
        myId={myId}
        canRecordNow={isViewingCurrentSlot}
        onRecord={() => navigate(`/camera/${groupId}`)}
      />

      {/* 시간대 이동 컨트롤 */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={goPrev}
          disabled={!canGoPrev}
          className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center disabled:opacity-30"
          aria-label="이전 시간대"
        >
          <ChevronLeftIcon />
        </button>

        <button
          onClick={() => setShowCalendar(true)}
          className="text-[13px] text-[#1c1c1e] font-medium min-w-[110px] text-center"
        >
          {formatSlotDateLabel(startAt, slotIndex)}
        </button>

        <button
          onClick={goNext}
          disabled={!canGoNext}
          className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center disabled:opacity-30"
          aria-label="다음 시간대"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* 날짜 선택 캘린더 모달 */}
      {showCalendar && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center px-8 z-30"
          onClick={() => setShowCalendar(false)}
        >
          <div
            className="w-full max-w-[300px] bg-white rounded-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <MiniCalendar
              startAt={startAt}
              endAt={endAt}
              selectedDate={slotIndexToDate(startAt, slotIndex)}
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
 * 오늘 이후 미래 날짜도 (여행기간 안이더라도) 아직 안 지났으면 비활성화.
 */
function MiniCalendar({ startAt, endAt, selectedDate, onPick }) {
  const rangeStart = new Date(startAt);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(endAt);
  rangeEnd.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
    // 그룹 기간 밖이면 비활성화
    if (date < rangeStart || date > rangeEnd) return false;
    // 아직 지나지 않은 미래 날짜면 비활성화 (오늘까지만 로그가 있을 수 있음)
    if (date > today) return false;
    return true;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
          }
          className="w-7 h-7 rounded-full bg-[#f5f5f7] flex items-center justify-center"
          aria-label="이전 달"
        >
          <ChevronLeftIcon size={12} />
        </button>
        <p className="text-sm font-medium text-[#1c1c1e]">
          {viewMonth.getFullYear()}.{String(viewMonth.getMonth() + 1).padStart(2, "0")}
        </p>
        <button
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
          }
          className="w-7 h-7 rounded-full bg-[#f5f5f7] flex items-center justify-center"
          aria-label="다음 달"
        >
          <ChevronRightIcon size={12} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="text-center text-[10px] text-[#98989d] py-1">
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
                  ? "bg-[#6F4A2C] text-white font-medium"
                  : selectable
                  ? "text-[#1c1c1e]"
                  : "text-[#c7c7cc] opacity-40"
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
 * - 4명 이하: 1열, 각 칸이 가로로 꽉 차는 16:9 비율 직사각형, 세로로 쌓임
 * - 4명 초과: 2열. 정사각형을 강제하지 않고, 좌우 살짝 여백만 두고
 *   가로폭을 최대한 채우는 비율(2:1)로 표시
 * - 4명 초과 & 홀수: 마지막 한 명은 그 아랫줄에 폭 절반 크기로 혼자,
 *   가운데 정렬
 */
function MemberGrid({ members, clipsByUser, onOpenClip, myId, canRecordNow, onRecord }) {
  const total = members.length;

  if (total <= 4) {
    return (
      <div className="flex flex-col gap-1.5">
        {members.map((member) => (
          <MemberCell
            key={member.userId}
            member={member}
            clip={clipsByUser.get(member.userId)}
            onOpenClip={onOpenClip}
            aspectClass="aspect-video" // 16:9, 가로로 긴 형태
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
 * - 단, "내 칸"이고 현재 시간대를 보고 있는데 아직 안 찍었다면,
 *   프로필/닉네임을 살짝 위로 올리고 그 아래에 촬영하러 가는 + 버튼을 보여줌
 *   (과거 시간대는 지금 찍어도 소급되지 않으므로 + 버튼을 보여주지 않음)
 */
function MemberCell({ member, clip, onOpenClip, aspectClass, isMe, canRecordNow, onRecord }) {
  if (!clip) {
    const showRecordButton = isMe && canRecordNow;

    return (
      <div
        className={`${aspectClass} rounded-lg bg-[#f5f5f7] flex flex-col items-center justify-center gap-1`}
      >
        <div className={`flex flex-col items-center gap-1.5 ${showRecordButton ? "-translate-y-1.5" : ""}`}>
          <div className="w-9 h-9 rounded-full bg-[#e5e5ea] flex items-center justify-center overflow-hidden shrink-0">
            {member.profileImageUrl ? (
              <img
                src={member.profileImageUrl}
                alt={member.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-[#98989d] font-medium">
                {member.nickname?.[0] ?? "?"}
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#c7c7cc]">{member.nickname}</span>
        </div>

        {showRecordButton && (
          <button
            onClick={onRecord}
            aria-label="지금 셋로그 촬영하기"
            className="w-6 h-6 rounded-full bg-[#6F4A2C] flex items-center justify-center mt-0.5"
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
      className={`${aspectClass} w-full rounded-lg relative overflow-hidden bg-[#1c1c1e]`}
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
        <div className="w-4 h-4 rounded-full bg-[#e5e5ea] flex items-center justify-center overflow-hidden shrink-0">
          {member.profileImageUrl ? (
            <img
              src={member.profileImageUrl}
              alt={member.nickname}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[7px] text-[#6e6e73] font-medium">
              {member.nickname?.[0] ?? "?"}
            </span>
          )}
        </div>
        <span className="text-[9px] text-white">{member.nickname}</span>
      </div>
    </button>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronLeftIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="#1c1c1e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 5l7 7-7 7" stroke="#1c1c1e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}