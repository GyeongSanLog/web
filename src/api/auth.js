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