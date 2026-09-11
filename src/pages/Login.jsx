import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { login } from "../api/auth";
import { startKakaoLogin } from "../utils/kakao";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

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

  async function handleKakaoLogin() {
    if (kakaoLoading) return;
    setError("");
    setKakaoLoading(true);
    try {
      // 성공하면 카카오 로그인 페이지로 리다이렉트되면서 이 화면을 벗어남.
      // 실패(SDK 로드 실패, 키 누락 등)하면 여기서 에러를 잡아서 보여줌.
      await startKakaoLogin();
    } catch (err) {
      console.error("카카오 로그인 시작 실패:", err);
      setError(err.message || "카카오 로그인을 시작할 수 없어요");
      setKakaoLoading(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-[#FBF1DE] via-[#FDF8EF] to-[#F1ECE0] flex items-center justify-center px-6 py-10 relative">
      {/* 화면 맨 아래 팔공산 능선 - 로그인 화면 전체가 하나의 풍경이 되도록 */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-40"
        viewBox="0 0 390 160"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 160V96l56-44 44 34 64-56 52 48 62-40 112 58v64z" fill="#9DB894" fillOpacity="0.3" />
        <path d="M0 160v-46l62-34 48 26 62-38 56 34 60-26 102 38v46z" fill="#4B6B4E" fillOpacity="0.28" />
      </svg>

      <div className="relative w-full max-w-sm">

        <div className="flex flex-col items-center mb-10 gs-rise">
          <Logo size={76} animated />
          <p className="mt-4 font-brand text-[26px] font-bold text-[#8B4A26]">경산로그</p>
          <p className="mt-1 text-sm text-[#6B6156]">여행의 모든 순간을 기록하다</p>
        </div>

        <div className="flex flex-col gap-3 mb-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            className="h-12 rounded-2xl bg-[#FFFDF8] border border-[#E7DAC4] px-4 text-sm text-[#2A2420] placeholder-[#9A9082] outline-none focus:border-[#8B4A26] transition-colors"
          />

          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="비밀번호"
              className="w-full h-12 rounded-2xl bg-[#FFFDF8] border border-[#E7DAC4] px-4 pr-14 text-sm text-[#2A2420] placeholder-[#9A9082] outline-none focus:border-[#8B4A26] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8274] text-xs"
            >
              {showPw ? "숨김" : "표시"}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-[#d70015] mb-2 mt-1">{error}</p>}

        <button
          onClick={handleLogin}
          disabled={submitting}
          className={`w-full h-12 rounded-2xl text-sm font-medium mt-3 mb-4 gs-press shadow-sm shadow-[#8B4A26]/25 ${
            submitting
              ? "bg-[#E6DDCD] text-[#8C8274] shadow-none"
              : "bg-gradient-to-br from-[#A45B2C] to-[#7A3D1C] text-white hover:from-[#8B4A26] hover:to-[#6B3618]"
          }`}
        >
          {submitting ? "로그인 중..." : "로그인"}
        </button>

        <button
          onClick={() => navigate("/find-account")}
          className="w-full text-center text-xs text-[#6B6156] underline mb-8 gs-press"
        >
          아이디 찾기 / 비밀번호 변경
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[#E6DDCD]" />
          <span className="text-xs text-[#8C8274]">SNS 계정으로 로그인</span>
          <div className="flex-1 h-px bg-[#E6DDCD]" />
        </div>

        {/* TODO: 구글 OAuth API 명세 받으면 연동 (카카오는 연동 완료) */}
        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={handleKakaoLogin}
            disabled={kakaoLoading}
            className="h-12 rounded-2xl bg-[#FEE500] text-[#3C1E1E] text-sm font-medium gs-press hover:brightness-95 disabled:opacity-60"
          >
            {kakaoLoading ? "이동 중..." : "카카오로 계속하기"}
          </button>
          <button
            onClick={() => console.log("구글 로그인 TODO - API 명세 대기중")}
            className="h-12 rounded-2xl bg-[#FFFDF8] border border-[#E7DAC4] text-[#2A2420] text-sm font-medium gs-press hover:bg-[#F8F1E4]"
          >
            구글로 계속하기
          </button>
        </div>

        <p className="text-center text-xs text-[#6B6156]">
          계정이 없으신가요?{" "}
          <button onClick={() => navigate("/signup")} className="text-[#8B4A26] font-medium">
            회원가입
          </button>
        </p>

      </div>
    </div>
  );
}