// ============================================================
// Firebase 초기화 (FCM 푸시 알림용)
//
// 설정값은 .env의 VITE_FIREBASE_* 로 관리한다.
// 참고: Firebase 웹 config와 VAPID 공개키는 원래 브라우저 번들에
// 그대로 노출되는 "공개" 값이라 비밀이 아니다. 그래도 환경별로
// 갈아끼우기 쉽도록 .env로 뺐다.
// (진짜 비밀인 건 백엔드가 가진 서버 키 / 서비스 계정 쪽)
//
// 주의: public/firebase-messaging-sw.js(백그라운드 수신용 서비스워커)는
// 별도 스크립트라 import.meta.env를 읽지 못해서 같은 설정값을 하드코딩해
// 두었다. 설정이 바뀌면 그 파일도 같이 고쳐야 한다.
// ============================================================

import { initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const firebaseApp = initializeApp(firebaseConfig);

/**
 * messaging 인스턴스를 가져온다.
 *
 * getMessaging()을 그냥 부르면 지원하지 않는 환경(구형 브라우저,
 * iOS Safari에서 홈 화면에 추가하지 않은 상태, 시크릿 모드 등)에서
 * 예외가 터지면서 앱 전체가 죽을 수 있다. 그래서 isSupported()로
 * 먼저 확인하고, 안 되면 null을 반환해 호출부가 조용히 넘어가게 한다.
 *
 * @returns {Promise<import("firebase/messaging").Messaging | null>}
 */
export async function getMessagingIfSupported() {
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(firebaseApp);
  } catch {
    return null;
  }
}