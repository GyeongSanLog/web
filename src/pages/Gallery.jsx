import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import AppHeader from "../components/AppHeader";
import SectionTitle, { LeafMark } from "../components/SectionTitle";
import { fetchGallery, joinGroupByInviteCode } from "../api/groups";

/**
 * 지난 여행 타일에 아직 대표 사진이 없을 때 쓰는 배경.
 * 전부 같은 회색이라 갤러리가 텅 비어 보이던 걸, 계절색을 번갈아 깔아
 * "기록이 쌓여 있는" 느낌으로 바꿨다.
 */
const TILE_SCENES = [
  "linear-gradient(150deg, #DCE7D6, #9DB894)",
  "linear-gradient(150deg, #F4E3C6, #D8B681)",
  "linear-gradient(150deg, #F1DDD5, #CDA08C)",
  "linear-gradient(150deg, #DBE7EA, #9BB7BF)",
];

export default function Gallery() {
  const navigate = useNavigate();
  const [ongoing, setOngoing] = useState(null);
  const [upcoming, setUpcoming] = useState([]); // 아직 시작 전인 여행
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  function loadGallery() {
    setLoading(true);
    fetchGallery()
      .then((res) => {
        setOngoing(res.ongoing);
        setUpcoming(res.upcoming ?? []);
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
    <div className="h-full flex flex-col relative bg-[#FDFAF4]">
      <AppHeader />

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-28">

        <SectionTitle
          className="mb-5"
          tone="#4B6B4E"
          action={
            <button
              onClick={() => {
                setJoinError("");
                setShowJoinModal(true);
              }}
              className="text-xs text-[#8B4A26] font-medium rounded-full bg-[#F6ECDD] border border-[#EBDCC4] px-3 py-1.5 gs-press"
            >
              초대코드로 참여하기
            </button>
          }
        >
          갤러리
        </SectionTitle>

        {loading ? (
          <GallerySkeleton />
        ) : (
          <>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B04A46] animate-pulse" />
              <p className="text-xs text-[#6B6156] font-medium">진행중인 log</p>
            </div>
            <div className="flex gap-2.5 mb-7 gs-stagger">
              {ongoing ? (
                <button
                  onClick={() => navigate(`/gallery/${ongoing.id}`)}
                  className="w-[130px] h-[130px] rounded-2xl bg-gradient-to-br from-[#4B6B4E] to-[#2C4330] border-[1.5px] border-[#8B4A26] relative flex items-end p-2.5 text-left overflow-hidden shrink-0 gs-press shadow-sm shadow-[#2C4330]/25"
                >
                  {/* 그룹 생성 시 올린 썸네일이 있으면 그걸, 없으면 능선+저녁 해 장식을 깐다 */}
                  {ongoing.imageUrl ? (
                    <img
                      src={ongoing.imageUrl}
                      alt={ongoing.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 130 130" fill="none" aria-hidden="true">
                      <path d="M0 96l24-22 20 14 26-26 26 20 34-16v64H0z" fill="#ffffff" fillOpacity="0.13" />
                      <circle cx="100" cy="28" r="8" fill="#E8B769" fillOpacity="0.45" />
                    </svg>
                  )}
                  <span className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-[#E8B769] px-2 py-0.5 z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7A5312] animate-pulse" />
                    <span className="text-[9.5px] font-bold text-[#5C4433]">기록중</span>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
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
                onClick={() => navigate("/gallery/new")}
                className="w-[130px] h-[130px] rounded-2xl bg-[#F8F3E9] border border-dashed border-[#D2C2A6] flex flex-col items-center justify-center gap-1.5 shrink-0 gs-press hover:bg-[#F4EDDF] hover:border-[#B99C74]"
              >
                <span className="w-9 h-9 rounded-full bg-[#F6ECDD] flex items-center justify-center">
                  <PlusIcon />
                </span>
                <span className="text-[11px] text-[#6B6156] text-center leading-tight px-2">
                  {ongoing ? "새 여행\n그룹 만들기" : "진행중인 여행이\n없으면\n그룹 만들기"}
                </span>
              </button>
            </div>

            {/* 예정된 여행 - 아직 시작 전이라 촬영도 조회도 안 되지만,
                초대코드 공유 등을 위해 상세 진입은 가능하게 둔다 */}
            {upcoming.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E8B769]" />
                  <p className="text-xs text-[#6B6156] font-medium">예정된 여행</p>
                </div>
                <div className="flex flex-col gap-2 mb-7 gs-stagger">
                  {upcoming.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => navigate(`/gallery/${g.id}`)}
                      className="flex items-center gap-3 rounded-2xl bg-[#FFFCF6] border border-[#EBE0CE] px-3.5 py-3 text-left gs-press hover:bg-[#FBF5EA]"
                    >
                      <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-[#F6ECDD] flex items-center justify-center">
                        {g.imageUrl ? (
                          <img src={g.imageUrl} alt={g.name} className="w-full h-full object-cover" />
                        ) : (
                          <CalendarIcon />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#2A2420] truncate">{g.name}</p>
                        <p className="text-[11px] text-[#8C8274] mt-0.5">
                          {formatShortDate(g.startAt)} ~ {formatShortDate(g.endAt)} · {daysUntil(g.startAt)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="h-px bg-gradient-to-r from-transparent via-[#DCCFB6] to-transparent mb-6" />

            {groupedPast.length === 0 ? (
              <div className="flex flex-col items-center py-12 gs-rise">
                <div className="w-14 h-14 rounded-full bg-[#E8F0E6] flex items-center justify-center mb-3 gs-float">
                  <LeafMark color="#4B6B4E" size={24} />
                </div>
                <p className="text-sm text-[#2A2420] mb-1">지난 여행 기록이 아직 없어요</p>
                <p className="text-xs text-[#8C8274] text-center leading-relaxed">
                  여행 그룹을 만들고 순간을 담으면
                  <br />
                  여기에 차곡차곡 쌓여요
                </p>
              </div>
            ) : (
              groupedPast.map(({ month, items }) => (
                <div key={month} className="mb-6">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs text-[#6B6156] font-medium rounded-full bg-[#F4EFE6] px-2.5 py-1">
                      {month}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 gs-stagger">
                    {items.map((g, i) => (
                      <button
                        key={g.id}
                        onClick={() => navigate(`/gallery/${g.id}`)}
                        className="aspect-square rounded-xl relative flex items-center justify-center overflow-hidden text-left gs-press shadow-sm shadow-[#8B4A26]/10"
                        style={
                          g.imageUrl
                            ? undefined
                            : { backgroundImage: TILE_SCENES[i % TILE_SCENES.length] }
                        }
                      >
                        {/* 그룹 썸네일이 있으면 표시 — 예전엔 imageUrl을 아예 안 읽어서
                            업로드한 사진이 갤러리 어디에도 안 보였음 */}
                        {g.imageUrl ? (
                          <img
                            src={g.imageUrl}
                            alt={g.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <PhotoPlaceholderIcon />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                        <p className="absolute bottom-2 left-2.5 text-[11px] text-white font-medium drop-shadow">
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
        <div className="absolute inset-0 bg-[#2A1A0C]/45 flex items-center justify-center px-8 z-20 gs-fade-in">
          <div className="w-full bg-[#FFFCF6] border border-[#EBE0CE] rounded-2xl p-5 gs-scale-in">
            <p className="text-[15px] font-medium text-[#2A2420] mb-1.5">
              초대코드로 참여하기
            </p>
            <p className="text-[13px] text-[#6B6156] mb-4">
              친구에게 받은 초대코드를 입력해주세요
            </p>
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="초대코드 입력"
              autoFocus
              className="w-full h-11 rounded-xl bg-[#F4EFE6] border border-[#E6DDCD] px-3.5 text-sm text-[#2A2420] outline-none focus:border-[#8B4A26] mb-1.5"
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
                className="flex-1 h-11 rounded-xl bg-[#F4EFE6] text-[14px] text-[#2A2420] font-medium gs-press disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleJoin}
                disabled={joining || !inviteCode.trim()}
                className="flex-1 h-11 rounded-xl bg-[#8B4A26] text-[14px] text-white font-medium gs-press hover:bg-[#6B3618] disabled:opacity-50"
              >
                {joining ? "참여 중..." : "참여하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/*
        진행중인 여행이 없을 때: 새 그룹 생성 확인 모달 (BottomNav의 +버튼과 동일한 흐름)
        현재 이 화면의 "새 여행 그룹 만들기" 버튼은 항상 /gallery/new로 바로
        이동하도록 바뀌어서(더 이상 촬영 화면으로 가지 않음) 이 모달을 띄우는
        지점이 없어짐. BottomNav.jsx의 +버튼 로직은 그대로 이 패턴을 쓰고
        있으니, 여기서도 다시 필요해지면 아래 주석을 풀고 showNoGroupModal을
        true로 설정하는 트리거만 추가하면 됨.

      {showNoGroupModal && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-8">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowNoGroupModal(false)}
          />
          <div className="relative bg-white rounded-2xl px-6 py-6 w-full max-w-[280px] text-center shadow-xl">
            <p className="text-sm font-medium text-[#2A2420] mb-1.5">
              진행 중인 여행이 없어요
            </p>
            <p className="text-xs text-[#6B6156] leading-relaxed mb-5">
              새로운 여행 그룹을 만들까요?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNoGroupModal(false)}
                className="flex-1 h-10 rounded-xl bg-[#F4EFE6] text-[#2A2420] text-sm"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowNoGroupModal(false);
                  navigate("/gallery/new");
                }}
                className="flex-1 h-10 rounded-xl bg-[#8B4A26] text-white text-sm font-medium gs-press"
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}
      */}

      <BottomNav />
    </div>
  );
}

function GallerySkeleton() {
  return (
    <>
      <div className="flex gap-2.5 mb-7">
        <div className="w-[130px] h-[130px] rounded-2xl gs-skeleton" />
        <div className="w-[130px] h-[130px] rounded-2xl gs-skeleton" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-square rounded-xl gs-skeleton" />
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

/** 시작일까지 남은 날 — "내일 시작" / "3일 후 시작" */
function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const days = Math.round((start - today) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "곧 시작";
  if (days === 1) return "내일 시작";
  return `${days}일 후 시작`;
}

/* --- 아이콘 --- */

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="#8C8274" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PhotoPlaceholderIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.6" />
      <circle cx="8.3" cy="9.3" r="1.4" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.4" />
      <path d="M5 17l4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 16m-1.5-1.5l1.3-1.3a1.5 1.5 0 0 1 2.1 0L19.5 16" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" stroke="#8B4A26" strokeWidth="1.7" />
      <path d="M3.5 10h17" stroke="#8B4A26" strokeWidth="1.7" />
      <path d="M8 3.5v4M16 3.5v4" stroke="#8B4A26" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}