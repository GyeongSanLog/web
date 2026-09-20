import { useState, useEffect, useCallback, useRef } from "react";
import { NotificationsContext } from "./notifications-context";
import { onMessage, getToken } from "firebase/messaging";
import { getMessagingIfSupported, VAPID_KEY } from "../firebase";
import { updateFcmToken } from "../api/member";
import { getAccessToken, AUTH_CHANGED_EVENT } from "../api/client";
import {
  NOTIFICATIONS_KEY as STORAGE_KEY,
  FCM_TOKEN_CACHE_KEY as TOKEN_CACHE_KEY,
  NOTIFICATIONS_CLEARED_EVENT,
} from "../utils/notificationStorage";

// ============================================================
// 알림 상태 관리 + FCM 연결
//
// [알림 이력에 대해]
// 백엔드에 "지난 알림 목록"을 조회하는 API가 없다 (스웨거상
// PATCH /api/member/me/fcm-token으로 기기 토큰을 등록하는 것만 존재).
// 그래서 받은 알림을 localStorage에 직접 쌓아둔다. 즉:
//   - 이 기기의 이 브라우저에서 받은 알림만 남음
//   - 다른 기기로 로그인하면 그 기기의 이력은 안 보임
//   - 브라우저 저장공간을 지우면 사라짐
// 나중에 서버 이력 API가 생기면 이 파일의 저장 로직만 교체하면 되고,
// 컴포넌트 쪽은 안 건드려도 되도록 함수 인터페이스를 유지했다.
//
// [파일 구성]
//   - notifications-context.js : createContext 객체
//   - NotificationsContext.jsx: Provider (이 파일)
//   - useNotifications.js     : 화면에서 쓰는 훅
//   컴포넌트 파일에 컴포넌트 외의 export가 섞이면 Vite Fast Refresh가
//   동작하지 않아서(react-refresh/only-export-components) 셋으로 나눔.
//
// [수신 경로가 두 개인 이유]
//   - 포그라운드(앱 켜둔 상태): 이 파일의 onMessage. 브라우저가 알림을
//     자동으로 띄워주지 않으므로 직접 목록에 쌓는다.
//   - 백그라운드(탭 닫힘/다른 탭): public/firebase-messaging-sw.js
//     서비스워커가 처리해서 OS 알림을 띄운다.
// ============================================================

// 저장 키는 utils/notificationStorage.js에 있음 (로그아웃 시 api 레이어가 같은 키를 지워야 해서)
const MAX_STORED = 50; // 무한정 쌓이지 않게 최근 50개만 보관

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // 저장된 값이 깨져있으면 그냥 빈 목록으로 시작 (앱이 죽으면 안 되니까)
    return [];
  }
}

function saveToStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // 저장 실패(용량 초과 등)해도 화면 동작에는 지장 없으므로 조용히 무시
  }
}

