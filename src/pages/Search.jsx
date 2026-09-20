import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SectionTitle, { LeafMark } from "../components/SectionTitle";
import { AREA_TYPES, AREA_TYPE_LABELS, searchAreas } from "../api/areas";
import { categoryStyle } from "../utils/category";

// 백엔드에 키워드 검색 API(GET /api/area/search)가 생겨서,
// "전체 목록 200개를 미리 받아두고 프론트에서 filter" 하던 임시 방식은 폐기함.
// 이제 검색어/카테고리가 바뀔 때마다 서버에 물어보고,
// 응답의 hasNext를 이용해 스크롤이 바닥에 닿으면 다음 페이지를 이어 붙인다.
const PAGE_SIZE = 20;

// 타이핑할 때마다 요청을 보내면 서버가 과부하 + 응답 순서가 뒤엉킨다.
// 마지막 입력 후 300ms 동안 조용하면 그때 한 번만 보낸다.
const DEBOUNCE_MS = 300;

export default function Search() {
  const navigate = useNavigate();

  // 입력창에 보이는 값(즉시 반영) / 실제로 서버에 보낼 값(디바운스됨)을 분리
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedType, setSelectedType] = useState(null); // enum 값 또는 null

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false); // 다음 페이지 로딩
  const [error, setError] = useState("");
  // "어떤 검색 조건의 결과까지 화면에 반영됐는지". 현재 조건과 다르면 로딩 중인 것.
  // loading을 별도 state로 두고 effect에서 setLoading(true)를 부르는 대신,
  // 이렇게 파생시키면 effect 안에서 동기 setState를 할 필요가 없다.
  const [resolvedKey, setResolvedKey] = useState(null);
  // "다시 시도"용 카운터. 검색 키에 섞여 들어가서, 같은 조건이라도 값이 바뀌면
  // 새 검색으로 취급된다. (예전엔 같은 검색어를 다시 set해도 React가 변경으로
  // 보지 않아 effect가 재실행되지 않았고, 다시 시도 버튼이 아무 일도 안 했음)
  const [attempt, setAttempt] = useState(0);

  const scrollRef = useRef(null); // 스크롤 컨테이너 (IntersectionObserver의 기준)
  const sentinelRef = useRef(null); // 목록 맨 아래 감지용 빈 div
  // 요청마다 번호를 매겨서, 늦게 도착한 옛날 응답이 최신 결과를 덮어쓰지 않게 막는다.
  const requestIdRef = useRef(0);

  const keyword = debouncedQuery.trim();
  const hasCondition = keyword !== "" || selectedType !== null;

  // 검색 조건을 하나의 문자열 키로 (조건이 없으면 null)
  const searchKey = hasCondition
    ? `${keyword}\u0000${selectedType ?? ""}\u0000${attempt}`
    : null;

  // 첫 페이지 로딩 = 조건이 있고, 그 조건의 결과가 아직 반영되지 않음
  const loading = searchKey !== null && resolvedKey !== searchKey;
  // 에러는 그 조건의 응답이 도착한 뒤에만 보여준다 (새 검색이 시작되면 자동으로 가려짐)
  const showError = Boolean(error) && hasCondition && !loading;

  /* ---------- 1. 입력 디바운스 ---------- */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    // query가 또 바뀌면 이전 타이머를 취소 → 마지막 입력 기준으로만 실행됨
    return () => clearTimeout(timer);
  }, [query]);

  /* ---------- 2. 검색 조건이 바뀌면 첫 페이지부터 다시 조회 ---------- */
  useEffect(() => {
    // 요청 번호를 올려서, 진행 중이던 이전 검색의 응답이 도착해도 무시되게 한다
    const myId = ++requestIdRef.current;

    // 검색어도 없고 카테고리도 안 골랐으면 서버를 부르지 않는다.
    // 목록/로딩 표시는 렌더링 쪽에서 hasCondition으로 가려지므로 여기서
    // 상태를 비울 필요가 없다 (effect 안의 동기 setState를 피하기 위함).
    if (searchKey === null) return;

    searchAreas({ keyword, type: selectedType, page: 0, size: PAGE_SIZE })
      .then((res) => {
        if (myId !== requestIdRef.current) return; // 낡은 응답이면 버림
        setItems(res.content ?? []);
        setPage(0);
        setHasNext(Boolean(res.hasNext));
        setError("");
        scrollRef.current?.scrollTo({ top: 0 });
      })
      .catch((err) => {
        if (myId !== requestIdRef.current) return;
        if (err.message === "AUTH_EXPIRED") {
          navigate("/login");
          return;
        }
        setItems([]);
        setHasNext(false);
        setError(err.message || "검색에 실패했습니다");
      })
      .finally(() => {
        if (myId !== requestIdRef.current) return;
        setResolvedKey(searchKey); // 이 조건의 결과가 반영됨 → loading 해제
      });
  }, [searchKey, keyword, selectedType, navigate]);

  /* ---------- 3. 다음 페이지 이어붙이기 ---------- */
  const loadMore = useCallback(() => {
    if (!hasNext || loading || loadingMore) return;

    const myId = requestIdRef.current; // 이 요청을 시작한 시점의 검색 세션 번호
    const nextPage = page + 1;
    setLoadingMore(true);

    searchAreas({ keyword, type: selectedType, page: nextPage, size: PAGE_SIZE })
      .then((res) => {
        // 도중에 검색어가 바뀌었으면(= 세션 번호가 달라졌으면) 붙이지 않는다
        if (myId !== requestIdRef.current) return;
        setItems((prev) => [...prev, ...(res.content ?? [])]);
        setPage(nextPage);
        setHasNext(Boolean(res.hasNext));
      })
      .catch((err) => {
        if (myId !== requestIdRef.current) return;
        if (err.message === "AUTH_EXPIRED") {
          navigate("/login");
          return;
        }
        setHasNext(false);
        setError(err.message || "더 불러오지 못했습니다");
      })
      .finally(() => {
        if (myId !== requestIdRef.current) return;
        setLoadingMore(false);
      });
  }, [hasNext, loading, loadingMore, keyword, selectedType, page, navigate]);

  /* ---------- 4. 무한스크롤 감지 ---------- */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNext) return;

    // root를 스크롤 컨테이너로 지정해야 한다.
    // PhoneFrame은 overflow-hidden이고 실제 스크롤은 이 페이지 안쪽 div가 하므로,
    // 기본값(브라우저 뷰포트)으로 두면 감지가 어긋날 수 있음.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { root: scrollRef.current, rootMargin: "200px" } // 바닥 200px 전에 미리 로드
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNext, loadMore]);

  /* ---------- 핸들러 ---------- */

  // 엔터를 누르면 디바운스를 기다리지 않고 바로 반영
  const handleSubmit = () => setDebouncedQuery(query);

  // 에러 화면의 "다시 시도" — 같은 조건으로 강제 재검색
  const handleRetry = () => setAttempt((a) => a + 1);

  // 같은 칩을 다시 누르면 선택 해제
  const toggleType = (type) =>
    setSelectedType((prev) => (prev === type ? null : type));

  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
  };

  // "반곡지 · 관광지" 처럼 현재 검색 조건을 한 줄로
  const conditionLabel = [
    keyword && `"${keyword}"`,
    selectedType && AREA_TYPE_LABELS[selectedType],
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto bg-[#FDFAF4] pb-6">
      <div className="px-5 pt-6">

        {/* 검색바 + 뒤로가기 */}
        <div className="flex items-center gap-2.5 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-[#F6ECDD] border border-[#EBDCC4] flex items-center justify-center shrink-0 gs-press"
            aria-label="뒤로가기"
          >
            <ArrowLeftIcon />
          </button>
          <div className="flex-1 h-11 rounded-2xl bg-[#FFFDF8] border border-[#E7DAC4] flex items-center gap-2 px-3.5 transition-colors focus-within:border-[#B99C74]">
            <SearchIcon />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="관광장소 이름으로 검색"
              className="flex-1 bg-transparent outline-none text-sm text-[#2A2420] placeholder-[#8C8274]"
            />
            {query && (
              <button onClick={handleClear} aria-label="검색어 지우기">
                <XCircleIcon />
              </button>
            )}
          </div>
        </div>

        {/* 카테고리 필터 (검색어와 함께 쓰면 AND로 좁혀짐) */}
        <div className="flex flex-wrap gap-2 mb-5">
          {AREA_TYPES.map((type, i) => {
            const tone = KEYWORD_TONES[i % KEYWORD_TONES.length];
            const active = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                aria-pressed={active}
                className="px-3.5 py-2 rounded-full text-sm font-medium gs-press transition-colors"
                style={
                  active
                    ? { backgroundColor: "#8B4A26", color: "#FFFDF8" }
                    : { backgroundColor: tone.bg, color: tone.fg }
                }
              >
                {AREA_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>

        {/* 검색 전 안내 */}
        {!hasCondition && (
          <div className="flex flex-col items-center justify-center py-16 text-center gs-rise">
            <div className="w-14 h-14 rounded-full bg-[#F6ECDD] flex items-center justify-center mb-3 gs-float">
              <LeafMark color="#8B4A26" size={24} />
            </div>
            <p className="text-sm text-[#2A2420] mb-1">경산의 어디가 궁금하세요?</p>
            <p className="text-xs text-[#8C8274]">
              이름을 입력하거나 위 카테고리를 골라보세요
            </p>
          </div>
        )}

        {/* 첫 페이지 로딩 */}
        {loading && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 mt-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <div className="w-full aspect-square rounded-xl gs-skeleton mb-2" />
                <div className="w-2/3 h-3 rounded gs-skeleton" />
              </div>
            ))}
          </div>
        )}

        {/* 에러 */}
        {showError && (
          <div className="py-16 text-center gs-rise">
            <p className="text-sm text-[#2A2420] mb-1">검색을 불러오지 못했어요</p>
            <p className="text-xs text-[#8C8274] mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 rounded-full text-sm font-medium bg-[#F6ECDD] text-[#8B4A26] gs-press"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 검색 결과 */}
        {!loading && !showError && hasCondition && (
          <>
            <SectionTitle tone="#8B4A26">검색 결과</SectionTitle>
            <p className="text-xs text-[#8C8274] mb-3">
              {conditionLabel} · {items.length}곳{hasNext && " 이상"}
            </p>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gs-rise">
                <div className="w-14 h-14 rounded-full bg-[#E8F0E6] flex items-center justify-center mb-3 gs-float">
                  <LeafMark color="#4B6B4E" size={24} />
                </div>
                <p className="text-sm text-[#2A2420] mb-1">검색 결과가 없어요</p>
                <p className="text-xs text-[#8C8274]">
                  다른 이름으로 찾거나 카테고리를 바꿔보세요
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-3 gap-y-5 gs-stagger">
                  {items.map((spot) => {
                    const cat = categoryStyle(spot.category);
                    return (
                      <button
                        key={spot.id}
                        onClick={() => navigate(`/spots/${spot.id}`)}
                        className="text-left gs-press"
                      >
                        <div className="w-full aspect-square rounded-2xl bg-[#F6F0E4] border border-[#EBE0CE] flex items-center justify-center mb-2 overflow-hidden shadow-sm shadow-[#8B4A26]/5">
                          {spot.imageUrl ? (
                            <img
                              src={spot.imageUrl}
                              alt={spot.name}
                              loading="lazy"
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
                        <p className="text-[11px] text-[#8C8274] mt-0.5 truncate">
                          {spot.address}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* 이 div가 화면에 보이면 다음 페이지를 불러온다 */}
                <div ref={sentinelRef} className="h-px" />

                {loadingMore && (
                  <p className="text-center text-xs text-[#8C8274] py-5">
                    불러오는 중…
                  </p>
                )}
                {!hasNext && items.length > PAGE_SIZE && (
                  <p className="text-center text-xs text-[#A99B86] py-5">
                    마지막 결과예요
                  </p>
                )}
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}

/** 카테고리 칩 색 - 회색 칩만 늘어서 있던 자리에 계절색을 돌려 쓴다 */
const KEYWORD_TONES = [
  { bg: "#E4EFF2", fg: "#3D6E7C" },
  { bg: "#FAE7E5", fg: "#B04A46" },
  { bg: "#F6ECDD", fg: "#8B4A26" },
  { bg: "#EDE9F3", fg: "#5E4E7A" },
  { bg: "#FBEADC", fg: "#A2551F" },
  { bg: "#E8F0E6", fg: "#3F6B45" },
];

/* --- 아이콘 --- */

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="#2A2420" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="#8B4A26" strokeOpacity="0.75" strokeWidth="1.8" />
      <path d="M20 20l-4.5-4.5" stroke="#8B4A26" strokeOpacity="0.75" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" fill="#C6B9A4" />
      <path d="M9 9l6 6M15 9l-6 6" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" stroke="#C6B9A4" strokeWidth="1.6" />
      <circle cx="8.3" cy="9.3" r="1.4" stroke="#C6B9A4" strokeWidth="1.4" />
      <path d="M5 17l4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 16m-1.5-1.5l1.3-1.3a1.5 1.5 0 0 1 2.1 0L19.5 16" stroke="#C6B9A4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}