import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import AppHeader from "../components/AppHeader";
import { fetchGallery, joinGroupByInviteCode } from "../api/groups";

export default function Gallery() {
  const navigate = useNavigate();
  const [ongoing, setOngoing] = useState(null);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const [showNoGroupModal, setShowNoGroupModal] = useState(false);

  function loadGallery() {
    setLoading(true);
    fetchGallery()
      .then((res) => {
        setOngoing(res.ongoing);
        setPast(res.past);
      })
      .catch((err) => {
        if (err.message === "AUTH_EXPIRED") {
          navigate("/login");
          return;
        }
        console.error("갤러리 로드 실패:", err);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadGallery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleJoin() {
    const code = inviteCode.trim();
    if (!code) {
      setJoinError("초대코드를 입력해주세요");
      return;
    }
    setJoining(true);
    setJoinError("");
    try {
      await joinGroupByInviteCode(code);
      setShowJoinModal(false);
      setInviteCode("");
      loadGallery(); // 참여 성공 후 목록에 반영되도록 갤러리 새로고침
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") {
        navigate("/login");
        return;
      }
      setJoinError(err.message || "참여에 실패했어요");
    } finally {
      setJoining(false);
    }
  }

  const groupedPast = groupByMonth(past);

  return (
    <div className="h-full flex flex-col relative">
      <AppHeader />

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-28">

        <div className="flex items-center justify-between mb-5">
          <p className="text-lg font-medium text-[#1c1c1e]">갤러리</p>
          <button
            onClick={() => {
              setJoinError("");
              setShowJoinModal(true);
            }}
            className="text-xs text-[#6F4A2C] font-medium"
          >
            초대코드로 참여하기
          </button>
        </div>

        {loading ? (
          <GallerySkeleton />
        ) : (
          <>
            <p className="text-xs text-[#98989d] mb-2.5">진행중인 log</p>
            <div className="flex gap-2.5 mb-7">
              {ongoing ? (
                <button
                  onClick={() => navigate(`/gallery/${ongoing.id}`)}
                  className="w-[130px] h-[130px] rounded-2xl bg-[#1c1c1e] border-[1.5px] border-[#6F4A2C] relative flex items-end p-2.5 text-left overflow-hidden shrink-0"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="relative">
                    <p className="text-[13px] font-medium text-white leading-tight">
                      {ongoing.name}
                    </p>
                    <p className="text-[11px] text-white/75 mt-0.5">
                      {formatShortDate(ongoing.startAt)} ~ {formatShortDate(ongoing.endAt)}
                    </p>
                  </div>
                </button>
              ) : null}

              <button
                onClick={() => {
                  if (ongoing) {
                    navigate(`/camera/${ongoing.id}`);
                  } else {
                    // 진행중인 그룹이 없으면 BottomNav의 +버튼과 동일하게
                    // 그룹 생성 여부를 먼저 물어봄 (groupId 없이 바로 /camera로
                    // 보내면 라우트가 안 맞아 빈 화면이 뜨는 버그가 있었음)
                    setShowNoGroupModal(true);
                  }
                }}
                className="w-[130px] h-[130px] rounded-2xl bg-[#f5f5f7] border border-dashed border-[#c7c7cc] flex flex-col items-center justify-center gap-1.5 shrink-0"
              >
                <PlusIcon />
                <span className="text-[11px] text-[#98989d] text-center leading-tight px-2">
                  {ongoing ? "새 여행\n그룹 만들기" : "진행중인 여행이\n없으면\n그룹 만들기"}
                </span>
              </button>
            </div>

            <div className="h-px bg-[#e5e5ea] mb-6" />

            {groupedPast.length === 0 ? (
              <p className="text-sm text-[#98989d] text-center py-10">
                지난 여행 기록이 아직 없어요
              </p>
            ) : (
              groupedPast.map(({ month, items }) => (
                <div key={month} className="mb-6">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs text-[#98989d]">날짜 {month}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {items.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => navigate(`/gallery/${g.id}`)}
                        className="aspect-square rounded-xl bg-[#f5f5f7] relative flex items-center justify-center overflow-hidden text-left"
                      >
                        <PhotoPlaceholderIcon />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                        <p className="absolute bottom-2 left-2.5 text-[11px] text-white font-medium">
                          {g.name}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}

      </div>

      {/* 초대코드 참여 모달 */}
      {showJoinModal && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center px-8 z-20">
          <div className="w-full bg-white rounded-2xl p-5">
            <p className="text-[15px] font-medium text-[#1c1c1e] mb-1.5">
              초대코드로 참여하기
            </p>
            <p className="text-[13px] text-[#6e6e73] mb-4">
              친구에게 받은 초대코드를 입력해주세요
            </p>
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="초대코드 입력"
              autoFocus
              className="w-full h-11 rounded-xl bg-[#f5f5f7] border border-[#e5e5ea] px-3.5 text-sm text-[#1c1c1e] outline-none focus:border-[#6F4A2C] mb-1.5"
            />
            {joinError && (
              <p className="text-xs text-[#d70015] mb-2">{joinError}</p>
            )}
            <div className="flex gap-2.5 mt-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setInviteCode("");
                  setJoinError("");
                }}
                disabled={joining}
                className="flex-1 h-11 rounded-xl bg-[#f5f5f7] text-[14px] text-[#1c1c1e] font-medium disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleJoin}
                disabled={joining || !inviteCode.trim()}
                className="flex-1 h-11 rounded-xl bg-[#6F4A2C] text-[14px] text-white font-medium disabled:opacity-50"
              >
                {joining ? "참여 중..." : "참여하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 진행중인 여행이 없을 때: 새 그룹 생성 확인 모달 (BottomNav의 +버튼과 동일한 흐름) */}
      {showNoGroupModal && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-8">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowNoGroupModal(false)}
          />
          <div className="relative bg-white rounded-2xl px-6 py-6 w-full max-w-[280px] text-center shadow-xl">
            <p className="text-sm font-medium text-[#1c1c1e] mb-1.5">
              진행 중인 여행이 없어요
            </p>
            <p className="text-xs text-[#6e6e73] leading-relaxed mb-5">
              새로운 여행 그룹을 만들까요?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNoGroupModal(false)}
                className="flex-1 h-10 rounded-xl bg-[#f5f5f7] text-[#1c1c1e] text-sm"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowNoGroupModal(false);
                  navigate("/gallery/new");
                }}
                className="flex-1 h-10 rounded-xl bg-[#6F4A2C] text-white text-sm font-medium"
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function GallerySkeleton() {
  return (
    <>
      <div className="flex gap-2.5 mb-7">
        <div className="w-[130px] h-[130px] rounded-2xl bg-[#f5f5f7] animate-pulse" />
        <div className="w-[130px] h-[130px] rounded-2xl bg-[#f5f5f7] animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-square rounded-xl bg-[#f5f5f7] animate-pulse" />
        ))}
      </div>
    </>
  );
}

function groupByMonth(groups) {
  const map = {};
  groups.forEach((g) => {
    const d = new Date(g.startAt);
    const key = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map[key]) map[key] = [];
    map[key].push(g);
  });
  return Object.entries(map)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([month, items]) => ({ month, items }));
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

/* --- 아이콘 --- */

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="#98989d" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PhotoPlaceholderIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" stroke="#d4d4d8" strokeWidth="1.6" />
      <circle cx="8.3" cy="9.3" r="1.4" stroke="#d4d4d8" strokeWidth="1.4" />
      <path d="M5 17l4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 16m-1.5-1.5l1.3-1.3a1.5 1.5 0 0 1 2.1 0L19.5 16" stroke="#d4d4d8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}