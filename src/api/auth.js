// ============================================================
// 인증 관련 API
// ============================================================

import { BASE_URL, setTokens, clearTokens, getRefreshToken } from "./client";

/**
 * 서버 에러 응답에서 메시지를 최대한 안전하게 뽑아내는 헬퍼.
 * 서버가 JSON이 아닌 응답을 줄 수도 있으므로 실패해도 무시하고 기본 메시지를 씀.
 */
async function extractErrorMessage(res, fallback) {
  try {
    const body = await res.json();
    return body?.message || fallback;
  } catch {
    return fallback;
  }
}

/**
 * GET /api/member/nickname/check — 닉네임 중복 확인
 * 닉네임 사용 가능 여부를 반환한다.
 *
 * Query: ?nickname=xxx
 * Response 200: true (사용 가능) | false (이미 사용중)
 */
export async function checkNicknameAvailable(nickname) {
  const url = `${BASE_URL}/api/member/nickname/check?nickname=${encodeURIComponent(
    nickname
  )}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("닉네임 확인에 실패했습니다");
  }

  return res.json(); // true | false
}

/**
 * POST /api/member/register — 회원가입
 * 사용자의 정보를 받아 회원가입 진행 후 토큰을 반환한다.
 *
 * Request body: { email, nickname, name, password }
 * Response 201: { accessToken, refreshToken }
 *
 * 주의: Signup.jsx의 passwordConfirm(비밀번호 확인)은 명세서에 없는
 * 프론트 전용 검증 필드라 요청 바디에서 제외한다. 프로필 사진도
 * 명세서에 없어 이 API에서는 함께 보내지 않는다 (추후 별도 업로드 API 예정).
 */
export async function register({ email, nickname, name, password }) {
  const res = await fetch(`${BASE_URL}/api/member/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, nickname, name, password }),
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, "회원가입에 실패했습니다"));
  }

  const data = await res.json(); // { accessToken, refreshToken }
  setTokens(data);
  return data;
}

/**
 * POST /api/member/login — 로그인
 * 이메일/비밀번호로 로그인 후 토큰을 반환한다.
 *
 * Request body: { email, password }
 * Response 200: { accessToken, refreshToken }
 * Response 401: 비밀번호 불일치
 */
export async function login({ email, password }) {
  const res = await fetch(`${BASE_URL}/api/member/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다");
    }
    throw new Error(await extractErrorMessage(res, "로그인에 실패했습니다"));
  }

  const data = await res.json(); // { accessToken, refreshToken }
  setTokens(data);
  return data;
}

/**
 * POST /api/member/logout — 로그아웃
 * refresh token을 만료시켜 해당 세션을 로그아웃한다.
 *
 * Request body: { refreshToken }
 * Response 204: 로그아웃 성공 (바디 없음)
 *
 * 서버 요청 성공 여부와 무관하게, 로컬에 저장된 토큰은 항상 지운다.
 * (서버 응답이 실패하더라도 클라이언트 쪽에서는 로그아웃된 것처럼 처리해야
 * 사용자가 로그아웃 버튼을 눌렀는데 계속 로그인 상태로 남는 걸 방지할 수 있음)
 */
export async function logout() {
  const refreshToken = getRefreshToken();

  if (refreshToken) {
    try {
      await fetch(`${BASE_URL}/api/member/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (err) {
      // 네트워크 오류 등으로 서버 로그아웃 요청이 실패해도
      // 로컬 토큰 삭제는 아래에서 계속 진행함
      console.error("로그아웃 요청 실패 (로컬 토큰은 정상 삭제됨):", err);
    }
  }

  clearTokens();
}

/**
 * POST /api/member/reissue — 토큰 재발급
 *
 * 보통 이 함수를 화면에서 직접 호출할 일은 거의 없습니다.
 * (401 발생 시 client.js의 authFetch()가 내부적으로 알아서 호출하기 때문)
 * 앱 시작 시점에 토큰 유효성을 미리 검사하고 싶을 때 등
 * 명시적으로 호출해야 하는 경우를 위해 별도로 export해둡니다.
 */
export async function reissueTokenManually() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("refresh token이 없습니다");

  const res = await fetch(`${BASE_URL}/api/member/reissue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    throw new Error("세션이 만료되었습니다. 다시 로그인해주세요.");
  }

  const data = await res.json();
  setTokens(data);
  return data;
}

/**
 * POST /api/member/kakao/login — 카카오 로그인
 * 프론트가 받은 카카오 인가 코드로 로그인한다.
 * 가입 이력이 없으면 자동으로 가입 후 토큰을 발급한다.
 *
 * 주의: 아직 카카오 개발자 콘솔에 앱 등록 전이라, authCode를 실제로
 * 받아올 방법이 없음. 카카오 앱 등록 + JavaScript 키 발급 +
 * 카카오 JS SDK 연동(Kakao.Auth.authorize 등)이 먼저 필요함.
 * 이 함수는 authCode를 받아서 서버에 전달하는 부분만 미리 구현해둔 것.
 *
 * Request body: { authCode, redirectUrl }
 *   redirectUrl은 카카오 인가 코드를 받을 때 사용한 redirect_uri와
 *   정확히 일치해야 함 (예: "http://localhost:5173/oauth/kakao")
 * Response 200: { accessToken, refreshToken }
 * Response 400: 인가 코드 또는 redirect_uri 오류
 * Response 401: 카카오 사용자 정보 조회 실패
 */
export async function kakaoLogin({ authCode, redirectUrl }) {
  const res = await fetch(`${BASE_URL}/api/member/kakao/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authCode, redirectUrl }),
  });

  if (!res.ok) {
    if (res.status === 400) {
      throw new Error("카카오 인증 정보가 올바르지 않아요");
    }
    if (res.status === 401) {
      throw new Error("카카오 사용자 정보를 가져오지 못했어요");
    }
    throw new Error(await extractErrorMessage(res, "카카오 로그인에 실패했습니다"));
  }

  const data = await res.json(); // { accessToken, refreshToken }
  setTokens(data);
  return data;
}

/**
 * POST /api/member/email/send — 이메일 인증코드 발송
 * 가입하려는 이메일로 6자리 인증코드를 발송한다.
 * 코드는 5분간 유효하며 60초 내 재발송은 제한된다.
 *
 * Request body: { email }
 * Response 204: 발송 성공 (바디 없음)
 * Response 409: 이미 가입된 이메일
 * Response 429: 재발송 대기 시간 미경과
 */
export async function sendEmailCode(email) {
  const res = await fetch(`${BASE_URL}/api/member/email/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    if (res.status === 409) {
      throw new Error("이미 가입된 이메일이에요");
    }
    if (res.status === 429) {
      throw new Error("잠시 후 다시 시도해주세요 (재발송 대기 시간)");
    }
    throw new Error(await extractErrorMessage(res, "인증코드 발송에 실패했습니다"));
  }
}

/**
 * POST /api/member/email/verify — 이메일 인증코드 검증
 * 발송된 인증코드를 검증한다. 통과하면 30분 안에 해당 이메일로 회원가입할 수 있다.
 *
 * Request body: { email, code }
 * Response 204: 인증 성공 (바디 없음)
 * Response 400: 인증코드 불일치 또는 만료
 */
export async function verifyEmailCode({ email, code }) {
  const res = await fetch(`${BASE_URL}/api/member/email/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  if (!res.ok) {
    if (res.status === 400) {
      throw new Error("인증코드가 올바르지 않거나 만료됐어요");
    }
    throw new Error(await extractErrorMessage(res, "인증에 실패했습니다"));
  }
}