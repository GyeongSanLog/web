// ============================================================
// 카카오 로그인 유틸
//
// 카카오 JS SDK를 동적으로 로드하고, 인가 코드를 받아오는 부분만
// 담당함. 실제 서버 로그인(POST /api/member/kakao/login)은
// api/auth.js의 kakaoLogin()이 처리함.
//
// 흐름:
// 1. Login.jsx에서 "카카오로 계속하기" 클릭
// 2. loadKakaoSdk()로 SDK 로드 + Kakao.init()
// 3. Kakao.Auth.authorize()로 카카오 로그인 페이지로 리다이렉트
// 4. 사용자가 로그인하면 카카오가 getKakaoRedirectUrl()로 되돌아오면서
//    쿼리스트링에 인가 코드(code)를 담아줌
// 5. OauthKakao.jsx가 그 code를 꺼내 kakaoLogin()을 호출
// ============================================================

const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

let sdkLoadingPromise = null;

/**
 * 카카오 JS SDK를 로드하고 초기화. 이미 로드되어 있으면 재사용.
 * 여러 곳에서 동시에 호출해도 스크립트 태그가 중복 삽입되지 않도록
 * Promise를 캐싱함.
 */
export function loadKakaoSdk() {
  if (window.Kakao?.isInitialized?.()) {
    return Promise.resolve(window.Kakao);
  }

  if (sdkLoadingPromise) {
    return sdkLoadingPromise;
  }

  sdkLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${KAKAO_SDK_URL}"]`);

    function initAndResolve() {
      const jsKey = import.meta.env.VITE_KAKAO_JS_KEY;
      if (!jsKey) {
        reject(new Error("VITE_KAKAO_JS_KEY가 설정되어 있지 않아요"));
        return;
      }
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(jsKey);
      }
      resolve(window.Kakao);
    }

    if (existingScript) {
      // 이미 태그는 있는데 로드 중일 수 있으니 load 이벤트를 다시 검
      if (window.Kakao) {
        initAndResolve();
      } else {
        existingScript.addEventListener("load", initAndResolve);
        existingScript.addEventListener("error", () =>
          reject(new Error("카카오 SDK 로드에 실패했어요"))
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = initAndResolve;
    script.onerror = () => reject(new Error("카카오 SDK 로드에 실패했어요"));
    document.head.appendChild(script);
  });

  return sdkLoadingPromise;
}

/**
 * 현재 실행 환경(로컬/배포)에 맞는 카카오 redirect_uri를 반환.
 * 카카오 개발자 콘솔에 아래 두 주소가 모두 등록되어 있어야 함:
 *   - http://localhost:5173/oauth/kakao
 *   - https://web-gs-log.vercel.app/oauth/kakao
 */
export function getKakaoRedirectUrl() {
  return `${window.location.origin}/oauth/kakao`;
}

/**
 * 카카오 로그인 페이지로 리다이렉트.
 * 로그인이 끝나면 카카오가 getKakaoRedirectUrl()로 돌아오면서
 * ?code=... 형태로 인가 코드를 붙여줌.
 */
export async function startKakaoLogin() {
  const Kakao = await loadKakaoSdk();
  Kakao.Auth.authorize({
    redirectUri: getKakaoRedirectUrl(),
  });
}