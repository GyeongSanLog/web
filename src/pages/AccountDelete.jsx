import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteMyAccount } from "../api/member";

export default function AccountDelete() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  // TODO: 탈퇴 API 나오면 성공 시 로그인 화면으로 보내고, 실패하면 에러 메시지 띄우기.
  // 지금은 백엔드가 없어서 눌러도 "준비중" 안내만 뜸.
  const handleDelete = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await deleteMyAccount();
    } finally {
      setSubmitting(false);
      setNotice("회원 탈퇴 기능은 아직 준비 중이에요. 조금만 기다려주세요!");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white px-6 py-8">
      <div className="w-full max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#1c1c1e]"
            aria-label="뒤로가기"
          >
            <ArrowLeftIcon />
          </button>
          <p className="text-base font-medium text-[#1c1c1e]">회원 탈퇴</p>
        </div>

        <div className="flex flex-col items-center pt-4 pb-8">
          <div className="w-14 h-14 rounded-full bg-[#fdecea] flex items-center justify-center mb-4">
            <WarnIcon />
          </div>
          <p className="text-sm font-medium text-[#1c1c1e] mb-1.5">
            정말 탈퇴하시겠어요?
          </p>
          <p className="text-xs text-[#98989d] text-center leading-relaxed">
            탈퇴하면 계정 정보가 삭제되고{"\n"}복구할 수 없어요
          </p>
        </div>

        <ul className="rounded-2xl bg-[#f5f5f7] border border-[#e5e5ea] px-4 py-4 mb-8 flex flex-col gap-2">
          <li className="text-xs text-[#6e6e73]">· 저장된 셋로그와 사진이 모두 삭제돼요</li>
          <li className="text-xs text-[#6e6e73]">· 참여 중인 여행 그룹에서 자동으로 나가져요</li>
          <li className="text-xs text-[#6e6e73]">· 같은 이메일로는 다시 가입할 수 있어요</li>
        </ul>

        {notice && (
          <p className="text-xs text-[#6F4A2C] text-center mb-4">{notice}</p>
        )}

        <button
          onClick={handleDelete}
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-[#d70015] text-white text-sm font-medium mb-3 disabled:opacity-60"
        >
          {submitting ? "처리 중..." : "탈퇴하기"}
        </button>
        <button
          onClick={() => navigate(-1)}
          className="w-full h-12 rounded-xl bg-[#f5f5f7] text-[#1c1c1e] text-sm font-medium"
        >
          취소
        </button>
      </div>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 19l-7-7 7-7"
        stroke="#1c1c1e"
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
