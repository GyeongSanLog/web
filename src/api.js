// ============================================================
// 임시 API 레이어 (Mock)
// 백엔드 완성 전까지 명세서(AreaListResponse / AreaDetailResponse)와
// 동일한 형태로 더미데이터를 반환합니다.
//
// 목록 조회와 상세 조회는 실제로는 서로 다른 응답 스펙을 가지므로,
// 소스 데이터도 아래처럼 완전히 분리해서 관리합니다.
// (id로만 서로 연결되며, 필드가 섞이지 않도록 함)
//
// 나중에 실제 API가 준비되면 이 파일의 함수 내부만 fetch로 교체하면 되고,
// 페이지 컴포넌트(Home.jsx, Search.jsx, SpotDetail.jsx)는 건드릴 필요 없습니다.
// ============================================================

const BASE_URL = "http://localhost:8000"; // TODO: 실제 백엔드 주소로 교체

// --- 목록 조회용 더미데이터 (AreaListResponse.contents 형태) ---
// 필드: id, name, address, imageUrl, category, rank
const mockAreaListData = [
  { id: 1, name: "안목해변", address: "강원 강릉시", imageUrl: "", category: "관광지", rank: 1 },
  { id: 2, name: "갓바위", address: "경북 경산시", imageUrl: "", category: "관광지", rank: 2 },
  { id: 3, name: "경산자인단오제", address: "경북 경산시", imageUrl: "", category: "축제", rank: 3 },
  { id: 4, name: "삼성현역사문화공원", address: "경북 경산시", imageUrl: "", category: "관광지", rank: 4 },
  { id: 5, name: "해운대해수욕장", address: "부산 해운대구", imageUrl: "", category: "관광지", rank: 5 },
];

// --- 상세 조회용 더미데이터 (AreaDetailResponse 형태) ---
// 필드: id, address, content, imageUrls, phoneNumber
// (name, category는 명세서에 없지만, 목록 데이터와 id로 매칭해 화면 표시용으로 조합함)
const mockAreaDetailData = [
  {
    id: 1,
    address: "강원 강릉시",
    content:
      "커피거리로 유명한 강릉 대표 해변. 백사장을 따라 카페들이 늘어서 있어 커피를 마시며 바다를 감상할 수 있다.",
    imageUrls: [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg",
    ],
    phoneNumber: "033-640-4531",
  },
  {
    id: 2,
    address: "경북 경산시",
    content: "경산을 대표하는 명소로, 소원을 빌면 하나는 꼭 이루어진다는 전설이 있다.",
    imageUrls: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
    phoneNumber: "053-810-6432",
  },
  {
    id: 3,
    address: "경북 경산시",
    content: "매년 단오절에 열리는 경산 지역 대표 전통 축제.",
    imageUrls: ["https://example.com/image1.jpg"],
    phoneNumber: "053-810-5114",
  },
  {
    id: 4,
    address: "경북 경산시",
    content: "원효, 설총, 일연 세 성현을 기리는 역사문화공원.",
    imageUrls: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
    phoneNumber: "053-804-7500",
  },
  {
    id: 5,
    address: "부산 해운대구",
    content: "부산을 대표하는 해수욕장으로 여름철 최고의 관광 명소.",
    imageUrls: [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg",
      "https://example.com/image4.jpg",
    ],
    phoneNumber: "051-749-4062",
  },
];

const delay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

/**
 * 관광지 목록 조회
 * 응답 형태: AreaListResponse
 * { contents: [{ id, name, address, imageUrl, category, rank }], meta: {...} }
 */
export async function fetchAreaList(keyword = "", page = 1) {
  // TODO: 실제 연동 시 아래 fetch로 교체
  // const res = await fetch(`${BASE_URL}/areas?keyword=${keyword}&page=${page}`);
  // if (!res.ok) throw new Error("목록 조회 실패");
  // return res.json();

  await delay();

  const filtered = keyword
    ? mockAreaListData.filter(
        (a) => a.name.includes(keyword) || a.category.includes(keyword)
      )
    : mockAreaListData;

  const pageSize = 10;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  return {
    contents: pageItems, // 이미 목록 전용 필드만 존재 (id/name/address/imageUrl/category/rank)
    meta: {
      currentPage: page,
      pageSize,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / pageSize) || 1,
      hasNext: start + pageSize < filtered.length,
      nextPage: start + pageSize < filtered.length ? page + 1 : null,
    },
  };
}

