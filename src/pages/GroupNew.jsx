import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { createGroup } from "../api/groups";

export default function GroupNew() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [name, setName] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [maxMembers, setMaxMembers] = useState(""); // 화면 입력용. 이번 API엔 없어서 서버로는 안 보냄
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isValid = name.trim() && startAt && endAt;

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    // 미리보기용 URL (컴포넌트 언마운트 시 별도 정리는 생략해도
    // 페이지 이동하면 브라우저가 알아서 정리함 - 짧은 폼 화면이라 문제 없음)
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid || submitting) return;

    // 종료일이 시작일보다 빠르면 막기 (프론트 자체 검증, 서버 규칙은 별도 확인 필요)
    if (endAt < startAt) {
      setError("종료일은 시작일보다 빠를 수 없어요");
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
      console.error("그룹 생성 실패:", err);
      setError("그룹 생성에 실패했어요. 잠시 후 다시 시도해주세요");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <AppHeader />

      <form onSubmit={handleSubmit} className="px-5 pt-6 pb-10">
        <p className="text-lg font-medium text-[#1c1c1e] mb-6">새 여행 그룹 만들기</p>

        {/* 썸네일 */}
        <div className="flex flex-col items-center mb-7">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-2xl bg-[#f5f5f7] border border-dashed border-[#c7c7cc] flex items-center justify-center overflow-hidden"
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
          <p className="text-xs text-[#98989d] mt-2">썸네일 (선택)</p>
        </div>

        {/* 그룹명 */}
        <div className="mb-5">
          <label className="text-sm text-[#1c1c1e] font-medium block mb-2">그룹명</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 제주도 여름 여행"
            maxLength={30}
            className="w-full h-12 px-4 rounded-xl bg-[#f5f5f7] text-[15px] text-[#1c1c1e] placeholder:text-[#98989d] outline-none focus:ring-2 focus:ring-[#6F4A2C]"
          />
        </div>

        {/* 시작일 / 종료일 */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1">
            <label className="text-sm text-[#1c1c1e] font-medium block mb-2">시작일</label>
            <input
              type="date"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full h-12 px-3 rounded-xl bg-[#f5f5f7] text-[15px] text-[#1c1c1e] outline-none focus:ring-2 focus:ring-[#6F4A2C]"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm text-[#1c1c1e] font-medium block mb-2">종료일</label>
            <input
              type="date"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full h-12 px-3 rounded-xl bg-[#f5f5f7] text-[15px] text-[#1c1c1e] outline-none focus:ring-2 focus:ring-[#6F4A2C]"
            />
          </div>
        </div>

        {/* 최대인원 */}
        <div className="mb-5">
          <label className="text-sm text-[#1c1c1e] font-medium block mb-2">
            최대 인원 <span className="text-[#98989d] font-normal">(선택)</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={maxMembers}
            onChange={(e) => setMaxMembers(e.target.value)}
            placeholder="예: 4"
            className="w-full h-12 px-4 rounded-xl bg-[#f5f5f7] text-[15px] text-[#1c1c1e] placeholder:text-[#98989d] outline-none focus:ring-2 focus:ring-[#6F4A2C]"
          />
          <p className="text-xs text-[#98989d] mt-1.5">
            초대코드는 그룹 생성 후 자동으로 만들어져요
          </p>
        </div>

        {error && (
          <p className="text-sm text-[#d70015] mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={!isValid || submitting}
          className="w-full h-12 rounded-xl bg-[#6F4A2C] text-white text-[15px] font-medium disabled:bg-[#c7c7cc] disabled:cursor-not-allowed mt-2 active:bg-[#5c3d24]"
        >
          {submitting ? "만드는 중..." : "그룹 만들기"}
        </button>
      </form>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h2l1-1.5h7l1 1.5h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z"
        stroke="#98989d"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.2" stroke="#98989d" strokeWidth="1.6" />
    </svg>
  );
}