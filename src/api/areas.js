// ============================================================
// 관광지(Area) 관련 API
// 백엔드 완성 전까지 명세서(AreaListResponse / AreaDetailResponse)와
// 동일한 형태로 더미데이터를 반환합니다.
//
// 목록 조회와 상세 조회는 실제로는 서로 다른 응답 스펙을 가지므로,
// 소스 데이터도 아래처럼 완전히 분리해서 관리합니다.
// (id로만 서로 연결되며, 필드가 섞이지 않도록 함)
// ============================================================

import { BASE_URL } from "./client";

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
  // TODO: 실제 연동 시 아래 fetch로 교체 (authFetch로 바꿔야 할 수도 있음 - 인증 필요 여부 확인)
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
    contents: pageItems,
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

  const response = {
    id: detail.id,
    address: detail.address,
    content: detail.content,
    imageUrls: detail.imageUrls,
    phoneNumber: detail.phoneNumber,
  };

  const listMatch = mockAreaListData.find((a) => a.id === Number(id));
  response._display = {
    name: listMatch?.name ?? `장소 #${detail.id}`,
    category: listMatch?.category ?? "관광지",
  };

  return response;
}