/**
 * 관광지 상세 조회
 * 응답 형태: AreaDetailResponse
 * { id, address, content, imageUrls, phoneNumber }
 *
 * 화면에 이름/카테고리가 필요해서, 목록 데이터에서 id로 찾아 별도로 붙여줌
 * (실제 백엔드 응답에는 없는 필드이므로 `_display`로 분리 표시)
 */
export async function fetchAreaDetail(id) {
  // TODO: 실제 연동 시 아래 fetch로 교체
  // const res = await fetch(`${BASE_URL}/areas/${id}`);
  // if (!res.ok) throw new Error("상세 조회 실패");
  // return res.json();

  await delay();

  const detail = mockAreaDetailData.find((a) => a.id === Number(id));
  if (!detail) throw new Error("존재하지 않는 관광지입니다");

  // 명세서 그대로의 응답 (백엔드가 실제로 주는 형태)
  const response = {
    id: detail.id,
    address: detail.address,
    content: detail.content,
    imageUrls: detail.imageUrls,
    phoneNumber: detail.phoneNumber,
  };

  // 화면 표시용 부가 정보 (명세서에 없는 필드라 별도 키로 분리)
  const listMatch = mockAreaListData.find((a) => a.id === Number(id));
  response._display = {
    name: listMatch?.name ?? `장소 #${detail.id}`,
    category: listMatch?.category ?? "관광지",
  };

  return response;
}

// ============================================================
// 갤러리 (여행 그룹 / 셋로그) 임시 더미데이터
// 백엔드 명세가 아직 확정되지 않아 프론트 자체 구조로 작성.
// 필드: id, title, startDate, endDate, memberCount, thumbnailUrl, isOngoing
// 추후 명세 확정되면 필드명만 맞춰 교체하면 됨.
// ============================================================

const mockGroups = [
  {
    id: 101,
    title: "경주 당일치기",
    startDate: "2026-07-18",
    endDate: "2026-07-18",
    memberCount: 2,
    thumbnailUrl: "",
    isOngoing: false,
  },
  {
    id: 102,
    title: "부산 1박2일",
    startDate: "2026-07-10",
    endDate: "2026-07-11",
    memberCount: 3,
    thumbnailUrl: "",
    isOngoing: false,
  },
  {
    id: 103,
    title: "강릉 벚꽃여행",
    startDate: "2026-05-02",
    endDate: "2026-05-04",
    memberCount: 4,
    thumbnailUrl: "",
    isOngoing: false,
  },
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

// 그룹별 셋로그 클립 (그룹 상세 화면용)
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
  103: [
    { id: 9, capturedAt: "16:40", authorName: "신유진", caption: "경포호 벚꽃길", videoUrl: "" },
  ],
};

// 그룹별 편지 (그룹 상세 화면용)
const mockLettersByGroup = {
  100: [
    { id: 1, authorName: "김민지", message: "오늘 진짜 재밌었어 ㅎㅎ" },
    { id: 2, authorName: "이현우", message: "내일 일정도 기대된다" },
  ],
  101: [],
  102: [{ id: 3, authorName: "이현우", message: "다음에 또 같이 오자!" }],
  103: [],
};

/**
 * 갤러리 메인 조회 - 진행중인 여행 1개 + 지난 여행 목록
 * 실제로는 별도 API가 아니라, 그룹 목록 API에서 오늘 날짜 기준으로
 * 프론트가 진행중/지난 여행을 나눠 분류하는 방식으로 구현될 가능성이 높음.
 */
export async function fetchGallery() {
  // TODO: 실제 연동 시 그룹 목록 API 호출 후 프론트에서 날짜 기준 분류
  // const res = await fetch(`${BASE_URL}/groups`);
  // return res.json();

  await delay();

  return {
    ongoing: mockOngoingGroup, // 없으면 null
    past: mockGroups.sort(
      (a, b) => new Date(b.startDate) - new Date(a.startDate)
    ),
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
  const group =
    mockOngoingGroup.id === id
      ? mockOngoingGroup
      : mockGroups.find((g) => g.id === id);

  if (!group) throw new Error("존재하지 않는 여행 그룹입니다");

  return {
    group,
    clips: mockClipsByGroup[id] ?? [],
    letters: mockLettersByGroup[id] ?? [],
  };
}