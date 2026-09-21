import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createGroup } from "../api/groups";
import DateHourPicker from "../components/DateHourPicker";

export default function GroupNew() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [name, setName] = useState("");
  // "YYYY-MM-DDTHH:00" 형식. DateHourPicker가 항상 정시 값만 넘겨준다.
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isValid = name.trim() && startAt && endAt;

  // 지금 시각을 정시로 내림한 값. 이보다 이전은 선택 불가.
  // 과거로 만들면 생성 직후 "종료된 여행"이 돼서 촬영을 한 번도 못 하기 때문.
  const nowHour = toHourValue(new Date());

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    // 미리보기용 URL (짧은 폼 화면이라 별도 정리 생략)
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function handleStartChange(value) {
    setStartAt(value);
    // 시작을 종료보다 뒤로 옮기면 종료는 다시 고르게 비운다
    // ("YYYY-MM-DDTHH:00"은 자릿수가 고정이라 문자열 비교 = 시간 비교)
    if (endAt && endAt < value) setEndAt("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid || submitting) return;

    if (endAt < startAt) {
      setError("종료 시각은 시작 시각보다 빠를 수 없어요");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const group = await createGroup({ name: name.trim(), startAt, endAt, imageFile });
      // replace: true → 그룹 상세에서 뒤로가기 시 생성 화면이 아니라 갤러리로 감
      navigate(`/gallery/${group.id}`, { replace: true });
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") {
        navigate("/login");
        return;
      }
      setError(err.message || "그룹 생성에 실패했어요. 잠시 후 다시 시도해주세요");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    // 바깥 div: relative → DateHourPicker의 바텀시트가 이 영역을 기준으로 뜬다
    // 안쪽 div: 실제 스크롤 담당
    <div className="relative h-full bg-[#FDFAF4]">
      <div className="h-full overflow-y-auto">
        {/* 폼 전용 헤더 (뒤로가기) */}
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

          {/* 시작 / 종료 일시 - 직접 만든 선택기 (정시만 선택 가능) */}
          <div className="flex flex-col gap-4 mb-2">
            <DateHourPicker
              label="시작 일시"
              value={startAt}
              min={nowHour}
              onChange={handleStartChange}
            />
            <DateHourPicker
              label="종료 일시"
              value={endAt}
              min={startAt || nowHour}
              onChange={setEndAt}
            />
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
    </div>
  );
}

/** Date → 정시로 내린 "YYYY-MM-DDTHH:00" (로컬 시간 기준) */
function toHourValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:00`
  );
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