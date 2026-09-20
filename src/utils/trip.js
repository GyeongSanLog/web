// ============================================================
// 여행 기간 / 시간대(slot) 관련 공통 계산
//
// GroupDetail.jsx와 SlotGrid.jsx가 각자 "여행이 끝났는지"를 따로
// 계산하고 있어서, 기준이 바뀌면 한쪽만 고쳐져 편지는 열렸는데
// 촬영은 막히는 식으로 어긋날 수 있었음 → 여기로 합침.
//
// slotIndex 가정: startAt(그룹 시작 "시각" 자체, 자정이 아님)을 0으로 놓고
// 몇 시간째인지 나타내는 절대 인덱스 (예: startAt이 12시면, 그날 14시는
// slot 2). 서버가 startAt과 capturedAt 두 시:분 숫자를 그대로 빼서 slot을
// 매기는 방식으로 확인됨(진단 로그로 검증됨, 2026-09-20).
//
// [수정 이력] 그룹 생성이 날짜 단위였을 때는 항상 자정 시작이라 "자정
// 기준"과 "startAt 기준"이 같은 결과였음. 이후 그룹 생성에 시간 입력이
// 추가되며(예: 12시 시작) 두 기준이 달라졌고, 자정 기준으로 계산하던
// 프론트가 서버보다 몇 시간(= startAt의 시각만큼) 더 많은 slot을 매기는
// 시차 버그로 드러남. → slotIndexToDate/dateToSlotIndex가 자정이 아니라
// startAt 시각 자체를 기준점으로 쓰도록 수정.
// ============================================================

export const TRIP_BEFORE = "BEFORE"; // 아직 시작 전
export const TRIP_ONGOING = "ONGOING"; // 진행 중
export const TRIP_ENDED = "ENDED"; // 종료됨

/**
 * 서버가 준 startAt/endAt 문자열을 파싱한다.
 *
 * [2026-09-20 시차 버그 수정 배경]
 * 서버는 date-time 값을 실제 타임존 변환 없이 "숫자 그대로" 다루는 것으로
 * 확인됨(capturedAt에서 이미 같은 동작을 확인했고, startAt도 진단 로그로
 * 재확인함). 즉 서버가 끝에 "Z"를 붙여 돌려주더라도, 그 Z는 "진짜 UTC"가
 * 아니라 한국시간 값을 그대로 표시한 것뿐임 — api/groups.js의 createGroup이
 * 요청을 보낼 때도 같은 방식(한국시간 값 + Z)을 쓰고 있음.
 *
 * new Date("...Z")로 그냥 파싱하면 브라우저는 이걸 "진짜 UTC"로 해석해서
 * 한국시간 기준으로 9시간 이른 시각으로 잘못 읽는다. 그래서 여기서는 Z나
 * 오프셋 표시를 떼어내고 "타임존 표시 없는 값"으로 만든 뒤 파싱한다 —
 * 그러면 브라우저가 로컬(KST) 시각으로 정확히 해석한다.
 *
 * 과거에 만들어진 그룹처럼 애초에 타임존 표시가 없는 값이 오는 경우도
 * 그대로 잘 파싱되므로 동작에 영향 없음.
 */
export function parseServerDateTime(dateStr) {
  if (!dateStr) return new Date(NaN);
  const withoutZone = dateStr.replace(/Z$|[+-]\d{2}:\d{2}$/, "");
  return new Date(withoutZone);
}

/**
 * 그룹 여행이 지금 어느 상태인지.
 * now를 인자로 받는 이유: 정각마다 화면을 갱신할 때 같은 시각 기준으로
 * 여러 값을 계산해야 하기 때문 (렌더 중에 new Date()를 여러 번 부르면
 * 미묘하게 다른 시각이 섞일 수 있음).
 */
export function getTripStatus(startAt, endAt, now = new Date()) {
  if (now < parseServerDateTime(startAt)) return TRIP_BEFORE;
  if (parseServerDateTime(endAt) < now) return TRIP_ENDED;
  return TRIP_ONGOING;
}

/** startAt(그룹 시작 시각) 기준으로 slotIndex → Date 변환 */
export function slotIndexToDate(startAt, slotIndex) {
  const start = parseServerDateTime(startAt);
  return new Date(start.getTime() + slotIndex * 60 * 60 * 1000);
}

/** 특정 Date가 그룹 시작 시각(startAt) 기준 몇 번째 slotIndex인지 계산 */
export function dateToSlotIndex(startAt, date) {
  const start = parseServerDateTime(startAt);
  return Math.floor((date - start) / (1000 * 60 * 60));
}

/**
 * 그룹 종료 시각(endAt)이 속하는 마지막 slotIndex.
 * "당일 23시"가 아니라 endAt 자체를 기준으로 계산한다 — 그룹이 더 이상
 * 자정 단위가 아니므로, endAt이 어느 시각이든 그 시각이 포함된 slot이
 * 곧 여행 중 마지막으로 조회 가능한 slot이다.
 */
export function endOfTripSlotIndex(startAt, endAt) {
  const end = parseServerDateTime(endAt);
  return dateToSlotIndex(startAt, end);
}

/**
 * 조회 가능한 가장 최신 slotIndex.
 * 그리드 진입 시 기본으로 보여줄 시간대이자, "다음" 이동의 상한선.
 *
 * - 시작 전: 0 (첫 슬롯. 어차피 볼 로그가 없으므로 이동도 막힘)
 * - 진행 중: 지금 시각 기준 slot
 * - 종료됨: endAt이 속한 slot으로 고정
 *     → 여행이 끝나고 한참 뒤에 들어와도 마지막 로그부터 바로 보여주기 위함.
 *       (예전엔 항상 "오늘" 기준이라, 9/2~9/10 여행을 9/14에 열면
 *        존재하지 않는 9/14 슬롯이 기본으로 잡혔음)
 */
export function latestAvailableSlotIndex(startAt, endAt, now = new Date()) {
  const status = getTripStatus(startAt, endAt, now);
  if (status === TRIP_BEFORE) return 0;
  if (status === TRIP_ENDED) return endOfTripSlotIndex(startAt, endAt);
  return dateToSlotIndex(startAt, now);
}

/** "9.2 17:00" 형태의 시간대 라벨 */
export function formatSlotLabel(startAt, slotIndex) {
  if (slotIndex == null) return "";
  const d = slotIndexToDate(startAt, slotIndex);
  return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:00`;
}

/** "9.2" 형태의 짧은 날짜 */
export function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const d = parseServerDateTime(dateStr);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

/** "9.2 17:30" 형태의 날짜+시각 */
export function formatShortDateTime(dateStr) {
  if (!dateStr) return "";
  const d = parseServerDateTime(dateStr);
  return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}