/** 브라우저가 알림을 지원하는지 (iOS Safari 등에서 아예 없을 수 있음) */
function isNotificationSupported() {
  return typeof Notification !== "undefined";
}

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState(() => loadFromStorage());
  const [permission, setPermission] = useState(() =>
    isNotificationSupported() ? Notification.permission : "unsupported"
  );
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");

  // items가 바뀔 때마다 저장 (추가/읽음처리/삭제 전부 여기서 한 번에 반영됨)
  useEffect(() => {
    saveToStorage(items);
  }, [items]);

  // "이 세션에서 FCM 토큰을 서버에 보냈는지". 로그아웃하면 false로 되돌려서
  // 다음 사용자가 로그인했을 때 다시 등록하게 한다.
  const syncedRef = useRef(false);
  // 로그인/로그아웃이 일어날 때마다 1씩 올라감 → 토큰 동기화 effect를 다시 돌리는 트리거
  const [authVersion, setAuthVersion] = useState(0);

  // 로그아웃/회원탈퇴로 저장소가 비워지면 메모리 상태도 같이 비운다.
  // (api/auth.js·api/member.js의 clearNotificationStorage()가 이벤트를 쏨)
  // 로그인/재발급으로 토큰이 저장되면(setTokens) 동기화를 다시 시도한다.
  useEffect(() => {
    const onCleared = () => {
      setItems([]);
      syncedRef.current = false;
      setAuthVersion((v) => v + 1);
    };
    const onAuthChanged = () => setAuthVersion((v) => v + 1);

    window.addEventListener(NOTIFICATIONS_CLEARED_EVENT, onCleared);
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => {
      window.removeEventListener(NOTIFICATIONS_CLEARED_EVENT, onCleared);
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    };
  }, []);

  /**
   * 새 알림 추가.
   * FCM onMessage 콜백과, 나중에 서버 이력 동기화 쪽에서 공용으로 쓴다.
   */
  const addNotification = useCallback(({ title, body, data } = {}) => {
    const notification = {
      id: crypto.randomUUID(),
      title: title ?? "알림",
      body: body ?? "",
      data: data ?? null,
      read: false,
      receivedAt: new Date().toISOString(),
    };
    setItems((prev) => [notification, ...prev].slice(0, MAX_STORED));
  }, []);

  const markAsRead = useCallback((id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  /**
   * FCM 토큰을 발급받아 서버에 등록한다.
   * 이미 같은 토큰을 보낸 적이 있으면(localStorage에 캐시) 건너뛴다.
   */
  const syncTokenToServer = useCallback(async () => {
    const messaging = await getMessagingIfSupported();
    if (!messaging) return null;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return null;

    // 토큰은 갱신될 수 있으므로, 바뀌었을 때만 서버에 다시 보낸다
    if (localStorage.getItem(TOKEN_CACHE_KEY) !== token) {
      await updateFcmToken(token);
      localStorage.setItem(TOKEN_CACHE_KEY, token);
    }
    return token;
  }, []);

  /**
   * 사용자가 "알림 받기"를 눌렀을 때 호출.
   * 권한 요청은 사용자 제스처 안에서 부르는 게 브라우저 정책상 안전해서,
   * 자동 실행하지 않고 버튼에 연결해 두었다.
   */
  const enableNotifications = useCallback(async () => {
    setRegisterError("");

    if (!isNotificationSupported()) {
      setRegisterError("이 브라우저는 알림을 지원하지 않아요");
      return false;
    }

    setRegistering(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        setRegisterError(
          result === "denied"
            ? "알림이 차단되어 있어요. 브라우저 설정에서 허용해주세요."
            : "알림 권한이 필요해요"
        );
        return false;
      }

      await syncTokenToServer();
      return true;
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") {
        setRegisterError("로그인이 만료됐어요. 다시 로그인해주세요.");
      } else {
        setRegisterError(err.message || "알림 설정에 실패했어요");
      }
      return false;
    } finally {
      setRegistering(false);
    }
  }, [syncTokenToServer]);

  // 이미 권한이 허용된 상태로 앱에 들어오거나 로그인한 경우: 토큰을 조용히
  // 갱신/재등록한다. (토큰은 브라우저가 임의로 갱신할 수 있어서 확인이 필요함)
  // 로그인 전에는 authFetch가 실패하므로 accessToken이 있을 때만 시도하고,
  // 앱 시작 시엔 토큰이 없어 건너뛰더라도 authVersion이 바뀌면(로그인) 다시 돈다.
  useEffect(() => {
    if (syncedRef.current) return;
    if (permission !== "granted") return;
    if (!getAccessToken()) return;

    syncedRef.current = true;
    syncTokenToServer().catch(() => {
      // 조용히 실패해도 됨 — 사용자가 알림 화면에서 다시 시도할 수 있음
      syncedRef.current = false;
    });
  }, [permission, authVersion, syncTokenToServer]);

  // 포그라운드 수신 리스너. 앱이 켜져 있는 동안 도착한 푸시를 목록에 쌓는다.
  useEffect(() => {
    let unsubscribe;
    let cancelled = false;

    getMessagingIfSupported().then((messaging) => {
      if (!messaging || cancelled) return;

      unsubscribe = onMessage(messaging, (payload) => {
        addNotification({
          title: payload.notification?.title ?? payload.data?.title,
          body: payload.notification?.body ?? payload.data?.body,
          data: payload.data ?? null,
        });
      });
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [addNotification]);

  const unreadCount = items.filter((n) => !n.read).length;

  const value = {
    notifications: items,
    unreadCount,
    permission,
    registering,
    registerError,
    enableNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
