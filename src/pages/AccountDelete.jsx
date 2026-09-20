import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteMyAccount } from "../api/member";

export default function AccountDelete() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  // 탈퇴는 되돌릴 수 없는 동작이라, 화면의 "탈퇴하기"를 눌러도 바로 실행하지
  // 않고 한 번 더 묻는 모달을 띄운다. 모달의 "네, 탈퇴할게요"를 눌러야 실제 호출.
  const [showConfirm, setShowConfirm] = useState(false);

  // DELETE /api/member/me (api/member.js의 deleteMyAccount) — 실제 연동 완료.
  // 성공하면 토큰과 로컬 알림 데이터는 deleteMyAccount() 안에서 이미 지워지므로
  // 여기서는 완료 안내를 잠깐 보여준 뒤 로그인 화면으로 보내기만 하면 됨.
  //
  // [수정 전 버그] 예전엔 try/finally만 있고 "준비 중" 문구를 무조건 띄웠음.
  // 그래서 실제로는 서버에서 계정이 삭제되고 토큰까지 지워지는데 화면엔
  // "아직 준비 중"이라고 떠서 사용자가 아무 일도 안 일어난 줄 알았고,
  // 409(그룹 리더라 탈퇴 불가) 같은 에러도 그대로 삼켜졌음.
  const handleDelete = async () => {
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      await deleteMyAccount();
      setShowConfirm(false);
      setDone(true);
      // 완료 화면을 잠깐 보여준 뒤 로그인으로. replace로 이동해 뒤로가기로
      // 탈퇴 화면에 되돌아오지 않게 함.
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") {
        navigate("/login", { replace: true });
        return;
      }
      // 모달은 열어둔 채 그 안에 에러를 보여준다 (닫아버리면 왜 실패했는지 놓침)
      setError(err.message || "회원 탈퇴에 실패했어요");
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="h-full bg-[#FDFAF4] flex flex-col items-center justify-center px-6 gs-rise">
        <div className="w-14 h-14 rounded-full bg-[#E7F0E2] flex items-center justify-center mb-4">
          <CheckIcon />
        </div>
        <p className="text-sm font-medium text-[#2A2420] mb-1.5">탈퇴가 완료됐어요</p>
        <p className="text-xs text-[#8C8274]">그동안 경산로그를 이용해주셔서 감사해요</p>
      </div>
    );
  }

  return (
    // 바깥은 위치 기준(relative)만, 스크롤은 안쪽 div가 담당 → 모달이 스크롤 위치와
    // 무관하게 항상 화면 정중앙에 뜬다 (GroupDetail의 모달 구조와 동일)
    <div className="h-full relative">
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
          <p className="text-base font-medium text-[#2A2420]">회원 탈퇴</p>
        </div>

        <div className="flex flex-col items-center pt-4 pb-8">
          <div className="w-14 h-14 rounded-full bg-[#fdecea] flex items-center justify-center mb-4">
            <WarnIcon />
          </div>
          <p className="text-sm font-medium text-[#2A2420] mb-1.5">
            정말 탈퇴하시겠어요?
          </p>
          <p className="text-xs text-[#8C8274] text-center leading-relaxed">
            탈퇴하면 계정 정보가 삭제되고{"\n"}복구할 수 없어요
          </p>
        </div>

        <ul className="rounded-2xl bg-[#F4EFE6] border border-[#E6DDCD] px-4 py-4 mb-8 flex flex-col gap-2">
          <li className="text-xs text-[#6B6156]">· 저장된 셋로그와 사진이 모두 삭제돼요</li>
          <li className="text-xs text-[#6B6156]">· 참여 중인 여행 그룹에서 자동으로 나가져요</li>
          <li className="text-xs text-[#6B6156]">· 같은 이메일로는 다시 가입할 수 있어요</li>
        </ul>

        <button
          onClick={() => {
            setError("");
            setShowConfirm(true);
          }}
          className="w-full h-12 rounded-xl bg-[#d70015] text-white text-sm font-medium mb-3 gs-press"
        >
          탈퇴하기
        </button>
        <button
          onClick={() => navigate(-1)}
          className="w-full h-12 rounded-xl bg-[#F4EFE6] text-[#2A2420] text-sm font-medium gs-press"
        >
          취소
        </button>
      </div>
    </div>

      {/* 재확인 모달 */}
      {showConfirm && (
        <div className="absolute inset-0 bg-[#2A1A0C]/45 flex items-center justify-center px-8 z-20 gs-fade-in">
          <div className="w-full bg-[#FFFCF6] border border-[#EBE0CE] rounded-2xl p-5 gs-scale-in">
            <p className="text-[15px] font-medium text-[#2A2420] mb-1.5">
              정말 탈퇴하시겠어요?
            </p>
            <p className="text-[13px] text-[#6B6156] mb-4 leading-relaxed">
              탈퇴하면 계정과 기록이 삭제되고 되돌릴 수 없어요.
              다른 멤버가 있는 그룹의 리더라면 먼저 그룹을 정리해야 해요.
            </p>

            {error && (
              <p className="text-[13px] text-[#d70015] mb-3">{error}</p>
            )}

            <div className="flex gap-2.5">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 h-11 rounded-xl bg-[#F4EFE6] text-[14px] text-[#2A2420] font-medium gs-press disabled:opacity-50"
              >
                아니요
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 h-11 rounded-xl bg-[#d70015] text-[14px] text-white font-medium gs-press disabled:opacity-50"
              >
                {submitting ? "처리 중..." : "네, 탈퇴할게요"}
              </button>
            </div>
          </div>
        </div>
      )}
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

function WarnIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4l9.5 16.5H2.5L12 4z"
        stroke="#d70015"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 10v4.5" stroke="#d70015" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17.3" r="1" fill="#d70015" />
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
