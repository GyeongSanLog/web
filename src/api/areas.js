// ============================================================
// 관광지 관련 API
//
// 실제 API 명세(스웨거) 기준으로 전면 재작성함.
// 기존 목데이터(AreaListResponse/AreaDetailResponse) 구조와는
// 필드명과 응답 형태가 많이 다르므로, 이 파일을 쓰는 페이지
// (Home.jsx, Search.jsx, SpotDetail.jsx 등)도 함께 손봐야 함.
//
// 주요 변경점:
// - 경로가 /api/areas가 아니라 /api/area (단수)
// - 목록/상세 조회를 포함한 모든 API가 스웨거에 401 응답을 명시하고
//   있어, 로그인 없이는 관광지 조회 자체가 안 될 가능성이 높음 →
//   전부 authFetch로 호출함
// - 상세 응답에 name/category가 이미 포함되어 있어서, 예전처럼
//   목록 데이터와 id로 매칭해 _display를 만들어 붙이던 방식이 필요 없어짐
// - 키워드 검색 파라미터가 없음 (type 카테고리 필터만 지원).
//   Search.jsx의 키워드 검색 기능은 이번엔 제외 — 백엔드에 추가 요청 필요.
// - 찜 토글/찜 목록, 추천, 랜덤 조회는 기존에 없던 신규 기능
// ============================================================

import { BASE_URL, authFetch } from "./client";

async function extractErrorMessage(res, fallback) {
  try {
    const body = await res.json();
    return body?.message || fallback;
  } catch {
    return fallback;
  }
}

/**
 * 관광지 유형 (스웨거 enum)
 * 화면에서 카테고리 필터 버튼을 만들 때 이 목록과 라벨을 사용하면 됨.
 */
export const AREA_TYPES = [
  "TOURIST_SPOT",
  "CULTURAL",
  "FESTIVAL",
  "LEPORTS",
  "LODGING",
  "SHOPPING",
  "RESTAURANT",
];

export const AREA_TYPE_LABELS = {
  TOURIST_SPOT: "관광지",
  CULTURAL: "문화시설",
  FESTIVAL: "축제",
  LEPORTS: "레포츠",
  LODGING: "숙박",
  SHOPPING: "쇼핑",
  RESTAURANT: "음식점",
};

/**
 * 쿼리스트링 조립 헬퍼 (page/size/sort 조합이 여러 함수에서 반복돼서 분리함)
 */
function buildListParams({ page = 0, size = 20, sort, type } = {}) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  params.set("page", page);
  params.set("size", size);
  if (sort) {
    (Array.isArray(sort) ? sort : [sort]).forEach((s) => params.append("sort", s));
  }
  return params;
}

/**
 * 관광지 목록 조회
 * GET /api/area — 경산시 관광지를 페이지 단위로 조회. type을 주면 해당 유형만 조회.
 * 인증 필요 → authFetch 사용
 *
 * 주의: 키워드 검색 파라미터 없음. type(카테고리) 필터만 가능.
 *
 * Response 200: SliceResponsePlaceListResponse
 *   { content: PlaceListResponse[], page, size, hasNext }
 *   PlaceListResponse: { id, name, address, imageUrl, category }
 */
export async function fetchAreaList({ type, page = 0, size = 20, sort } = {}) {
  const params = buildListParams({ page, size, sort, type });
  const res = await authFetch(`${BASE_URL}/api/area?${params.toString()}`);

  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    throw new Error(await extractErrorMessage(res, "관광지 목록 조회에 실패했습니다"));
  }

  return res.json(); // { content, page, size, hasNext }
}

/**
 * 관광지 상세 조회
 * GET /api/area/{placeId}
 * 인증 필요 → authFetch 사용
 *
 * Response 200: PlaceDetailResponse
 *   {
 *     id, name, address, category, imageUrl, imageUrls, content, phoneNumber,
 *     useTime, restDate, parking,
 *     eventStartDate, eventEndDate,       // 축제 아니면 null
 *     elevator, restroom, stroller,       // 무장애 정보, 없으면 null
 *     homepage, latitude, longitude
 *   }
 */
export async function fetchAreaDetail(placeId) {
  const res = await authFetch(`${BASE_URL}/api/area/${placeId}`);

  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    if (res.status === 404) throw new Error("존재하지 않는 관광지입니다");
    throw new Error(await extractErrorMessage(res, "상세 조회에 실패했습니다"));
  }

  return res.json(); // PlaceDetailResponse
}

/**
 * 관광지 찜 토글
 * POST /api/area/{placeId}/favorite — 찜한 상태면 취소, 아니면 찜함
 * 인증 필요 → authFetch 사용
 *
 * Response 200: FavoriteToggleResponse
 *   { favorited: boolean } — 토글 후 최종 상태
 */
