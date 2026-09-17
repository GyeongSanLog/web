import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useNotifications } from "../context/NotificationsContext";

/**
 * 알림 화면.
 *
 * 주의: 백엔드에 알림 이력 조회 API가 없어서(스웨거에는 FCM 토큰 등록
 * 엔드포인트만 있음), 여기 보이는 목록은 이 브라우저가 그동안 받은
 * 알림을 로컬에 쌓아둔 것임 (NotificationsContext 참고).
 *
 * 알림 클릭 시 이동 동작은 아직 미정이라 일단 읽음 처리만 함.
 */
export default function Notifications() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    permission,
    registering,
    registerError,
    enableNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // 아직 허용 전이면 상단에 안내 배너를 띄운다.
  // (권한 요청은 브라우저 정책상 사용자가 직접 누를 때 하는 게 안전함)
  const showPermissionBanner = permission === "default" || permission === "denied";

  return (
    <div className="h-full flex flex-col bg-[#FDFAF4]">
      <AppHeader
        right={
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-[#F6ECDD] border border-[#EBDCC4] flex items-center justify-center shrink-0 gs-press"
            aria-label="닫기"
          >
            <CloseIcon />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-10">
        <div className="flex items-center justify-between py-4">
          <h1 className="text-[17px] font-bold text-[#2A2420]">알림</h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-[#8B4A26] font-medium gs-press"
            >
              모두 읽음 처리
            </button>
          )}
        </div>

        {showPermissionBanner && (
          <div className="bg-gradient-to-r from-[#F8EEDC] to-[#F3E5CC] border border-[#EBDCC4] rounded-2xl p-4 mb-5 gs-rise">
            <p className="text-[13px] font-medium text-[#2A2420] mb-1">
              알림을 받아보시겠어요?
            </p>
            <p className="text-[11px] text-[#6B6156] mb-3 leading-relaxed">
              함께 여행 중인 친구들의 소식을{"\n"}바로 받아볼 수 있어요
            </p>

            {registerError && (
              <p className="text-[11px] text-[#d70015] mb-2">{registerError}</p>
            )}

            <button
              onClick={enableNotifications}
              disabled={registering || permission === "denied"}
              className="h-9 px-4 rounded-full bg-[#8B4A26] text-white text-xs font-medium gs-press disabled:opacity-50"
            >
              {registering ? "설정하는 중..." : "알림 받기"}
            </button>
          </div>
        )}

        {permission === "unsupported" && (
          <p className="text-[11px] text-[#8C8274] mb-5 px-1">
            이 브라우저에서는 알림을 지원하지 않아요.
          </p>
        )}

        {notifications.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gs-stagger">
            {notifications.map((n, i) => (
              <button
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`text-left py-3.5 flex gap-3 gs-press ${
                  i !== notifications.length - 1 ? "border-b border-[#EFE7D9]" : ""
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                  style={{ backgroundColor: n.read ? "transparent" : "#B04A46" }}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm truncate ${
                      n.read ? "text-[#6E6E73]" : "text-[#2A2420] font-medium"
                    }`}
                  >
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-[#8C8274] mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-[10.5px] text-[#A99B86] mt-1">
                    {formatRelativeTime(n.receivedAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gs-rise">
      <div className="w-14 h-14 rounded-full bg-[#F6ECDD] flex items-center justify-center mb-3 gs-float">
        <BellIcon />
      </div>
      <p className="text-sm text-[#2A2420] mb-1">아직 알림이 없어요</p>
      <p className="text-xs text-[#8C8274]">
        새로운 소식이 도착하면{"\n"}여기에서 확인할 수 있어요
      </p>
    </div>
  );
}

/** "3분 전" / "2시간 전" / "5일 전" 처럼 대략적인 상대 시간으로 표시 */
function formatRelativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const d = new Date(isoString);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

/* --- 아이콘 --- */

function BellIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z"
        fill="#E8B769"
        fillOpacity="0.35"
        stroke="#8B4A26"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 18.5a2 2 0 0 0 4 0" stroke="#8B4A26" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="#2A2420" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}