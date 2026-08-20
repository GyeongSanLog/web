// ============================================================
// 여행 그룹 / 갤러리 / 셋로그 관련 API
// 백엔드 명세가 아직 확정되지 않아 프론트 자체 구조로 작성.
// 추후 명세 확정되면 필드명만 맞춰 교체하면 됨.
// ============================================================

import { BASE_URL } from "./client";

const delay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

// --- 더미데이터 ---

const mockGroups = [
  { id: 101, title: "경주 당일치기", startDate: "2026-07-18", endDate: "2026-07-18", memberCount: 2, thumbnailUrl: "", isOngoing: false },
  { id: 102, title: "부산 1박2일", startDate: "2026-07-10", endDate: "2026-07-11", memberCount: 3, thumbnailUrl: "", isOngoing: false },
  { id: 103, title: "강릉 벚꽃여행", startDate: "2026-05-02", endDate: "2026-05-04", memberCount: 4, thumbnailUrl: "", isOngoing: false },
];

// 오늘 날짜가 시작~종료일 사이인 그룹이 있으면 그걸 "진행중"으로 취급
// (지금은 데모용으로 하나를 강제로 진행중 처리)
const mockOngoingGroup = {
  id: 100,
  title: "제주도 여름 여행",
  startDate: "2026-08-01",
  endDate: "2026-08-04",
  memberCount: 3,
  thumbnailUrl: "",
  isOngoing: true,
};

const mockClipsByGroup = {
  100: [
    { id: 1, capturedAt: "14:32", authorName: "신유진", caption: "협재 바다 진짜 예쁘다", videoUrl: "" },
    { id: 2, capturedAt: "11:05", authorName: "김민지", caption: "숙소 체크인 완료!", videoUrl: "" },
    { id: 3, capturedAt: "09:40", authorName: "이현우", caption: "출발 전 공항에서", videoUrl: "" },
  ],
  101: [
    { id: 4, capturedAt: "15:10", authorName: "신유진", caption: "불국사 도착", videoUrl: "" },
    { id: 5, capturedAt: "12:20", authorName: "김민지", caption: "점심은 국밥", videoUrl: "" },
  ],
  102: [
    { id: 6, capturedAt: "20:00", authorName: "신유진", caption: "해운대 야경", videoUrl: "" },
    { id: 7, capturedAt: "13:15", authorName: "이현우", caption: "돼지국밥 맛집 발견", videoUrl: "" },
    { id: 8, capturedAt: "10:00", authorName: "김민지", caption: "출발!", videoUrl: "" },
  ],
  103: [{ id: 9, capturedAt: "16:40", authorName: "신유진", caption: "경포호 벚꽃길", videoUrl: "" }],
};

const mockLettersByGroup = {
  100: [
    { id: 1, authorName: "김민지", message: "오늘 진짜 재밌었어 ㅎㅎ" },
    { id: 2, authorName: "이현우", message: "내일 일정도 기대된다" },
  ],
  101: [],
  102: [{ id: 3, authorName: "이현우", message: "다음에 또 같이 오자!" }],
  103: [],
};

