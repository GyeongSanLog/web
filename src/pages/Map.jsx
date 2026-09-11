// ============================================================
// 지도 페이지
//
// 1) 현위치를 중심으로 카카오 지도를 띄운다 (위치 거부 시 경산시청 중심)
// 2) "랜덤 여행지 뽑기" 버튼 → GET /api/area/random
//    응답을 바로 보여주지 않고, 두근두근하는 뽑기 연출을 먼저 재생한다.
//
// 연출 순서 (키프레임은 index.css 의 gs-* 참고)
//   spinning : 핀이 흔들리고 관광지 이름 릴이 슬롯머신처럼 돌아감
//              (API가 빨리 와도 MIN_SPIN_MS 만큼은 돌려서 기대감을 준다)
//   settling : 뽑힌 이름이 팝 하고 확정 + 반짝이 파티클 + 핀이 지도로 발사
//   result   : 지도의 실제 좌표에 핀이 떨어지고 결과 카드가 올라옴
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { fetchAreaList, fetchRandomArea } from "../api/areas";
import {
  distanceInMeters,
  formatDistance,
  getCurrentPosition,
  loadKakaoMapSdk,
} from "../utils/kakaoMap";

/** API가 아무리 빨라도 이 시간만큼은 릴을 돌린다 (연출용) */
const MIN_SPIN_MS = 2200;
/** 이름 확정 → 오버레이가 사라지기까지 */
const SETTLE_MS = 1100;

/** 목록 API를 못 받았을 때 릴에 흘릴 이름들 */
const FALLBACK_NAMES = [
  "반곡지",
  "갓바위",
  "팔공산",
  "삼성현역사문화공원",
  "남매지",
  "경산자연휴양림",
  "상대온천",
  "불굴사",
  "환성사",
  "경산시립박물관",
];

