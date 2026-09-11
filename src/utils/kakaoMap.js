// ============================================================
// 카카오 지도(Kakao Maps) 유틸
//
// 로그인용 카카오 SDK(utils/kakao.js)와는 다른 스크립트임.
//   - 로그인: t1.kakaocdn.net/kakao_js_sdk/... (window.Kakao)
//   - 지도  : dapi.kakao.com/v2/maps/sdk.js  (window.kakao.maps)
// 앱키는 둘 다 같은 JavaScript 키(VITE_KAKAO_JS_KEY)를 쓴다.
//
// 주의: 카카오 개발자 콘솔에서
//   1) [앱 설정 > 플랫폼 > Web] 에 사이트 도메인이 등록돼 있어야 하고
//      (http://localhost:5173, https://web-gs-log.vercel.app)
//   2) [제품 설정 > 카카오맵] 이 ON 이어야 지도가 뜬다.
// 둘 중 하나라도 빠지면 스크립트는 받아지지만 지도가 그려지지 않는다.
// ============================================================

const MAPS_SDK_URL = (appkey) =>
  `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false`;

/** 현위치를 못 받았을 때 사용할 기본 중심 좌표 (경산시청) */
export const GYEONGSAN_CENTER = { lat: 35.82497, lng: 128.74147 };

let mapSdkPromise = null;

/**
 * 카카오 지도 SDK를 로드하고 kakao.maps 네임스페이스가 준비될 때까지 기다린다.
 * autoload=false 로 받아서 kakao.maps.load() 콜백 이후에 resolve 하므로,
 * 이 함수가 resolve 되면 곧바로 new kakao.maps.Map(...) 을 호출해도 안전하다.
 */
export function loadKakaoMapSdk() {
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao);
  if (mapSdkPromise) return mapSdkPromise;

  mapSdkPromise = new Promise((resolve, reject) => {
    const appkey = import.meta.env.VITE_KAKAO_JS_KEY;
    if (!appkey) {
      reject(new Error("VITE_KAKAO_JS_KEY가 설정되어 있지 않아요"));
      return;
    }

    const src = MAPS_SDK_URL(appkey);
    const finish = () => {
      if (!window.kakao?.maps) {
        reject(new Error("지도 SDK를 초기화하지 못했어요"));
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao));
    };

    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (window.kakao?.maps) finish();
      else {
        existing.addEventListener("load", finish);
        existing.addEventListener("error", () =>
          reject(new Error("지도 SDK 로드에 실패했어요"))
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = finish;
    script.onerror = () => reject(new Error("지도 SDK 로드에 실패했어요"));
    document.head.appendChild(script);
  });

  // 실패했으면 다음 진입 때 다시 시도할 수 있도록 캐시를 비운다
  mapSdkPromise.catch(() => {
    mapSdkPromise = null;
  });

  return mapSdkPromise;
}

/**
 * 현재 위치를 가져온다. 권한 거부/미지원/타임아웃 등 어떤 이유로 실패해도
 * reject 하지 않고 경산 중심 좌표를 fallback: true 와 함께 돌려준다.
 * (지도는 일단 떠야 하고, 실패 사실은 화면에서 안내만 하면 되므로)
 *
 * @returns {Promise<{lat:number, lng:number, fallback:boolean}>}
 */
export function getCurrentPosition({ timeout = 8000 } = {}) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ...GYEONGSAN_CENTER, fallback: true });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          fallback: false,
        }),
      () => resolve({ ...GYEONGSAN_CENTER, fallback: true }),
      { enableHighAccuracy: true, timeout, maximumAge: 30000 }
    );
  });
}

/**
 * 두 좌표 사이 직선거리(m). 결과 카드에서 "내 위치에서 12.3km" 를 보여줄 때 사용.
 */
export function distanceInMeters(a, b) {
  if (!a || !b) return null;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 거리(m)를 "850m" / "12.3km" 형태로 */
export function formatDistance(meters) {
  if (meters == null || Number.isNaN(meters)) return null;
  if (meters < 1000) return `${Math.round(meters / 10) * 10}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
