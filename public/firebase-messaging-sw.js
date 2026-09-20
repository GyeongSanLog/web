// ============================================================
// FCM 백그라운드 수신용 서비스워커
//
// 이 파일은 반드시 public/ 폴더에 있어야 한다.
// Vite는 public/의 파일을 루트 경로로 그대로 서빙하므로
// 브라우저가 /firebase-messaging-sw.js 로 접근할 수 있고,
// Firebase SDK는 기본적으로 정확히 이 경로/파일명을 찾는다.
// (이름을 바꾸면 getToken 시 serviceWorkerRegistration을 직접 넘겨야 함)
//
// 앱 탭이 닫혀 있거나 다른 탭을 보고 있을 때 도착한 푸시는 여기서 처리된다.
// 앱이 켜져 있을 때(포그라운드)는 이 파일이 아니라
// src/context/NotificationsContext.jsx의 onMessage 쪽이 처리한다.
//
// 주의: 서비스워커는 일반 모듈이 아니라서 import.meta.env를 못 읽는다.
// 그래서 src/firebase.js와 같은 설정값을 여기에 하드코딩해 뒀다.
// 설정이 바뀌면 두 파일을 같이 고쳐야 한다.
// (모두 클라이언트에 공개되는 값이라 노출 자체는 문제없음)
//
// SDK 버전은 package.json의 firebase 버전과 맞추는 게 좋다.
// ============================================================

/* global importScripts, firebase */

importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDeclbx97p4raCpFPhyx7tfPpqtCj7K4uQ",
  authDomain: "gyeongsanlog.firebaseapp.com",
  projectId: "gyeongsanlog",
  storageBucket: "gyeongsanlog.firebasestorage.app",
  messagingSenderId: "975290076867",
  appId: "1:975290076867:web:40debe694af6f78b729c76",
});

const messaging = firebase.messaging();

/**
 * 백그라운드 수신 처리.
 *
 * 참고: 백엔드가 푸시를 보낼 때 payload에 `notification` 필드를 포함하면
 * 브라우저가 알림을 자동으로 띄우기 때문에, 이 핸들러까지 같이 돌면
 * 알림이 두 번 뜰 수 있다. 그 경우 백엔드에 `data`만 담아 보내달라고
 * 요청하거나, 아래 핸들러를 비우면 된다.
 */
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? payload.data?.title ?? "경산로그";
  const options = {
    body: payload.notification?.body ?? payload.data?.body ?? "",
    icon: "/logo192.png", // 없으면 브라우저 기본 아이콘이 쓰임
    data: payload.data ?? {},
  };

  self.registration.showNotification(title, options);
});

/**
 * 알림을 클릭하면 앱을 연다.
 * 이미 열린 탭이 있으면 그 탭으로 포커스를 옮기고, 없으면 새로 연다.
 *
 * 이동 경로는 아직 미정이라 일단 /notifications로 보낸다.
 * 나중에 payload.data에 groupId 등이 들어오면 여기서 분기하면 됨.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetPath = "/notifications";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetPath);
        }
      })
  );
});