/** 확정 순간 사방으로 튀는 반짝이 좌표 (원형으로 10개) */
const BURST = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  const radius = 62 + (i % 3) * 16;
  return {
    tx: `${Math.cos(angle) * radius}px`,
    ty: `${Math.sin(angle) * radius}px`,
    delay: `${(i % 5) * 35}ms`,
  };
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 커스텀 오버레이는 innerHTML로 만들기 때문에 장소명을 직접 이스케이프한다 */
const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export default function MapPage() {
  const navigate = useNavigate();

  const mapContainerRef = useRef(null);
  const kakaoRef = useRef(null);
  const mapRef = useRef(null);
  const pinOverlayRef = useRef(null);
  const timersRef = useRef([]);

  const [myPos, setMyPos] = useState(null); // { lat, lng, fallback }
  const [mapError, setMapError] = useState(null);
  const [candidates, setCandidates] = useState([]);

  const [phase, setPhase] = useState("idle"); // idle | spinning | settling | result
  const [result, setResult] = useState(null);
  const [drawError, setDrawError] = useState(null);

  /* --- 지도 초기화: SDK 로드와 현위치 조회를 동시에 --- */
  useEffect(() => {
    let cancelled = false;

    Promise.all([loadKakaoMapSdk(), getCurrentPosition()])
      .then(([kakao, pos]) => {
        if (cancelled || !mapContainerRef.current) return;

        kakaoRef.current = kakao;
        setMyPos(pos);

        const center = new kakao.maps.LatLng(pos.lat, pos.lng);
        const map = new kakao.maps.Map(mapContainerRef.current, {
          center,
          level: pos.fallback ? 7 : 5,
        });
        mapRef.current = map;

        // 현위치 표시 (실제로 위치를 받아온 경우에만)
        if (!pos.fallback) {
          const el = document.createElement("div");
          el.className = "gs-overlay-root";
          el.innerHTML =
            '<span class="gs-me-wave"></span><span class="gs-me-dot"></span>';
          new kakao.maps.CustomOverlay({
            map,
            position: center,
            content: el,
            zIndex: 3,
          });
        }

        // 폰 프레임 안에서 레이아웃이 잡힌 뒤 크기를 다시 계산
        requestAnimationFrame(() => map.relayout());
      })
      .catch((err) => {
        console.error("지도 로드 실패:", err);
        if (!cancelled) setMapError(err.message || "지도를 불러오지 못했어요");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* --- 창 크기가 바뀌면 지도 크기 재계산 --- */
  useEffect(() => {
    const onResize = () => mapRef.current?.relayout();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* --- 릴에 흘릴 실제 관광지 이름들 (실패해도 화면엔 영향 없음) --- */
  useEffect(() => {
    fetchAreaList({ page: 0, size: 60 })
      .then((res) => {
        const names = (res?.content ?? []).map((p) => p.name).filter(Boolean);
        if (names.length >= 6) setCandidates(shuffle(names).slice(0, 24));
      })
      .catch(() => {}); // 릴은 FALLBACK_NAMES로 돌아감
  }, []);

  /* --- 언마운트 시 연출 타이머 정리 --- */
  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    },
    [],
  );

  /** 뽑힌 장소로 지도를 이동시키고 핀을 떨어뜨린다 */
  const dropPin = useCallback((place) => {
    const kakao = kakaoRef.current;
    const map = mapRef.current;
    if (!kakao || !map) return;
    if (place?.latitude == null || place?.longitude == null) return;

    const position = new kakao.maps.LatLng(place.latitude, place.longitude);

    pinOverlayRef.current?.setMap(null);

    const el = document.createElement("div");
    el.className = "gs-overlay-root";
    el.innerHTML = `
      <span class="gs-land-ripple"></span>
      <div class="gs-pin-anchor">
        <div class="gs-pin-drop" style="display:flex;flex-direction:column;align-items:center;">
          <span class="gs-pin-label">${escapeHtml(place.name)}</span>
          <svg width="34" height="42" viewBox="0 0 34 42" fill="none">
            <ellipse cx="17" cy="39" rx="6.5" ry="2.4" fill="rgba(0,0,0,0.18)" />
            <path d="M17 2c-6.6 0-12 5.3-12 11.9C5 22.8 17 37 17 37s12-14.2 12-23.1C29 7.3 23.6 2 17 2z" fill="#8B4A26" stroke="#ffffff" stroke-width="2.2" />
            <circle cx="17" cy="13.6" r="4.3" fill="#ffffff" />
          </svg>
        </div>
      </div>`;

    pinOverlayRef.current = new kakao.maps.CustomOverlay({
      map,
      position,
      content: el,
      zIndex: 6,
    });

    map.setLevel(4, { animate: true });
    map.panTo(position);
  }, []);

  /** 현위치로 지도 복귀 */
  function handleRecenter() {
    const kakao = kakaoRef.current;
    const map = mapRef.current;
    if (!kakao || !map || !myPos) return;
    map.setLevel(myPos.fallback ? 7 : 5);
    map.panTo(new kakao.maps.LatLng(myPos.lat, myPos.lng));
  }

  async function handleDraw() {
    if (phase === "spinning" || phase === "settling") return;

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    pinOverlayRef.current?.setMap(null);

    setDrawError(null);
    setResult(null);
    setPhase("spinning");

    const startedAt = Date.now();

    try {
      const place = await fetchRandomArea();

      // 기대감을 위해 최소 스핀 시간을 채운다
      await sleep(Math.max(0, MIN_SPIN_MS - (Date.now() - startedAt)));

      setResult(place);
      setPhase("settling");

      // 오버레이가 흐려지는 타이밍에 맞춰 지도에 핀을 떨어뜨리고
      timersRef.current.push(setTimeout(() => dropPin(place), SETTLE_MS - 250));
      // 오버레이가 완전히 사라지면 결과 카드를 올린다
      timersRef.current.push(setTimeout(() => setPhase("result"), SETTLE_MS));
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") {
        navigate("/login");
        return;
      }
      console.error("랜덤 관광지 조회 실패:", err);
      setPhase("idle");
      setDrawError(err.message || "여행지를 뽑지 못했어요");
    }
  }

  function handleCloseResult() {
    setPhase("idle");
    setResult(null);
    pinOverlayRef.current?.setMap(null);
    pinOverlayRef.current = null;
  }

  const drawing = phase === "spinning" || phase === "settling";
  const reelNames = candidates.length ? candidates : FALLBACK_NAMES;
  const distance =
    myPos && !myPos.fallback && result?.latitude != null
      ? formatDistance(
          distanceInMeters(myPos, {
            lat: result.latitude,
            lng: result.longitude,
          }),
        )
      : null;

  return (
    <div className="h-full flex flex-col relative">
      <AppHeader />

      <div className="flex-1 min-h-0 relative bg-[#E9E4DA]">
        {/* 지도 */}
        <div ref={mapContainerRef} className="absolute inset-0" />

        {/* 지도를 못 띄웠을 때 - 뽑기 기능 자체는 그대로 쓸 수 있게 유지 */}
        {mapError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center bg-gradient-to-b from-[#F6F0E4] to-[#E9E1D2]">
            <div className="w-14 h-14 rounded-full bg-[#F6ECDD] border border-[#EBDCC4] flex items-center justify-center mb-3 gs-float">
              <MapOffIcon />
            </div>
            <p className="text-sm text-[#2A2420] mb-1">
              지도를 불러오지 못했어요
            </p>
            <p className="text-[11px] leading-relaxed text-[#8C8274]">
              {mapError}
              <br />
              여행지 뽑기는 그대로 사용할 수 있어요
            </p>
          </div>
        )}

        {/* 상단 안내 칩 + 현위치 버튼 */}
        {!mapError && (
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 z-20 pointer-events-none">
            <span className="pointer-events-auto max-w-[74%] rounded-full bg-[#FFFCF6]/95 backdrop-blur px-3 py-1.5 text-[11px] text-[#6B6156] shadow-sm shadow-black/10 border border-[#EBE0CE] gs-rise">
              {myPos == null
                ? "현위치를 찾는 중이에요"
                : myPos.fallback
                  ? "위치 권한이 없어 경산 중심으로 보여드려요"
                  : "현위치를 중심으로 보고 있어요"}
            </span>
            <button
              onClick={handleRecenter}
              disabled={!myPos}
              aria-label="현위치로 이동"
              className="pointer-events-auto w-10 h-10 shrink-0 rounded-full bg-[#FFFCF6] flex items-center justify-center shadow-sm shadow-black/10 border border-[#EBE0CE] gs-press disabled:opacity-50"
            >
              <CrosshairIcon />
            </button>
          </div>
        )}

        {/* 뽑기 실패 안내 */}
        {drawError && (
          <div className="absolute left-0 right-0 bottom-[150px] px-6 z-30 flex justify-center">
            <p className="rounded-full bg-[#2A2420]/85 text-white text-[11px] px-3.5 py-2">
              {drawError}
            </p>
          </div>
        )}

        {/* 뽑기 버튼 (결과 카드가 떠 있을 땐 카드 안 버튼으로 대체) */}
        {phase !== "result" && (
          <div className="absolute left-0 right-0 bottom-[96px] px-6 z-30 flex justify-center">
            <button
              onClick={handleDraw}
              disabled={drawing}
              className="h-12 px-6 rounded-full bg-gradient-to-br from-[#A45B2C] to-[#7A3D1C] text-white text-sm font-medium shadow-lg shadow-[#8B4A26]/35 flex items-center gap-2 gs-press disabled:opacity-70"
            >
              <DiceIcon />
              {drawing ? "뽑는 중이에요" : "랜덤 여행지 뽑기"}
            </button>
          </div>
        )}

        {/* 결과 카드 */}
        {phase === "result" && result && (
          <div className="absolute left-0 right-0 bottom-[92px] px-4 z-30 gs-sheet-up">
            <div className="bg-[#FFFCF6] rounded-2xl border border-[#EBE0CE] shadow-xl shadow-black/15 p-3.5">
              <div className="flex items-start gap-3">
                <div className="w-[58px] h-[58px] rounded-xl bg-gradient-to-br from-[#E7EFE4] to-[#C9DAC3] overflow-hidden shrink-0 flex items-center justify-center">
                  {result.imageUrl ? (
                    <img
                      src={result.imageUrl}
                      alt={result.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <PinSmallIcon />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] text-[#8B4A26] bg-[#F6ECDD] rounded-full px-2 py-0.5">
                      오늘의 여행지
                    </span>
                    {result.category && (
                      <span className="text-[10px] text-[#8C8274]">
                        {result.category}
                      </span>
                    )}
                  </div>
                  <p className="text-[15px] font-semibold text-[#2A2420] truncate">
                    {result.name}
                  </p>
                  <p className="text-[11px] text-[#8C8274] truncate mt-0.5">
                    {result.address}
                  </p>
                  {distance && (
                    <p className="text-[11px] text-[#6B6156] mt-0.5">
                      내 위치에서 약 {distance}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleCloseResult}
                  aria-label="닫기"
                  className="w-7 h-7 shrink-0 rounded-full bg-[#F4EFE6] flex items-center justify-center gs-press"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleDraw}
                  className="flex-1 h-10 rounded-xl bg-[#F4EFE6] text-[#2A2420] text-sm flex items-center justify-center gap-1.5 gs-press"
                >
                  <RefreshIcon />
                  다시 뽑기
                </button>
                <button
                  onClick={() => navigate(`/spots/${result.id}`)}
                  className="flex-1 h-10 rounded-xl bg-[#8B4A26] text-white text-sm font-medium gs-press hover:bg-[#6B3618]"
                >
                  상세보기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- 뽑기 연출 오버레이 ---------- */}
        {drawing && (
          <div
            className={`absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#2a190d]/55 backdrop-blur-[2px] gs-fade-in ${
              phase === "settling" ? "gs-overlay-out" : ""
            }`}
          >
            {/* 핀 + 파장 */}
            <div className="relative w-[150px] h-[150px] flex items-center justify-center">
              {phase === "spinning" && (
                <>
                  <span className="absolute inset-0 rounded-full border border-white/35 gs-ring" />
                  <span
                    className="absolute inset-0 rounded-full border border-white/35 gs-ring"
                    style={{ animationDelay: "500ms" }}
                  />
                  <span
                    className="absolute inset-0 rounded-full border border-white/35 gs-ring"
                    style={{ animationDelay: "1000ms" }}
                  />
                </>
              )}

              <div className={phase === "spinning" ? "gs-bob" : "gs-launch"}>
                <BigPinIcon />
              </div>

              {/* 확정 순간 반짝이 */}
              {phase === "settling" &&
                BURST.map((b, i) => (
                  <span
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-[#f6d9b8] gs-burst"
                    style={{
                      "--tx": b.tx,
                      "--ty": b.ty,
                      animationDelay: b.delay,
                    }}
                  />
                ))}
            </div>

            {/* 이름 릴 → 확정된 이름 */}
            <div className="mt-9 h-8 w-[250px] overflow-hidden text-center">
              {phase === "spinning" ? (
                <div
                  className="gs-reel"
                  style={{ animationDuration: `${reelNames.length * 95}ms` }}
                >
                  {[...reelNames, ...reelNames].map((name, i) => (
                    <p
                      key={`${name}-${i}`}
                      className="h-8 leading-8 text-[17px] font-semibold text-white/80 truncate px-2"
                    >
                      {name}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="h-8 leading-8 text-[19px] font-bold text-white truncate px-2 gs-name-pop">
                  {result?.name}
                </p>
              )}
            </div>

            <p className="mt-2 text-[12px] text-white/70">
              {phase === "spinning"
                ? "두근두근… 경산 어딘가를 고르는 중"
                : "오늘의 여행지가 정해졌어요"}
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

/* --- 아이콘 --- */

function BigPinIcon() {
  return (
    <svg width="66" height="80" viewBox="0 0 34 42" fill="none">
      <path
        d="M17 2c-6.6 0-12 5.3-12 11.9C5 22.8 17 37 17 37s12-14.2 12-23.1C29 7.3 23.6 2 17 2z"
        fill="#ffffff"
      />
      <circle cx="17" cy="13.6" r="4.6" fill="#8B4A26" />
    </svg>
  );
}

function DiceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="4.2"
        stroke="white"
        strokeWidth="1.8"
      />
      <circle cx="9" cy="9" r="1.4" fill="white" />
      <circle cx="15" cy="15" r="1.4" fill="white" />
      <circle cx="15" cy="9" r="1.4" fill="white" />
      <circle cx="9" cy="15" r="1.4" fill="white" />
    </svg>
  );
}

function CrosshairIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" stroke="#8B4A26" strokeWidth="1.8" />
      <path
        d="M12 2.5v3.2M12 18.3v3.2M21.5 12h-3.2M5.7 12H2.5"
        stroke="#8B4A26"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 12a8 8 0 1 1-2.6-5.9"
        stroke="#2A2420"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M20 4v4.2h-4.2"
        stroke="#2A2420"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="#8C8274"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PinSmallIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"
        stroke="#C6B9A4"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="9" r="2.2" stroke="#C6B9A4" strokeWidth="1.7" />
    </svg>
  );
}

function MapOffIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 5L4 7v13l5-2 6 2 5-2V5l-5 2-6-2z"
        stroke="#8B4A26"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M4 4l16 16"
        stroke="#8B4A26"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
