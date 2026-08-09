import BottomNav from "../components/BottomNav";
import AppHeader from "../components/AppHeader";

export default function MapPage() {
  return (
    <div className="h-full flex flex-col">
      <AppHeader />
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <p className="text-sm text-[#98989d]">지도 기능은 준비 중이에요</p>
      </div>
      <BottomNav />
    </div>
  );
}
