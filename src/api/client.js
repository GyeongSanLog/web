// ============================================================
// API 공통 클라이언트
// - 토큰 저장/조회
// - access token 만료(401) 시 자동으로 토큰 재발급 후 재시도
// - 모든 도메인별 api 파일(auth.js, areas.js, groups.js)이 이 파일의
//   authFetch()를 통해 요청을 보냄
// ============================================================

export const BASE_URL = "http://43.201.94.243:8080"; // 실제 백엔드 서버 주소

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * POST /api/member/reissue
 * refresh token으로 access/refresh 토큰을 재발급한다.
 *
 * 응답 200: { accessToken, refreshToken }
 * 응답 401: 유효하지 않거나 만료된 refresh token → 재로그인 필요
 */
async function reissueToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("refresh token이 없습니다");

  const res = await fetch(`${BASE_URL}/api/member/reissue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    // refresh token도 만료됨 → 완전 로그아웃 처리 필요
    clearTokens();
    throw new Error("세션이 만료되었습니다. 다시 로그인해주세요.");
  }

  const data = await res.json();
  setTokens(data); // { accessToken, refreshToken }
  return data.accessToken;
}

/**
 * 인증이 필요한 API 요청을 위한 공통 fetch 래퍼.
 *
 * - access token을 자동으로 Authorization 헤더에 실어 보냄
 * - 401(만료)이 오면 자동으로 reissueToken() 시도 후 원래 요청을 1회 재시도
 * - 재발급도 실패하면 에러를 던짐 (호출부에서 로그인 페이지로 리다이렉트 처리)
 *
 * 사용 예:
 *   const res = await authFetch(`${BASE_URL}/api/areas`);
 *   const data = await res.json();
 */
export async function authFetch(url, options = {}) {
  const accessToken = getAccessToken();

  const doFetch = (token) =>
    fetch(url, {
      ...options,
      headers: {
        // FormData(멀티파트 업로드)는 브라우저가 boundary를 포함해 직접
        // Content-Type을 설정해야 하므로 기본값을 강제하지 않음
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res = await doFetch(accessToken);

  if (res.status === 401) {
    try {
      const newAccessToken = await reissueToken();
      res = await doFetch(newAccessToken);
    } catch (err) {
      // 재발급 실패 → 로그인 필요 상태를 호출부가 알 수 있도록 에러 전파
      throw new Error("AUTH_EXPIRED");
    }
  }

  return res;
}