const mockSessionsByGroup = {
  100: [
    {
      id: 1, capturedAt: "14:32", date: "2026-08-01",
      entries: [
        { userId: 1, userName: "신유진", videoUrl: "", caption: "협재 바다 진짜 예쁘다" },
        { userId: 2, userName: "김민지", videoUrl: "", caption: "물 완전 맑아" },
        { userId: 3, userName: "이현우", videoUrl: "", caption: "선크림 발라야겠다" },
      ],
    },
    {
      id: 2, capturedAt: "11:05", date: "2026-08-01",
      entries: [
        { userId: 1, userName: "신유진", videoUrl: "", caption: "숙소 체크인 완료!" },
        { userId: 2, userName: "김민지", videoUrl: "", caption: "짐 정리 중" },
      ],
    },
    {
      id: 3, capturedAt: "09:40", date: "2026-08-01",
      entries: [
        { userId: 1, userName: "신유진", videoUrl: "", caption: "출발 전 공항에서" },
        { userId: 2, userName: "김민지", videoUrl: "", caption: "비행기 기다리는 중" },
        { userId: 3, userName: "이현우", videoUrl: "", caption: "면세점 구경" },
      ],
    },
  ],
  101: [
    {
      id: 4, capturedAt: "15:10", date: "2026-07-18",
      entries: [
        { userId: 1, userName: "신유진", videoUrl: "", caption: "불국사 도착" },
        { userId: 2, userName: "김민지", videoUrl: "", caption: "날씨 좋다" },
      ],
    },
  ],
  102: [
    {
      id: 5, capturedAt: "20:00", date: "2026-07-10",
      entries: [
        { userId: 1, userName: "신유진", videoUrl: "", caption: "해운대 야경" },
        { userId: 2, userName: "김민지", videoUrl: "", caption: "야시장 구경" },
        { userId: 3, userName: "이현우", videoUrl: "", caption: "바람 시원하다" },
      ],
    },
  ],
  103: [],
};

/**
 * 갤러리 메인 조회 - 진행중인 여행 1개 + 지난 여행 목록
 */
export async function fetchGallery() {
  // TODO: 실제 연동 시 그룹 목록 API 호출 후 프론트에서 날짜 기준 분류
  // const res = await fetch(`${BASE_URL}/groups`);
  // return res.json();

  await delay();

  return {
    ongoing: mockOngoingGroup,
    past: mockGroups.sort((a, b) => new Date(b.startDate) - new Date(a.startDate)),
  };
}

/**
 * 그룹 상세 조회 - 클립 목록 + 편지 목록
 */
export async function fetchGroupDetail(groupId) {
  // TODO: 실제 연동 시 아래 fetch로 교체
  // const res = await fetch(`${BASE_URL}/groups/${groupId}`);
  // return res.json();

  await delay();

  const id = Number(groupId);
  const group = mockOngoingGroup.id === id ? mockOngoingGroup : mockGroups.find((g) => g.id === id);
  if (!group) throw new Error("존재하지 않는 여행 그룹입니다");

  return {
    group,
    clips: mockClipsByGroup[id] ?? [],
    letters: mockLettersByGroup[id] ?? [],
  };
}

/**
 * 그룹의 셋로그 세션 목록 조회 (분할 화면 재생용)
 */
export async function fetchGroupSessions(groupId) {
  // TODO: 실제 연동 시 아래 fetch로 교체
  // const res = await fetch(`${BASE_URL}/groups/${groupId}/sessions`);
  // return res.json();

  await delay();

  const id = Number(groupId);
  const group = mockOngoingGroup.id === id ? mockOngoingGroup : mockGroups.find((g) => g.id === id);
  if (!group) throw new Error("존재하지 않는 여행 그룹입니다");

  return {
    group,
    sessions: mockSessionsByGroup[id] ?? [],
  };
}

/**
 * 셋로그 업로드 (촬영 완료 후)
 */
export async function uploadSetlog({ groupId, videoBlob, caption }) {
  // TODO: 실제 연동 시 FormData로 영상 파일 업로드
  // const formData = new FormData();
  // formData.append("video", videoBlob);
  // formData.append("caption", caption);
  // const res = await fetch(`${BASE_URL}/groups/${groupId}/setlogs`, {
  //   method: "POST",
  //   body: formData,
  // });
  // return res.json();

  await delay(600);
  console.log("셋로그 업로드 (mock):", { groupId, caption });
  return { success: true };
}

/**
 * 진행중인 여행 그룹 조회 (하단 네비바 + 버튼 클릭 시 사용)
 */
export async function fetchOngoingGroup() {
  // TODO: 실제 연동 시 아래 fetch로 교체
  // const res = await fetch(`${BASE_URL}/groups/ongoing`);
  // return res.json();

  const { ongoing } = await fetchGallery();
  return ongoing;
}