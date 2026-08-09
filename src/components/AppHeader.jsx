import { useNavigate } from "react-router-dom";
import Logo from "./Logo";

export default function AppHeader({ right = null }) {
  const navigate = useNavigate();

  return (
    <header className="shrink-0 h-14 px-5 mt-8 flex items-center justify-between border-b border-[#f0f0f2] bg-white">
      <button
        onClick={() => navigate("/home")}
        className="flex items-center gap-2"
        aria-label="경산로그 홈으로"
      >
        <Logo size={24} />
        <span className="text-[15px] font-semibold tracking-tight text-[#6F4A2C]">
          경산로그
        </span>
      </button>
      {right}
    </header>
  );
}
