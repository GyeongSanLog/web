// ============================================================
// 알림 관련 localStorage 키와 정리 함수
//
// NotificationsContext(React)와 api/auth.js·api/member.js(비-React)가
// 같은 키를 써야 해서 여기로 뺌. api 레이어가 React 컨텍스트 파일을
// import하는 건 의존 방향이 어색하기도 하고, react-refresh 규칙에도
// 걸리기 때문.
//
// 로그아웃/회원탈퇴 시 반드시 clearNotificationStorage()를 호출해야 함:
//   - 안 지우면 같은 브라우저에서 다른 계정으로 로그인했을 때
//     이전 사용자의 알림 목록이 그대로 보임
//   - FCM 토큰 캐시가 남아 있으면 "이미 서버에 보낸 토큰"으로 판단해
//     PATCH /fcm-token을 건너뛰어, 새 사용자는 푸시를 못 받게 됨
// ============================================================

export const NOTIFICATIONS_KEY = "gyeongsanlog:notifications";
export const FCM_TOKEN_CACHE_KEY = "gyeongsanlog:fcmToken";

/**
 * NotificationsProvider가 이 이벤트를 듣고 메모리 상태(items)도 비운다.
 * localStorage만 지우면 React state에 남은 옛 목록이 계속 보이고,
 * 새 알림이 오는 순간 옛 목록까지 다시 저장돼 버리기 때문.
 */
export const NOTIFICATIONS_CLEARED_EVENT = "gyeongsanlog:notifications-cleared";

export function clearNotificationStorage() {
  try {
    localStorage.removeItem(NOTIFICATIONS_KEY);
    localStorage.removeItem(FCM_TOKEN_CACHE_KEY);
  } catch {
    // 스토리지 접근이 막힌 환경이어도 로그아웃 흐름은 계속 진행
  }
  window.dispatchEvent(new Event(NOTIFICATIONS_CLEARED_EVENT));
}