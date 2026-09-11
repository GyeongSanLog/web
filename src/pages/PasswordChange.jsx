import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changeMyPassword } from "../api/member";

const inputClass =
  "w-full h-11 rounded-[10px] bg-[#F4EFE6] border border-[#E6DDCD] px-3.5 text-[13px] text-[#2A2420] placeholder-[#8C8274] outline-none focus:border-[#8B4A26] transition-colors";

export default function PasswordChange() {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pwTooShort = newPassword.length > 0 && newPassword.length < 8;
  const pwMismatch =
    newPasswordConfirm.length > 0 && newPassword !== newPasswordConfirm;

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === newPasswordConfirm;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      await changeMyPassword({ currentPassword, newPassword });
      setDone(true);
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") {
        navigate("/login");
        return;
      }
      setError(err.message || "비밀번호 변경에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#FDFAF4] px-6 py-8">
      <div className="w-full max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-[#F4EFE6] flex items-center justify-center text-[#2A2420]"
            aria-label="뒤로가기"
          >
            <ArrowLeftIcon />
          </button>
          <p className="text-base font-medium text-[#2A2420]">비밀번호 재설정</p>
        </div>

        {done ? (
          <div className="flex flex-col items-center pt-10">
            <div className="w-14 h-14 rounded-full bg-[#E7F0E2] flex items-center justify-center mb-4">
              <CheckIcon />
            </div>
            <p className="text-sm font-medium text-[#2A2420] mb-1.5">
              비밀번호가 변경됐어요
            </p>
            <p className="text-xs text-[#8C8274] mb-8">
              다음 로그인부터 새 비밀번호를 사용해주세요
            </p>
            <button
              onClick={() => navigate("/mypage", { replace: true })}
              className="w-full h-12 rounded-xl bg-[#8B4A26] text-white text-sm font-medium gs-press"
            >
              마이페이지로 돌아가기
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs text-[#6B6156] mb-1.5">현재 비밀번호</p>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호를 입력해주세요"
                  className={inputClass}
                />
              </div>

              <div>
                <p className="text-xs text-[#6B6156] mb-1.5">새 비밀번호</p>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8자 이상, 영문+숫자+특수문자"
                  className={`${inputClass} ${pwTooShort ? "border-[#d70015]" : ""}`}
                />
                {pwTooShort && (
                  <p className="mt-1 text-xs text-[#d70015]">
                    비밀번호는 8자 이상이어야 합니다
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-[#6B6156] mb-1.5">새 비밀번호 확인</p>
                <input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="새 비밀번호를 한번 더 입력"
                  className={`${inputClass} ${pwMismatch ? "border-[#d70015]" : ""}`}
                />
                {pwMismatch && (
                  <p className="mt-1 text-xs text-[#d70015]">
                    비밀번호가 일치하지 않습니다
                  </p>
                )}
              </div>
            </div>

            {error && <p className="text-xs text-[#d70015] mt-4">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className={`w-full h-12 rounded-xl text-sm font-medium mt-8 transition-colors ${
                canSubmit && !submitting
                  ? "bg-[#8B4A26] text-white hover:bg-[#6B3618]"
                  : "bg-[#E6DDCD] text-[#8C8274]"
              }`}
            >
              {submitting ? "변경 중..." : "비밀번호 변경"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 19l-7-7 7-7"
        stroke="#2A2420"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 13l4.5 4.5L19 7.5"
        stroke="#3F7A47"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