export async function toggleAreaFavorite(placeId) {
  const res = await authFetch(`${BASE_URL}/api/area/${placeId}/favorite`, {
    method: "POST",
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    if (res.status === 404) throw new Error("존재하지 않는 관광지입니다");
    throw new Error(await extractErrorMessage(res, "찜하기에 실패했습니다"));
  }

  return res.json(); // { favorited }
}

/**
 * 찜 목록 조회 (무한스크롤)
 * GET /api/area/favorites — 최근 찜한 순
 * 인증 필요 → authFetch 사용
 *
 * Response 200: SliceResponsePlaceListResponse (fetchAreaList와 동일 형태)
 */
export async function fetchFavoriteAreas({ page = 0, size = 20, sort } = {}) {
  const params = buildListParams({ page, size, sort });
  const res = await authFetch(`${BASE_URL}/api/area/favorites?${params.toString()}`);

  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    throw new Error(await extractErrorMessage(res, "찜 목록 조회에 실패했습니다"));
  }

  return res.json(); // { content, page, size, hasNext }
}

/**
 * 여행지 추천
 * GET /api/area/recommendations
 *   - placeId 지정 시: 그 장소 기준 가까운 3곳
 *   - category 지정 시: 같은 유형 랜덤 3곳
 *   - 반드시 둘 중 하나만 지정 (둘 다 넣거나 둘 다 비우면 서버가 400)
 * 인증 필요 → authFetch 사용
 *
 * Response 200: PlaceListResponse[]
 */
export async function fetchAreaRecommendations({ placeId, category } = {}) {
  if ((placeId && category) || (!placeId && !category)) {
    throw new Error("placeId와 category 중 하나만 지정해야 합니다");
  }

  const params = new URLSearchParams();
  if (placeId) params.set("placeId", placeId);
  if (category) params.set("category", category);

  const res = await authFetch(
    `${BASE_URL}/api/area/recommendations?${params.toString()}`
  );

  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    if (res.status === 400) {
      throw new Error("추천 조건이 올바르지 않습니다");
    }
    throw new Error(await extractErrorMessage(res, "추천 조회에 실패했습니다"));
  }

  return res.json(); // PlaceListResponse[]
}

/**
 * 랜덤 관광지 조회
 * GET /api/area/random — 음식점을 제외한 관광지 중 하나를 무작위로 조회
 * 인증 필요 → authFetch 사용
 *
 * Response 200: PlaceDetailResponse
 */
export async function fetchRandomArea() {
  const res = await authFetch(`${BASE_URL}/api/area/random`);

  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    if (res.status === 404) throw new Error("조회 가능한 관광지가 없습니다");
    throw new Error(await extractErrorMessage(res, "랜덤 조회에 실패했습니다"));
  }

  return res.json(); // PlaceDetailResponse
}

/**
 * 중심 관광지 TOP5 조회 (인기 장소)
 * GET /api/area/popular
 * 인증 필요 → authFetch 사용
 *
 * 주의: TourAPI(한국관광공사 공공데이터) 원본을 그대로 내려주는 API라
 * 우리 DB의 관광지(place, /api/area가 다루는 데이터)와 id로 연결되지
 * 않음. 응답에 id/placeId가 없어서 이 목록의 항목을 눌러도
 * /spots/:id 상세 페이지로 이동할 수 없음 — 상세 연결이 필요하면
 * 백엔드에 placeId(우리 DB와 매칭되는 id) 필드 추가를 요청해야 함.
 * 동기화 전이면 빈 배열이 옴.
 *
 * Response 200: PopularPlaceResponse[]
 *   { name, categoryLarge, categoryMedium, latitude, longitude, rank }
 */
export async function fetchPopularAreas() {
  const res = await authFetch(`${BASE_URL}/api/area/popular`);

  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    throw new Error(await extractErrorMessage(res, "인기 장소 조회에 실패했습니다"));
  }

  return res.json(); // PopularPlaceResponse[]
}

/**
 * 진행 중인 축제 목록 조회
 * GET /api/area/festivals — 종료되지 않은 축제를 시작일순으로 전체 조회
 * 인증 필요 → authFetch 사용
 * 개수가 적어 페이지네이션 없음
 *
 * Response 200: PlaceListResponse[] + eventStartDate/eventEndDate
 *   { id, name, address, imageUrl, category, eventStartDate, eventEndDate }
 *
 * 참고: 이 응답은 id를 포함하므로 /spots/:id로 상세 이동 가능 (popular와 다름)
 */
export async function fetchOngoingFestivals() {
  const res = await authFetch(`${BASE_URL}/api/area/festivals`);

  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    throw new Error(await extractErrorMessage(res, "축제 목록 조회에 실패했습니다"));
  }

  return res.json(); // festival PlaceListResponse[]
}