import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  register,
  checkNicknameAvailable,
  sendEmailCode,
  verifyEmailCode,
} from "../api/auth";

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

function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const CODE_VALID_SECONDS = 5 * 60; // 인증코드 유효시간 5분
const RESEND_WAIT_SECONDS = 60; // 재발송 제한 60초

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    nickname: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 닉네임 중복 확인 상태
  const [nicknameStatus, setNicknameStatus] = useState(null);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [checkedNicknameValue, setCheckedNicknameValue] = useState("");

  // 이메일 인증 상태
  // codeSent: 인증코드가 발송되어 입력창이 펼쳐진 상태
  // emailVerified: verify API를 통과해서 실제로 인증이 완료된 상태
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailForVerification, setEmailForVerification] = useState(""); // 인증을 시작한 이메일 (이후 바뀌면 무효화)
  const [code, setCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [emailError, setEmailError] = useState("");

  // 카운트다운 (초 단위). 0이면 만료/재발송 가능 상태.
  const [validRemaining, setValidRemaining] = useState(0); // 인증코드 유효시간 카운트다운
  const [resendRemaining, setResendRemaining] = useState(0); // 재발송 제한 카운트다운
  const timerRef = useRef(null);

  useEffect(() => {
    if (!codeSent) return;
    timerRef.current = setInterval(() => {
      setValidRemaining((v) => Math.max(0, v - 1));
      setResendRemaining((v) => Math.max(0, v - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [codeSent]);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleNicknameChange = (e) => {
    setForm({ ...form, nickname: e.target.value });
    setNicknameStatus(null);
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

  const nicknameConfirmed =
    nicknameStatus === true && checkedNicknameValue === form.nickname;

  const pwMismatch =
    form.passwordConfirm.length > 0 && form.password !== form.passwordConfirm;

  const pwTooShort = form.password.length > 0 && form.password.length < 8;

  // 이메일을 인증 시작 시점 이후에 바꿨으면 인증 무효 처리
  const handleEmailChange = (e) => {
    update("email")(e);
    if (emailForVerification && e.target.value !== emailForVerification) {
      setEmailVerified(false);
      setCodeSent(false);
      setCode("");
    }
  };

  const handleSendCode = async () => {
    if (!form.email.includes("@")) {
      setEmailError("올바른 이메일 형식을 입력해주세요");
      return;
    }
    setEmailError("");
    setSendingCode(true);
    try {
      await sendEmailCode(form.email);
      setEmailForVerification(form.email);
      setCodeSent(true);
      setEmailVerified(false);
      setCode("");
      setValidRemaining(CODE_VALID_SECONDS);
      setResendRemaining(RESEND_WAIT_SECONDS);
    } catch (err) {
      setEmailError(err.message || "인증코드 발송에 실패했습니다");
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      setEmailError("인증코드를 입력해주세요");
      return;
    }
    if (validRemaining <= 0) {
      setEmailError("인증코드가 만료됐어요. 다시 발송해주세요");
      return;
    }
    setEmailError("");
    setVerifyingCode(true);
    try {
      await verifyEmailCode({ email: form.email, code: code.trim() });
      setEmailVerified(true);
    } catch (err) {
      setEmailError(err.message || "인증에 실패했습니다");
    } finally {
      setVerifyingCode(false);
    }
  };

  const canSubmit =
    form.name &&
    form.nickname &&
    nicknameConfirmed &&
    form.email &&
    emailVerified &&
    form.password.length >= 8 &&
    form.password === form.passwordConfirm;

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
      // 이메일 인증 후 30분이 지나면 서버가 다시 거부할 수 있음 —
      // 이 경우 사용자에게 재인증을 안내
      setError(
        err.message ||
          "회원가입에 실패했습니다. 인증이 오래됐다면 이메일 인증을 다시 진행해주세요"
      );
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
                onChange={handleEmailChange}
                placeholder="example@mail.com"
                disabled={emailVerified}
                className={`${inputClass} disabled:opacity-60`}
              />
              <button
                onClick={handleSendCode}
                disabled={
                  emailVerified ||
                  sendingCode ||
                  !form.email.includes("@") ||
                  (codeSent && resendRemaining > 0)
                }
                className={`shrink-0 px-4 rounded-[10px] text-xs font-medium disabled:opacity-50 ${
                  emailVerified
                    ? "bg-[#e6f4ea] text-[#1f8b3f]"
                    : "bg-[#6F4A2C] text-white"
                }`}
              >
                {emailVerified
                  ? "완료"
                  : sendingCode
                  ? "발송 중..."
                  : codeSent && resendRemaining > 0
                  ? `재발송 ${resendRemaining}s`
                  : codeSent
                  ? "재발송"
                  : "인증"}
              </button>
            </div>

            {/* 인증코드 입력칸 - 발송 후에만 인라인으로 펼쳐짐 */}
            {codeSent && !emailVerified && (
              <div className="mt-2.5">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="인증코드 6자리"
                      maxLength={6}
                      inputMode="numeric"
                      className={inputClass}
                    />
                    {validRemaining > 0 && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#d70015] tabular-nums">
                        {formatMMSS(validRemaining)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleVerifyCode}
                    disabled={verifyingCode || !code.trim() || validRemaining <= 0}
                    className="shrink-0 px-4 rounded-[10px] text-xs font-medium bg-[#6F4A2C] text-white disabled:opacity-50"
                  >
                    {verifyingCode ? "확인 중..." : "확인"}
                  </button>
                </div>
                {validRemaining <= 0 && (
                  <p className="mt-1 text-xs text-[#d70015]">
                    인증코드가 만료됐어요. 재발송해주세요
                  </p>
                )}
              </div>
            )}

            {emailError && (
              <p className="mt-1 text-xs text-[#d70015]">{emailError}</p>
            )}
            {emailVerified && (
              <p className="mt-1 text-xs text-[#1f8b3f]">
                이메일 인증이 완료됐어요
              </p>
            )}
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