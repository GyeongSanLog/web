import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAreaList } from "../api";

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSubmittedQuery(query);
    setLoading(true);
    try {
      const res = await fetchAreaList(query, 1);
      setResults(res.contents);
      setMeta(res.meta);
    } catch (err) {
      console.error("검색 실패:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeywordClick = async (kw) => {
    setQuery(kw);
    setSubmittedQuery(kw);
    setLoading(true);
    try {
      const res = await fetchAreaList(kw, 1);
      setResults(res.contents);
      setMeta(res.meta);
    } catch (err) {
      console.error("검색 실패:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white pb-6">
      <div className="px-5 pt-6">

        {/* 검색바 + 뒤로가기 */}
        <div className="flex items-center gap-2.5 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center shrink-0"
            aria-label="뒤로가기"
          >
            <ArrowLeftIcon />
          </button>
          <div className="flex-1 h-10 rounded-xl bg-[#f5f5f7] border border-[#e5e5ea] flex items-center gap-2 px-3.5">
            <SearchIcon />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="관광장소 / 키워드로 검색"
              className="flex-1 bg-transparent outline-none text-sm text-[#1c1c1e] placeholder-[#98989d]"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="검색어 지우기">
                <XCircleIcon />
              </button>
            )}
          </div>
        </div>

        {/* 검색 전: 인기 키워드 */}
        {!submittedQuery && (
          <>
            <p className="text-xs text-[#98989d] mb-2.5">인기 검색어</p>
            <div className="flex flex-wrap gap-2">
              {popularKeywords.map((kw) => (
                <button
                  key={kw}
                  onClick={() => handleKeywordClick(kw)}
                  className="px-3.5 py-2 rounded-full bg-[#f5f5f7] text-sm text-[#1c1c1e]"
                >
                  {kw}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 mt-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <div className="w-full aspect-square rounded-xl bg-[#f5f5f7] animate-pulse mb-2" />
                <div className="w-2/3 h-3 bg-[#f5f5f7] rounded animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* 검색 결과 */}
        {!loading && submittedQuery && (
          <>
            <p className="text-xs text-[#98989d] mb-3">
              "{submittedQuery}" 검색 결과 {meta?.totalElements ?? 0}곳
            </p>

            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm text-[#98989d]">검색 결과가 없어요</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-5">
                {results.map((spot) => (
                  <button
                    key={spot.id}
                    onClick={() => navigate(`/spots/${spot.id}`)}
                    className="text-left"
                  >
                    <div className="w-full aspect-square rounded-xl bg-[#f5f5f7] border border-[#e5e5ea] flex items-center justify-center mb-2">
                      <ImageIcon />
                    </div>
                    <p className="text-[13px] font-medium text-[#1c1c1e]">
                      {spot.name}
                    </p>
                    <p className="text-[11px] text-[#98989d] mt-0.5">
                      {spot.address}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

const popularKeywords = ["바다", "감성", "혼자여행", "무장애", "카페", "산"];

/* --- 아이콘 --- */

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="#1c1c1e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="#98989d" strokeWidth="1.8" />
      <path d="M20 20l-4.5-4.5" stroke="#98989d" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" fill="#c7c7cc" />
      <path d="M9 9l6 6M15 9l-6 6" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" stroke="#c7c7cc" strokeWidth="1.6" />
      <circle cx="8.3" cy="9.3" r="1.4" stroke="#c7c7cc" strokeWidth="1.4" />
      <path d="M5 17l4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 16m-1.5-1.5l1.3-1.3a1.5 1.5 0 0 1 2.1 0L19.5 16" stroke="#c7c7cc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}