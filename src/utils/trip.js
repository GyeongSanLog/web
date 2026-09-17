// ============================================================
// 여행 기간 / 시간대(slot) 관련 공통 계산
//
// GroupDetail.jsx와 SlotGrid.jsx가 각자 "여행이 끝났는지"를 따로
// 계산하고 있어서, 기준이 바뀌면 한쪽만 고쳐져 편지는 열렸는데
// 촬영은 막히는 식으로 어긋날 수 있었음 → 여기로 합침.
//
// slotIndex 가정: 그룹 시작일 자정(00:00)을 0으로 놓고 몇 시간째인지
// 나타내는 절대 인덱스 (예: 시작일 다음날 17시 = 24 + 17 = 41).
// 서버 계산 기준이 다르면 slotIndexToDate / dateToSlotIndex 두 함수만
// 고치면 나머지는 그대로 재사용 가능.
// ============================================================

export const TRIP_BEFORE = "BEFORE"; // 아직 시작 전
export const TRIP_ONGOING = "ONGOING"; // 진행 중
export const TRIP_ENDED = "ENDED"; // 종료됨

/**
 * 그룹 여행이 지금 어느 상태인지.
 * now를 인자로 받는 이유: 정각마다 화면을 갱신할 때 같은 시각 기준으로
 * 여러 값을 계산해야 하기 때문 (렌더 중에 new Date()를 여러 번 부르면
 * 미묘하게 다른 시각이 섞일 수 있음).
 */
export function getTripStatus(startAt, endAt, now = new Date()) {
  if (now < new Date(startAt)) return TRIP_BEFORE;
  if (new Date(endAt) < now) return TRIP_ENDED;
  return TRIP_ONGOING;
}

/** 그룹 시작일 자정 기준으로 slotIndex → Date 변환 */
export function slotIndexToDate(startAt, slotIndex) {
  const start = new Date(startAt);
  start.setHours(0, 0, 0, 0);
  return new Date(start.getTime() + slotIndex * 60 * 60 * 1000);
}

/** 특정 Date가 그룹 시작일 기준 몇 번째 slotIndex인지 계산 */
export function dateToSlotIndex(startAt, date) {
  const start = new Date(startAt);
  start.setHours(0, 0, 0, 0);
  return Math.floor((date - start) / (1000 * 60 * 60));
}

/** 그룹 종료일 당일의 마지막 시간대(23시) slotIndex */
export function endOfTripSlotIndex(startAt, endAt) {
  const end = new Date(endAt);
  end.setHours(23, 0, 0, 0);
  return dateToSlotIndex(startAt, end);
}

/**
 * 조회 가능한 가장 최신 slotIndex.
 * 그리드 진입 시 기본으로 보여줄 시간대이자, "다음" 이동의 상한선.
 *
 * - 시작 전: 0 (첫 슬롯. 어차피 볼 로그가 없으므로 이동도 막힘)
 * - 진행 중: 지금 시각 기준 slot
 * - 종료됨: endAt 당일 23시 slot으로 고정
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
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

/** "9.2 17:30" 형태의 날짜+시각 */
export function formatShortDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}