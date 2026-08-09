import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false); // 임시 확인 모달

  const handleLogin = () => {
    setError("");

    if (!email || !password) {
      setError("이메일과 비밀번호를 모두 입력해주세요");
      return;
    }

    // TODO: 백엔드 연동 완료되면 아래 fetch로 교체하고,
    // 이 임시 확인 모달(showConfirm)은 제거할 것
    // const res = await fetch("http://localhost:8000/auth/login", { ... });
    // if (!res.ok) { setError("이메일 또는 비밀번호가 올바르지 않습니다"); return; }
    // navigate("/home");

    console.log("로그인 시도 (백엔드 미연동, 임시 확인창 표시):", { email, password });
    setShowConfirm(true);
  };

  return (
    <div className="h-full overflow-y-auto bg-white flex items-center justify-center px-6 py-10 relative">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-10">
          <Logo size={56} />
          <p className="mt-4 text-lg font-medium text-[#1c1c1e]">경산로그</p>
          <p className="mt-1 text-sm text-[#6e6e73]">여행의 모든 순간을 기록하다</p>
        </div>

        <div className="flex flex-col gap-3 mb-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            className="h-12 rounded-xl bg-[#f5f5f7] border border-[#e5e5ea] px-4 text-sm text-[#1c1c1e] placeholder-[#98989d] outline-none focus:border-[#6F4A2C] transition-colors"
          />

          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="비밀번호"
              className="w-full h-12 rounded-xl bg-[#f5f5f7] border border-[#e5e5ea] px-4 pr-14 text-sm text-[#1c1c1e] placeholder-[#98989d] outline-none focus:border-[#6F4A2C] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98989d] text-xs"
            >
              {showPw ? "숨김" : "표시"}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-[#d70015] mb-2 mt-1">{error}</p>}

        <button
          onClick={handleLogin}
          className="w-full h-12 rounded-xl bg-[#6F4A2C] text-white text-sm font-medium mt-3 mb-4 hover:bg-[#543720] transition-colors"
        >
          로그인
        </button>

        <button
          onClick={() => navigate("/find-account")}
          className="w-full text-center text-xs text-[#6e6e73] underline mb-8"
        >
          아이디 찾기 / 비밀번호 변경
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[#e5e5ea]" />
          <span className="text-xs text-[#98989d]">SNS 계정으로 로그인</span>
          <div className="flex-1 h-px bg-[#e5e5ea]" />
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={() => setShowConfirm(true)}
            className="h-12 rounded-xl bg-[#FEE500] text-[#3C1E1E] text-sm font-medium hover:brightness-95 transition-all"
          >
            카카오로 계속하기
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="h-12 rounded-xl bg-white border border-[#e5e5ea] text-[#1c1c1e] text-sm font-medium hover:bg-[#f5f5f7] transition-colors"
          >
            구글로 계속하기
          </button>
        </div>

        <p className="text-center text-xs text-[#6e6e73]">
          계정이 없으신가요?{" "}
          <button onClick={() => navigate("/signup")} className="text-[#6F4A2C] font-medium">
            회원가입
          </button>
        </p>

      </div>

      {/* 임시 확인 모달 - 백엔드 로그인 API 연동 전까지만 사용 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl px-6 py-6 w-full max-w-[280px] text-center shadow-xl">
            <div className="w-11 h-11 rounded-full bg-[#f3ece4] flex items-center justify-center mx-auto mb-3">
              <InfoIcon />
            </div>
            <p className="text-sm font-medium text-[#1c1c1e] mb-1.5">
              백엔드 로그인 기능 미구현
            </p>
            <p className="text-xs text-[#6e6e73] leading-relaxed mb-5">
              현재는 임시 화면입니다.
              <br />
              홈 화면으로 이동할까요?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-10 rounded-xl bg-[#f5f5f7] text-[#1c1c1e] text-sm"
              >
                취소
              </button>
              <button
                onClick={() => navigate("/home")}
                className="flex-1 h-10 rounded-xl bg-[#6F4A2C] text-white text-sm font-medium"
              >
                이동
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#6F4A2C" strokeWidth="1.8" />
      <path d="M12 11v5.5" stroke="#6F4A2C" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="8" r="1" fill="#6F4A2C" />
    </svg>
  );
}