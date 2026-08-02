import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Search from "./pages/Search";
import SpotDetail from "./pages/SpotDetail";
import Gallery from "./pages/Gallery";
import GroupDetail from "./pages/GroupDetail";

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
          </Routes>
        </div>
      </PhoneFrame>
    </BrowserRouter>
  );
}