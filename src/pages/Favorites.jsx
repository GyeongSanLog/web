// ============================================================
// 찜 목록 (GET /api/area/favorites)
//
// 그동안 /favorites 라우트는 EmptyStatePage로 "아직 찜한 장소가 없어요"를
// 고정으로 보여주고 있어서, 실제로 찜을 해도 목록이 비어 보였다.
// (fetchFavoriteAreas가 코드 어디에서도 호출되지 않는 상태였음)
//
// 응답이 Slice 형태({ content, page, size, hasNext })라서 한 번에 다 받지
// 않고 "더보기"로 이어 받는다. 카드의 하트를 누르면 같은 화면에서 바로
// 찜 해제(POST /api/area/{placeId}/favorite)까지 된다.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LeafMark } from "../components/SectionTitle";
import {
  AREA_TYPE_LABELS,
  fetchFavoriteAreas,
  toggleAreaFavorite,
} from "../api/areas";
import { categoryStyle } from "../utils/category";

const PAGE_SIZE = 20;

export default function Favorites() {
  const navigate = useNavigate();

  const [spots, setSpots] = useState([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const [loading, setLoading] = useState(true); // 첫 로드
  const [loadingMore, setLoadingMore] = useState(false); // 더보기
  const [error, setError] = useState("");

  // 해제 요청이 진행중인 placeId들 (연타 방지 + 버튼 비활성화)
  const [removing, setRemoving] = useState([]);

  /** 한 페이지를 받아 화면 상태에 반영. 첫 페이지면 교체, 아니면 뒤에 붙인다 */
  const applyPage = useCallback(
    async (nextPage) => {
      try {
        const res = await fetchFavoriteAreas({ page: nextPage, size: PAGE_SIZE });
        const content = res?.content ?? [];

        setSpots((prev) => (nextPage === 0 ? content : [...prev, ...content]));
        setHasNext(Boolean(res?.hasNext));
        setPage(nextPage);
        setError("");
      } catch (err) {
        if (err.message === "AUTH_EXPIRED") {
          navigate("/login");
          return;
        }
        console.error("찜 목록 조회 실패:", err);
        setError(err.message || "찜 목록을 불러오지 못했어요");
      }
    },
    [navigate]
  );

  useEffect(() => {
    let cancelled = false;

    // 상태 변경은 전부 await 이후에만 — 효과 본문에서 동기적으로 setState 하지 않는다
    (async () => {
      await applyPage(0);
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [applyPage]);

  async function handleLoadMore() {
    if (loadingMore || !hasNext) return;
    setLoadingMore(true);
    await applyPage(page + 1);
    setLoadingMore(false);
  }

  /** 카드의 하트 → 찜 해제. 목록에서 먼저 지우고, 실패하면 되돌린다 */
  async function handleUnfavorite(spot) {
    if (removing.includes(spot.id)) return;
    setRemoving((prev) => [...prev, spot.id]);

    try {
      const res = await toggleAreaFavorite(spot.id);
      // 토글이라 응답이 favorited: true로 올 수도 있다(이미 해제돼 있던 경우 등).
      // 그때는 목록에 그대로 둔다.
      if (res?.favorited === false) {
        setSpots((prev) => prev.filter((s) => s.id !== spot.id));
      }
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") {
        navigate("/login");
        return;
      }
      console.error("찜 해제 실패:", err);
      setError(err.message || "찜을 해제하지 못했어요");
    } finally {
      setRemoving((prev) => prev.filter((id) => id !== spot.id));
    }
  }

  return (
    <div className="relative h-full overflow-y-auto bg-[#FDFAF4] px-6 py-8">
      <div className="w-full max-w-sm mx-auto">

        <div className="flex items-center gap-3 mb-7">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-[#F6ECDD] border border-[#EBDCC4] flex items-center justify-center text-[#2A2420] gs-press"
            aria-label="뒤로가기"
          >
            <ArrowLeftIcon />
          </button>
          <p className="font-brand text-[19px] font-bold text-[#2A2420]">찜 목록</p>
          {!loading && spots.length > 0 && (
            <span className="text-[11px] text-[#8B4A26] bg-[#F6ECDD] border border-[#EBDCC4] rounded-full px-2 py-0.5">
              {spots.length}곳{hasNext ? "+" : ""}
            </span>
          )}
        </div>

        {error && (
          <p className="text-xs text-[#d70015] bg-[#FBECE9] rounded-xl px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <div className="w-full aspect-square rounded-2xl gs-skeleton mb-2" />
                <div className="w-2/3 h-3 rounded gs-skeleton" />
              </div>
            ))}
          </div>
        ) : spots.length === 0 ? (
          <EmptyFavorites onExplore={() => navigate("/search")} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 gs-stagger">
              {spots.map((spot) => (
                <FavoriteCard
                  key={spot.id}
                  spot={spot}
                  removing={removing.includes(spot.id)}
                  onOpen={() => navigate(`/spots/${spot.id}`)}
                  onUnfavorite={() => handleUnfavorite(spot)}
                />
              ))}
            </div>

            {hasNext && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full h-11 rounded-2xl bg-[#FFFCF6] border border-[#EBE0CE] text-sm text-[#8B4A26] font-medium mt-6 gs-press disabled:opacity-60"
              >
                {loadingMore ? "불러오는 중..." : "더보기"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FavoriteCard({ spot, removing, onOpen, onUnfavorite }) {
  const cat = categoryStyle(spot.category);

  return (
    <div className="relative">
      <button onClick={onOpen} className="text-left w-full gs-press">
        <div className="w-full aspect-square rounded-2xl bg-[#F6F0E4] border border-[#EBE0CE] flex items-center justify-center mb-2 overflow-hidden shadow-sm shadow-[#8B4A26]/5">
          {spot.imageUrl ? (
            <img
              src={spot.imageUrl}
              alt={spot.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-medium text-[#2A2420] truncate">
            {spot.name}
          </p>
          {spot.category && (
            <span
              className="shrink-0 text-[9.5px] rounded-full px-1.5 py-0.5"
              style={{ backgroundColor: cat.bg, color: cat.fg }}
            >
              {AREA_TYPE_LABELS[spot.category] ?? spot.category}
            </span>
          )}
        </div>
        <p className="text-[11px] text-[#8C8274] mt-0.5 truncate">{spot.address}</p>
      </button>

      {/* 썸네일 위 하트 - 누르면 그 자리에서 찜 해제 */}
      <button
        onClick={onUnfavorite}
        disabled={removing}
        aria-label={`${spot.name} 찜 해제`}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[#FFFCF6]/92 backdrop-blur shadow-sm shadow-black/10 flex items-center justify-center gs-press disabled:opacity-50"
      >
        <HeartFilledIcon />
      </button>
    </div>
  );
}

function EmptyFavorites({ onExplore }) {
  return (
    <div className="flex flex-col items-center pt-14 gs-rise">
      <div className="relative w-20 h-20 flex items-center justify-center mb-4">
        <span className="absolute inset-0 rounded-full bg-[#E8B769]/20 gs-float" />
        <span className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#FAEDD9] to-[#F0DFC2] border border-[#EBDCC4] flex items-center justify-center">
          <LeafMark color="#B04A46" size={26} />
        </span>
      </div>
      <p className="text-sm font-medium text-[#2A2420] mb-1.5">
        아직 찜한 장소가 없어요
      </p>
      <p className="text-xs text-[#8C8274] text-center leading-relaxed mb-5">
        마음에 드는 장소의 하트를 누르면
        <br />
        이곳에 모아볼 수 있어요
      </p>
      <button
        onClick={onExplore}
        className="h-10 px-5 rounded-full bg-[#8B4A26] text-white text-sm font-medium gs-press hover:bg-[#6B3618]"
      >
        관광지 둘러보기
      </button>
    </div>
  );
}

/* --- 아이콘 --- */

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 19l-7-7 7-7"
        stroke="#2A2420"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartFilledIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 20s-7-4.35-9.5-8.8C.7 7.8 2.6 4 6.2 4c2 0 3.4 1.1 4 2.4C10.8 5.1 12.2 4 14.2 4c3.6 0 5.5 3.8 3.7 7.2C19 15.65 12 20 12 20z"
        fill="#d70015"
        stroke="#d70015"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" stroke="#C6B9A4" strokeWidth="1.6" />
      <circle cx="8.3" cy="9.3" r="1.4" stroke="#C6B9A4" strokeWidth="1.4" />
      <path
        d="M5 17l4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 16m-1.5-1.5l1.3-1.3a1.5 1.5 0 0 1 2.1 0L19.5 16"
        stroke="#C6B9A4"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
