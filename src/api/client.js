// ============================================================
// API 공통 클라이언트
// - 토큰 저장/조회
// - access token 만료(401) 시 자동으로 토큰 재발급 후 재시도
// - 모든 도메인별 api 파일(auth.js, areas.js, groups.js)이 이 파일의
//   authFetch()를 통해 요청을 보냄
// ============================================================

// export const BASE_URL = "http://43.201.94.243:8080"; // 실제 백엔드 서버 주소
// 서버 주소는 .env의 VITE_API_BASE_URL로 관리.
// 없으면 아래 기본값(배포 서버)을 사용한다.
export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://gyeongsanlog.cloud";


const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * 로그인/재발급으로 토큰이 저장될 때마다 발생하는 이벤트.
 * NotificationsProvider가 이걸 듣고 FCM 토큰을 서버에 등록한다
 * (앱 시작 시엔 토큰이 없어서 건너뛰고, 로그인 시점에 다시 시도해야 하므로).
 */
export const AUTH_CHANGED_EVENT = "gyeongsanlog:auth-changed";

export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// 진행 중인 재발급 요청. 여러 API가 동시에 401을 받아도 재발급은 한 번만 한다.
let reissuePromise = null;

/**
 * POST /api/member/reissue
 * refresh token으로 access/refresh 토큰을 재발급한다.
 *
 * 응답 200: { accessToken, refreshToken }
 * 응답 401: 유효하지 않거나 만료된 refresh token → 재로그인 필요
 *
 * [중요] 동시 호출 방지:
 * 화면 하나가 Promise.all로 API를 4개씩 쏘는데(GroupDetail 등), access
 * token이 만료돼 있으면 4개가 동시에 401을 받고 각자 재발급을 시도한다.
 * 서버가 refresh token을 회전(사용 즉시 폐기, 새 토큰 발급)시키면
 * 첫 번째 재발급만 성공하고 나머지는 이미 폐기된 토큰으로 요청해서
 * 401 → clearTokens() → 멀쩡한 사용자가 로그인 화면으로 튕긴다.
 * 그래서 진행 중인 재발급 Promise를 공유해, 뒤따라온 요청은 새로 만들지
 * 않고 같은 결과를 기다리게 한다.
 */
function reissueToken() {
  if (reissuePromise) return reissuePromise;

  reissuePromise = (async () => {
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
  })().finally(() => {
    // 성공이든 실패든 끝나면 캐시를 비워서, 다음 만료 때 다시 시도할 수 있게 함
    reissuePromise = null;
  });

  return reissuePromise;
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
    } catch {
      // 재발급 실패 → 로그인 필요 상태를 호출부가 알 수 있도록 에러 전파
      throw new Error("AUTH_EXPIRED");
    }
  }

  return res;
}