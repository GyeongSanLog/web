import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MapPage from "./pages/Map";

// 데스크톱에서도 항상 "휴대폰 화면 하나"처럼 보이게 감싸는 틀
function PhoneFrame({ children }) {
  return (
    <div className="min-h-screen w-full bg-[#e5e5ea] flex items-center justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-white sm:min-h-0 sm:h-[92vh] sm:my-4 sm:rounded-[2.5rem] sm:shadow-2xl sm:shadow-black/20 overflow-y-auto relative">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <PhoneFrame>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/map" element={<MapPage />} />
        </Routes>
      </PhoneFrame>
    </BrowserRouter>
  );
}
