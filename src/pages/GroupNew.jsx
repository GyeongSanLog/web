import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createGroup } from "../api/groups";

export default function GroupNew() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [name, setName] = useState("");
  const [startAt, setStartAt] = useState(""); // "YYYY-MM-DDTHH:mm" (datetime-local 값)
  const [endAt, setEndAt] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isValid = name.trim() && startAt && endAt;

  // 지금 시각을 정시로 내림한 값. datetime-local의 min으로 써서 과거를 막는다.
  // 과거로 만들면 생성 직후 "종료된 여행"이 돼서 촬영을 한 번도 못 하기 때문.
  const nowHour = toDateTimeInputValue(roundDownToHour(new Date()));

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    // 미리보기용 URL (컴포넌트 언마운트 시 별도 정리는 생략해도
    // 페이지 이동하면 브라우저가 알아서 정리함 - 짧은 폼 화면이라 문제 없음)
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  // datetime-local input은 기본으로 분 단위 선택까지 나오는데, 이 서비스는
  // 시간대(slot) 단위가 "시" 하나뿐이라 분은 의미가 없다. 사용자가 스크롤 등으로
  // 분을 바꿔 넣어도 여기서 정시로 강제로 내림해 저장한다.
  function handleStartChange(value) {
    const rounded = roundDateTimeInputToHour(value);
    setStartAt(rounded);
    // 시작일시를 종료일시보다 뒤로 옮기면 종료일시도 같이 당겨준다
    if (endAt && rounded > endAt) setEndAt(rounded);
  }

  function handleEndChange(value) {
    setEndAt(roundDateTimeInputToHour(value));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid || submitting) return;

    // 종료일시가 시작일시보다 빠르면 막기 (프론트 자체 검증, 서버 규칙은 별도 확인 필요)
    if (endAt < startAt) {
      setError("종료 시각은 시작 시각보다 빠를 수 없어요");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const group = await createGroup({ name: name.trim(), startAt, endAt, imageFile });
      // replace: true로 이동 — 그룹 생성 화면을 히스토리에서 대체함.
      // 그래야 그룹 상세에서 뒤로가기를 눌렀을 때 그룹생성 화면(이미 끝난 단계)이
      // 아니라 갤러리로 돌아감.
      navigate(`/gallery/${group.id}`, { replace: true });
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") {
        navigate("/login");
        return;
      }
      // 서버가 준 메시지가 있으면 그대로 보여준다 (예전엔 고정 문구로 덮어써서
      // 무엇이 문제였는지 알 수 없었음)
      setError(err.message || "그룹 생성에 실패했어요. 잠시 후 다시 시도해주세요");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#FDFAF4]">
      {/* 이 화면은 AppHeader(로고 헤더)가 아니라 폼 전용 헤더를 쓴다.
          예전엔 헤더에 뒤로가기가 아예 없어서 갤러리로 돌아갈 방법이
          모달 뒤로가기(브라우저 back)뿐이었음. */}
      <div className="flex items-center gap-2.5 px-5 pt-6 mb-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-[#F6ECDD] border border-[#EBDCC4] flex items-center justify-center shrink-0 gs-press"
          aria-label="뒤로가기"
        >
          <ArrowLeftIcon />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-5 pt-2 pb-10">
        <p className="font-brand text-[22px] font-bold text-[#2A2420] mb-6 gs-rise">
          새 여행 그룹 만들기
        </p>

        {/* 썸네일 */}
        <div className="flex flex-col items-center mb-7">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-2xl bg-[#F8F3E9] border border-dashed border-[#D2C2A6] flex items-center justify-center overflow-hidden gs-press hover:bg-[#F4EDDF] hover:border-[#B99C74]"
          >
            {imagePreviewUrl ? (
              <img src={imagePreviewUrl} alt="그룹 썸네일 미리보기" className="w-full h-full object-cover" />
            ) : (
              <CameraIcon />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          <p className="text-xs text-[#8C8274] mt-2">썸네일 (선택)</p>
        </div>

        {/* 그룹명 */}
        <div className="mb-5">
          <label className="text-sm text-[#2A2420] font-medium block mb-2">그룹명</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 제주도 여름 여행"
            maxLength={30}
            className="w-full h-12 px-4 rounded-2xl bg-[#FFFDF8] border border-[#E7DAC4] text-[15px] text-[#2A2420] placeholder:text-[#9A9082] outline-none transition-colors focus:border-[#8B4A26]"
          />
        </div>

        {/* 시작 일시 / 종료 일시 - 시간대(slot) 단위가 "시"라서 분은 받지 않고
            항상 정시로 맞춘다 (예: 14:00, 14:30 선택 X) */}
        <div className="flex flex-col gap-4 mb-2">
          <div>
            <label className="text-sm text-[#2A2420] font-medium block mb-2">시작 일시</label>
            <input
              type="datetime-local"
              step={3600}
              value={startAt}
              min={nowHour}
              onChange={(e) => handleStartChange(e.target.value)}
              className="w-full h-12 px-3 rounded-2xl bg-[#FFFDF8] border border-[#E7DAC4] text-[15px] text-[#2A2420] outline-none transition-colors focus:border-[#8B4A26]"
            />
          </div>
          <div>
            <label className="text-sm text-[#2A2420] font-medium block mb-2">종료 일시</label>
            <input
              type="datetime-local"
              step={3600}
              value={endAt}
              min={startAt || nowHour}
              onChange={(e) => handleEndChange(e.target.value)}
              className="w-full h-12 px-3 rounded-2xl bg-[#FFFDF8] border border-[#E7DAC4] text-[15px] text-[#2A2420] outline-none transition-colors focus:border-[#8B4A26]"
            />
          </div>
        </div>
        <p className="text-xs text-[#8C8274] mb-6">
          시간 단위로 기록돼요. 초대코드는 그룹 생성 후 자동으로 만들어져요. (최대 10명까지 참여 가능)
        </p>

        {error && (
          <p className="text-sm text-[#d70015] mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={!isValid || submitting}
          className="w-full h-12 rounded-xl bg-[#8B4A26] text-white text-[15px] font-medium disabled:bg-[#C6B9A4] disabled:cursor-not-allowed mt-2 active:bg-[#6B3618] gs-press"
        >
          {submitting ? "만드는 중..." : "그룹 만들기"}
        </button>
      </form>
    </div>
  );
}

/** 분·초를 0으로 내린 Date */
function roundDownToHour(date) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

/** Date → "YYYY-MM-DDTHH:mm" (datetime-local input의 value/min 형식, 로컬 시간 기준) */
function toDateTimeInputValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:00`
  );
}

/**
 * datetime-local의 값("YYYY-MM-DDTHH:mm")에서 분을 00으로 강제한다.
 * 브라우저 스피너로 분을 바꿔도(예: 14:30) 정시(14:00)로 맞춰짐.
 */
function roundDateTimeInputToHour(value) {
  if (!value) return value;
  return `${value.slice(0, 11)}00`; // "YYYY-MM-DDTHH:" + "00"
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="#2A2420" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h2l1-1.5h7l1 1.5h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z"
        stroke="#8C8274"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.2" stroke="#8C8274" strokeWidth="1.6" />
    </svg>
  );
}
