import { useState } from "react";
import { useNavigate } from "react-router-dom";

const inputClass =
  "w-full h-11 rounded-[10px] bg-[#1c1c1e] border border-[#2c2c2e] px-3.5 text-[13px] text-white placeholder-[#6e6e73] outline-none focus:border-[#5b9dff] transition-colors";

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs text-[#a1a1a6] mb-1.5">{label}</p>
      {children}
    </div>
  );
}

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    nickname: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [emailVerified, setEmailVerified] = useState(false);
  const [error, setError] = useState("");

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const pwMismatch =
    form.passwordConfirm.length > 0 && form.password !== form.passwordConfirm;

  const pwTooShort = form.password.length > 0 && form.password.length < 8;

  const canSubmit =
    form.name &&
    form.nickname &&
    form.email &&
    emailVerified &&
    form.password.length >= 8 &&
    form.password === form.passwordConfirm;

  const handleVerifyEmail = async () => {
    if (!form.email.includes("@")) {
      setError("올바른 이메일 형식을 입력해주세요");
      return;
    }
    setError("");

    // TODO: 백엔드 인증메일 발송 API 연동
    // await fetch("http://localhost:8000/auth/send-verification", { ... });

    console.log("인증메일 발송:", form.email);
    setEmailVerified(true);
  };

  const handleSignup = async () => {
    setError("");

    if (!canSubmit) {
      setError("모든 항목을 올바르게 입력해주세요");
      return;
    }

    // TODO: 백엔드 회원가입 API 연동
    // const res = await fetch("http://localhost:8000/auth/signup", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(form),
    // });
    // if (!res.ok) { setError("회원가입에 실패했습니다"); return; }

    console.log("회원가입 시도:", form);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] flex justify-center px-6 py-8">
      <div className="w-full max-w-sm">

        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate("/login")}
            className="w-8 h-8 rounded-full bg-[#1c1c1e] flex items-center justify-center text-white"
            aria-label="뒤로가기"
          >
            ←
          </button>
          <p className="text-base font-medium text-white">회원가입</p>
        </div>

        <div className="flex flex-col items-center mb-8">
          <button
            onClick={() => console.log("프로필 사진 업로드 TODO")}
            className="w-20 h-20 rounded-full bg-[#1c1c1e] border border-dashed border-[#3a3a3c] flex items-center justify-center text-2xl text-[#6e6e73]"
            aria-label="프로필 사진 추가"
          >
            +
          </button>
          <p className="mt-2 text-xs text-[#6e6e73]">프로필 사진 (선택)</p>
        </div>

        <div className="flex flex-col gap-4">

          <Field label="이름">
            <input
              value={form.name}
              onChange={update("name")}
              placeholder="실명을 입력해주세요"
              className={inputClass}
            />
          </Field>

          <Field label="닉네임">
            <input
              value={form.nickname}
              onChange={update("nickname")}
              placeholder="셋로그에 표시될 이름"
              className={inputClass}
            />
          </Field>

          <Field label="이메일">
            <div className="flex gap-2">
              <input
                type="email"
                value={form.email}
                onChange={(e) => {
                  update("email")(e);
                  setEmailVerified(false);
                }}
                placeholder="example@mail.com"
                className={inputClass}
              />
              <button
                onClick={handleVerifyEmail}
                disabled={emailVerified}
                className={`shrink-0 px-4 rounded-[10px] text-xs font-medium ${
                  emailVerified
                    ? "bg-[#1c2e22] text-[#4ade80]"
                    : "bg-[#5b9dff] text-white"
                }`}
              >
                {emailVerified ? "완료" : "인증"}
              </button>
            </div>
          </Field>

          <Field label="비밀번호">
            <input
              type="password"
              value={form.password}
              onChange={update("password")}
              placeholder="8자 이상, 영문+숫자+특수문자"
              className={`${inputClass} ${pwTooShort ? "border-[#ff3b30]" : ""}`}
            />
            {pwTooShort && (
              <p className="mt-1 text-xs text-[#ff3b30]">
                비밀번호는 8자 이상이어야 합니다
              </p>
            )}
          </Field>

          <Field label="비밀번호 확인">
            <input
              type="password"
              value={form.passwordConfirm}
              onChange={update("passwordConfirm")}
              placeholder="비밀번호를 한번 더 입력"
              className={`${inputClass} ${pwMismatch ? "border-[#ff3b30]" : ""}`}
            />
            {pwMismatch && (
              <p className="mt-1 text-xs text-[#ff3b30]">
                비밀번호가 일치하지 않습니다
              </p>
            )}
          </Field>

        </div>

        {error && <p className="text-xs text-[#ff3b30] mt-4">{error}</p>}

        <button
          onClick={handleSignup}
          className={`w-full h-12 rounded-xl text-sm font-medium mt-8 transition-colors ${
            canSubmit
              ? "bg-[#5b9dff] text-white hover:bg-[#4a8cee]"
              : "bg-[#2c2c2e] text-[#6e6e73]"
          }`}
        >
          가입 완료
        </button>

      </div>
    </div>
  );
}