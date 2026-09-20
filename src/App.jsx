import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { NotificationsProvider } from "./context/NotificationsContext";
import { getAccessToken } from "./api/client";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Search from "./pages/Search";
import SpotDetail from "./pages/SpotDetail";
import Gallery from "./pages/Gallery";
import GroupDetail from "./pages/GroupDetail";
import GroupNew from "./pages/GroupNew";
import Camera from "./pages/Camera";
import CameraResult from "./pages/CameraResult";
import MyPage from "./pages/MyPage";
import ProfileEdit from "./pages/ProfileEdit";
import PasswordChange from "./pages/PasswordChange";
import AccountDelete from "./pages/AccountDelete";
import OauthKakao from "./pages/OauthKakao";
import EmptyStatePage, { BellIcon, ChatIcon } from "./pages/EmptyStatePage";
import Favorites from "./pages/Favorites";
import Map from "./pages/Map";
import Notifications from "./pages/Notifications";
// import SetlogViewer from "./pages/SetlogViewer";
// ↑ 분할화면 뷰어는 보류 상태. 촬영 흐름은 당분간 팀원 버전(Camera → CameraResult,
// groupId 없이 개별 멤버 선택 + 편지 방식)으로 통일. 파일은 남겨뒀으니
// 다시 쓰기로 하면 이 줄과 아래 <Route path="/setlog/:groupId" .../> 주석만 풀면 됨.

// 데스크톱에서도 항상 "휴대폰 화면 하나"처럼 보이게 감싸는 틀
//
// 중요: 이 프레임 자체는 스크롤하지 않습니다 (overflow-hidden).
// 스크롤은 각 페이지 내부의 콘텐츠 영역이 담당하며,
// 그래야 하단 네비바가 스크롤과 무관하게 고정됩니다.
function PhoneFrame({ children }) {
  return (
    <div className="h-screen w-full bg-gradient-to-b from-[#DBE3D5] via-[#E9E0D0] to-[#E0D4C0] gs-paper flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[430px] h-screen bg-[#FDFAF4] sm:h-[92vh] sm:my-4 sm:rounded-[2.5rem] sm:shadow-2xl sm:shadow-[#4B3A28]/25 overflow-hidden relative flex flex-col">
        {children}
      </div>
    </div>
  );
}

/**
 * 앱 첫 진입(/) 처리.
 * 예전엔 무조건 /login으로 보내서, 이미 로그인된 사용자도 앱을 열 때마다
 * 로그인 화면을 거쳐야 했음. 토큰이 있으면 홈으로 바로 보낸다.
 * (토큰이 만료돼 있어도 첫 API 호출에서 AUTH_EXPIRED로 /login에 가므로 안전)
 */
function RootRedirect() {
  return <Navigate to={getAccessToken() ? "/home" : "/login"} replace />;
}

/**
 * URL 파라미터가 바뀌면(예: 추천 카드로 다른 관광지로 이동) 컴포넌트를
 * 새로 마운트시키는 래퍼. key가 바뀌면 React가 내부 state를 전부 초기화하므로
 * 페이지 안에서 effect로 loading/error를 수동 리셋할 필요가 없어진다.
 */
function SpotDetailRoute() {
  const { id } = useParams();
  return <SpotDetail key={id} />;
}

function GroupDetailRoute() {
  const { groupId } = useParams();
  return <GroupDetail key={groupId} />;
}

export default function App() {
  return (
    // 알림(읽음 여부, 뱃지 카운트)은 홈 헤더의 종 아이콘과 /notifications
    // 화면이 같은 상태를 공유해야 해서 라우터 바깥, 앱 전역에 Provider를 둠.
    <NotificationsProvider>
      <BrowserRouter>
        <PhoneFrame>
          <div className="flex-1 min-h-0">
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/home" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/spots/:id" element={<SpotDetailRoute />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/gallery/:groupId" element={<GroupDetailRoute />} />
              <Route path="/gallery/new" element={<GroupNew />} />
              <Route path="/camera/:groupId" element={<Camera />} />
              <Route path="/camera/:groupId/result" element={<CameraResult />} />
              <Route path="/mypage" element={<MyPage />} />
              <Route path="/profile" element={<ProfileEdit />} />
              <Route path="/password-reset" element={<PasswordChange />} />
              <Route path="/account/delete" element={<AccountDelete />} />
              <Route path="/oauth/kakao" element={<OauthKakao />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route
                path="/support/contact"
                element={
                  <EmptyStatePage
                    title="문의사항"
                    icon={ChatIcon}
                    description={{
                      headline: "문의 기능을 준비하고 있어요",
                      body: "빠른 시일 내에\n더 편하게 문의드릴 수 있게 할게요",
                    }}
                  />
                }
              />
              <Route
                path="/support/notice"
                element={
                  <EmptyStatePage
                    title="공지사항"
                    icon={BellIcon}
                    description={{
                      headline: "아직 등록된 공지사항이 없어요",
                      body: "새로운 소식이 있으면\n가장 먼저 알려드릴게요",
                    }}
                  />
                }
              />
              <Route path="/map" element={<Map />} />
              {/* <Route path="/setlog/:groupId" element={<SetlogViewer />} /> */}

              {/* 없는 주소 — 예전엔 아무 라우트에도 안 걸려서 흰 화면이 떴음 */}
              <Route
                path="*"
                element={
                  <EmptyStatePage
                    title="페이지를 찾을 수 없어요"
                    icon={BellIcon}
                    description={{
                      headline: "주소가 잘못됐거나 사라진 페이지예요",
                      body: "홈으로 돌아가서\n다시 찾아보세요",
                    }}
                    backTo="/home"
                  />
                }
              />
            </Routes>
          </div>
        </PhoneFrame>
      </BrowserRouter>
    </NotificationsProvider>
  );
}