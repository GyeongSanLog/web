import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register, checkNicknameAvailable } from "../api/auth";

const inputClass =
  "w-full h-11 rounded-[10px] bg-[#f5f5f7] border border-[#e5e5ea] px-3.5 text-[13px] text-[#1c1c1e] placeholder-[#98989d] outline-none focus:border-[#6F4A2C] transition-colors";

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs text-[#6e6e73] mb-1.5">{label}</p>
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
  const [submitting, setSubmitting] = useState(false);

  // 닉네임 중복 확인 상태
  // null: 아직 확인 안 함 / true: 사용 가능 / false: 이미 사용중
  const [nicknameStatus, setNicknameStatus] = useState(null);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [checkedNicknameValue, setCheckedNicknameValue] = useState("");

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleNicknameChange = (e) => {
    setForm({ ...form, nickname: e.target.value });
    setNicknameStatus(null); // 닉네임을 바꾸면 이전 확인 결과는 무효화
  };

  const handleCheckNickname = async () => {
    const value = form.nickname.trim();
    if (!value) {
      setError("닉네임을 입력해주세요");
      return;
    }
    setError("");
    setCheckingNickname(true);
    try {
      const available = await checkNicknameAvailable(value);
      setNicknameStatus(available);
      setCheckedNicknameValue(value);
    } catch (err) {
      setError(err.message || "닉네임 확인에 실패했습니다");
    } finally {
      setCheckingNickname(false);
    }
  };

  // 확인된 닉네임과 현재 입력값이 정확히 같아야 "사용 가능"으로 인정
  const nicknameConfirmed =
    nicknameStatus === true && checkedNicknameValue === form.nickname;

  const pwMismatch =
    form.passwordConfirm.length > 0 && form.password !== form.passwordConfirm;

  const pwTooShort = form.password.length > 0 && form.password.length < 8;

  const canSubmit =
    form.name &&
    form.nickname &&
    nicknameConfirmed &&
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

    setSubmitting(true);
    try {
      // 명세서 필드만 전송 (passwordConfirm, 프로필 사진은 이 API 대상이 아님)
      await register({
        email: form.email,
        nickname: form.nickname,
        name: form.name,
        password: form.password,
      });
      navigate("/home"); // register 응답에 토큰이 바로 오므로 로그인 화면을 거치지 않고 바로 홈으로
    } catch (err) {
      setError(err.message || "회원가입에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white flex justify-center px-6 py-8">
      <div className="w-full max-w-sm">

        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate("/login")}
            className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#1c1c1e]"
            aria-label="뒤로가기"
          >
            ←
          </button>
          <p className="text-base font-medium text-[#1c1c1e]">회원가입</p>
        </div>

        <div className="flex flex-col items-center mb-8">
          <button
            onClick={() => console.log("프로필 사진 업로드 TODO")}
            className="w-20 h-20 rounded-full bg-[#f5f5f7] border border-dashed border-[#c7c7cc] flex items-center justify-center text-2xl text-[#98989d]"
            aria-label="프로필 사진 추가"
          >
            +
          </button>
          <p className="mt-2 text-xs text-[#98989d]">프로필 사진 (선택)</p>
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
            <div className="flex gap-2">
              <input
                value={form.nickname}
                onChange={handleNicknameChange}
                placeholder="셋로그에 표시될 이름"
                className={inputClass}
              />
              <button
                onClick={handleCheckNickname}
                disabled={checkingNickname || !form.nickname.trim()}
                className={`shrink-0 px-4 rounded-[10px] text-xs font-medium disabled:opacity-50 ${
                  nicknameConfirmed
                    ? "bg-[#e6f4ea] text-[#1f8b3f]"
                    : "bg-[#6F4A2C] text-white"
                }`}
              >
                {checkingNickname
                  ? "확인 중..."
                  : nicknameConfirmed
                  ? "확인됨"
                  : "중복확인"}
              </button>
            </div>
            {nicknameStatus === false && (
              <p className="mt-1 text-xs text-[#d70015]">
                이미 사용중인 닉네임이에요
              </p>
            )}
            {nicknameConfirmed && (
              <p className="mt-1 text-xs text-[#1f8b3f]">
                사용 가능한 닉네임이에요
              </p>
            )}
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
                    ? "bg-[#e6f4ea] text-[#1f8b3f]"
                    : "bg-[#6F4A2C] text-white"
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
              className={`${inputClass} ${pwTooShort ? "border-[#d70015]" : ""}`}
            />
            {pwTooShort && (
              <p className="mt-1 text-xs text-[#d70015]">
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
              className={`${inputClass} ${pwMismatch ? "border-[#d70015]" : ""}`}
            />
            {pwMismatch && (
              <p className="mt-1 text-xs text-[#d70015]">
                비밀번호가 일치하지 않습니다
              </p>
            )}
          </Field>

        </div>

        {error && <p className="text-xs text-[#d70015] mt-4">{error}</p>}

        <button
          onClick={handleSignup}
          disabled={submitting}
          className={`w-full h-12 rounded-xl text-sm font-medium mt-8 transition-colors ${
            canSubmit && !submitting
              ? "bg-[#6F4A2C] text-white hover:bg-[#5c3d24]"
              : "bg-[#e5e5ea] text-[#98989d]"
          }`}
        >
          {submitting ? "가입 처리 중..." : "가입 완료"}
        </button>

      </div>
    </div>
  );
}