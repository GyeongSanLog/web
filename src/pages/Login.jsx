import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { login } from "../api/auth";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("이메일과 비밀번호를 모두 입력해주세요");
      return;
    }

    setSubmitting(true);
    try {
      await login({ email, password });
      navigate("/home");
    } catch (err) {
      setError(err.message || "로그인에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
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
          disabled={submitting}
          className={`w-full h-12 rounded-xl text-sm font-medium mt-3 mb-4 transition-colors ${
            submitting
              ? "bg-[#e5e5ea] text-[#98989d]"
              : "bg-[#6F4A2C] text-white hover:bg-[#5c3d24]"
          }`}
        >
          {submitting ? "로그인 중..." : "로그인"}
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

        {/* TODO: 카카오/구글 OAuth API 명세 받으면 연동 */}
        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={() => console.log("카카오 로그인 TODO - API 명세 대기중")}
            className="h-12 rounded-xl bg-[#FEE500] text-[#3C1E1E] text-sm font-medium hover:brightness-95 transition-all"
          >
            카카오로 계속하기
          </button>
          <button
            onClick={() => console.log("구글 로그인 TODO - API 명세 대기중")}
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
    </div>
  );
}