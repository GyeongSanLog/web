import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Search from "./pages/Search";
import SpotDetail from "./pages/SpotDetail";
import Gallery from "./pages/Gallery";
import GroupDetail from "./pages/GroupDetail";
import Camera from "./pages/Camera";
import CameraResult from "./pages/CameraResult";
import MyPage from "./pages/MyPage";
import ProfileEdit from "./pages/ProfileEdit";
import PasswordChange from "./pages/PasswordChange";
import AccountDelete from "./pages/AccountDelete";
import EmptyStatePage, {
  BellIcon,
  ChatIcon,
  HeartOutlineIcon,
} from "./pages/EmptyStatePage";
import Map from "./pages/Map";
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
    <div className="h-screen w-full bg-[#e5e5ea] flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[430px] h-screen bg-white sm:h-[92vh] sm:my-4 sm:rounded-[2.5rem] sm:shadow-2xl sm:shadow-black/20 overflow-hidden relative flex flex-col">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <PhoneFrame>
        <div className="flex-1 min-h-0">
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/home" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/spots/:id" element={<SpotDetail />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/gallery/:groupId" element={<GroupDetail />} />
            <Route path="/camera" element={<Camera />} />
            <Route path="/camera/result" element={<CameraResult />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/profile" element={<ProfileEdit />} />
            <Route path="/password-reset" element={<PasswordChange />} />
            <Route path="/account/delete" element={<AccountDelete />} />
            <Route
              path="/favorites"
              element={
                <EmptyStatePage
                  title="찜 목록"
                  icon={HeartOutlineIcon}
                  description={{
                    headline: "아직 찜한 장소가 없어요",
                    body: "마음에 드는 장소를 찜하면\n이곳에서 모아볼 수 있어요",
                  }}
                />
              }
            />
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
          </Routes>
        </div>
      </PhoneFrame>
    </BrowserRouter>
  );
}