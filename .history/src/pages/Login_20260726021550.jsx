import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("이메일과 비밀번호를 모두 입력해주세요");
      return;
    }

    // TODO: 백엔드 연동 (FastAPI 예시)
    // const res = await fetch("http://localhost:8000/auth/login", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ email, password }),
    // });
    // if (!res.ok) { setError("이메일 또는 비밀번호가 올바르지 않습니다"); return; }
    // const data = await res.json();
    // localStorage.setItem("token", data.access_token);

    console.log("로그인 시도:", { email, password });
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-10">
          <Logo size={56} />
          <p className="mt-4 text-lg font-medium text-white">경산로그</p>
          <p className="mt-1 text-sm text-[#8e8e93]">여행의 모든 순간을 기록하다</p>
        </div>

        <div className="flex flex-col gap-3 mb-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            className="h-12 rounded-xl bg-[#1c1c1e] border border-[#2c2c2e] px-4 text-sm text-white placeholder-[#6e6e73] outline-none focus:border-[#5b9dff] transition-colors"
          />

          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="비밀번호"
              className="w-full h-12 rounded-xl bg-[#1c1c1e] border border-[#2c2c2e] px-4 pr-14 text-sm text-white placeholder-[#6e6e73] outline-none focus:border-[#5b9dff] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e6e73] text-xs"
            >
              {showPw ? "숨김" : "표시"}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-[#ff3b30] mb-2 mt-1">{error}</p>}

        <button
          onClick={handleLogin}
          className="w-full h-12 rounded-xl bg-[#5b9dff] text-white text-sm font-medium mt-3 mb-4 hover:bg-[#4a8cee] transition-colors"
        >
          로그인
        </button>

        <button
          onClick={() => navigate("/find-account")}
          className="w-full text-center text-xs text-[#8e8e93] underline mb-8"
        >
          아이디 찾기 / 비밀번호 변경
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[#2c2c2e]" />
          <span className="text-xs text-[#6e6e73]">SNS 계정으로 로그인</span>
          <div className="flex-1 h-px bg-[#2c2c2e]" />
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={() => console.log("카카오 로그인 TODO")}
            className="h-12 rounded-xl bg-[#FEE500] text-[#3C1E1E] text-sm font-medium hover:brightness-95 transition-all"
          >
            카카오로 계속하기
          </button>
          <button
            onClick={() => console.log("구글 로그인 TODO")}
            className="h-12 rounded-xl bg-[#1c1c1e] border border-[#2c2c2e] text-white text-sm font-medium hover:border-[#3a3a3c] transition-colors"
          >
            구글로 계속하기
          </button>
        </div>

        <p className="text-center text-xs text-[#8e8e93]">
          계정이 없으신가요?{" "}
          <button
            onClick={() => navigate("/signup")}
            className="text-[#5b9dff] font-medium"
          >
            회원가입
          </button>
        </p>

      </div>
    </div>
  );
}