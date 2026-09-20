import { useContext } from "react";
import { NotificationsContext } from "./notifications-context";

/** 알림 상태/함수에 접근하는 훅. NotificationsProvider 안에서만 쓸 수 있다. */
export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications는 NotificationsProvider 안에서만 쓸 수 있습니다");
  }
  return ctx;
}
