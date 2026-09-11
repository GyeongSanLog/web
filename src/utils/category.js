// ============================================================
// 카테고리 → 색 매핑
//
// 화면 곳곳(홈 인기장소, 검색 결과, 상세 헤더)에서 카테고리를
// 회색 글씨로만 보여주다 보니 전체적으로 색이 너무 없었다.
// 여기서 카테고리마다 자연에서 따온 파스텔 한 쌍(bg/fg)을 정해두고
// 작은 칩으로 찍어주면 목록이 단번에 살아난다.
//
// 입력은 두 가지가 섞여 들어온다:
//   1) AREA_TYPE enum  - /api/area 계열이 주는 값 (TOURIST_SPOT 등)
//   2) categoryMedium  - /api/area/popular(TourAPI 원본)이 주는 한글 자유 문자열
// 그래서 enum을 먼저 보고, 없으면 한글 키워드로 매칭한다.
// ============================================================

/** 자연에서 따온 칩 색 - 배경은 아주 옅게, 글자는 같은 계열의 짙은 톤 */
const PALETTE = {
  forest: { bg: "#E8F0E6", fg: "#3F6B45" }, // 팔공산 솔숲
  clay: { bg: "#F6ECDD", fg: "#8B4A26" }, // 황토 / 기와
  blossom: { bg: "#FAE7E5", fg: "#B04A46" }, // 진달래
  water: { bg: "#E4EFF2", fg: "#3D6E7C" }, // 반곡지 물빛
  bellflower: { bg: "#EDE9F3", fg: "#5E4E7A" }, // 도라지꽃
  gold: { bg: "#FBF0DA", fg: "#8A6420" }, // 가을 햇빛
  persimmon: { bg: "#FBEADC", fg: "#A2551F" }, // 감
  stone: { bg: "#F1EDE4", fg: "#6B6156" }, // 갓바위 돌 (기본값)
};

/** AREA_TYPE enum (api/areas.js) → 색 */
const BY_TYPE = {
  TOURIST_SPOT: PALETTE.forest,
  CULTURAL: PALETTE.clay,
  FESTIVAL: PALETTE.blossom,
  LEPORTS: PALETTE.water,
  LODGING: PALETTE.bellflower,
  SHOPPING: PALETTE.gold,
  RESTAURANT: PALETTE.persimmon,
};

/** 한글 자유 문자열(categoryMedium) 매칭 - 먼저 걸리는 것을 쓴다 */
const BY_KEYWORD = [
  [/자연|산|숲|공원|수목|계곡|호수|저수지|폭포/, PALETTE.forest],
  [/문화|역사|유적|사찰|절|박물관|미술|전시|서원|향교/, PALETTE.clay],
  [/축제|행사|공연|이벤트/, PALETTE.blossom],
  [/레포츠|체험|스포츠|캠핑|낚시|골프|온천/, PALETTE.water],
  [/숙박|호텔|펜션|모텔|민박|리조트/, PALETTE.bellflower],
  [/쇼핑|시장|상가|백화점|면세/, PALETTE.gold],
  [/음식|식당|맛집|카페|restaurant/i, PALETTE.persimmon],
];

/**
 * 카테고리 값 하나를 받아 칩에 쓸 { bg, fg } 를 돌려준다.
 * 못 알아보는 값이면 기본 돌색을 준다 (색이 없는 것보단 낫다).
 *
 * @param {string} value AREA_TYPE enum 또는 한글 카테고리 문자열
 */
export function categoryStyle(value) {
  if (!value) return PALETTE.stone;
  if (BY_TYPE[value]) return BY_TYPE[value];

  const matched = BY_KEYWORD.find(([re]) => re.test(value));
  return matched ? matched[1] : PALETTE.stone;
}

/** 순위 뱃지용 색 - 1·2·3등만 금/솔/황토로 구분하고 나머지는 돌색 */
export function rankStyle(rank) {
  if (rank === 1) return { bg: "#F4D79A", fg: "#7A5312" };
  if (rank === 2) return { bg: "#D9E4D4", fg: "#3F6B45" };
  if (rank === 3) return { bg: "#EDD9C4", fg: "#8B4A26" };
  return { bg: "#F1EDE4", fg: "#8C8274" };
}
