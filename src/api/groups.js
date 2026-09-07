// ============================================================
// 여행 그룹 / 갤러리 / 셋로그 관련 API
//
// [진행 상황]
// - fetchGroupList / fetchGallery / fetchOngoingGroup
//     → GET /api/group 실제 연동 완료
// - createGroup
//     → POST /api/group 실제 연동 완료
// - joinGroupByInviteCode
//     → POST /api/group/invite/{inviteCode}/join 실제 연동 완료 (오늘 신규)
//     → 화면 연결은 아직 안 함 (참여 화면 위치 미정)
// - fetchGroupInfo
//     → GET /api/group/{groupId} 실제 연동 완료 (그룹정보+멤버)
// - withdrawFromGroup
//     → DELETE /api/group/{groupId}/withdraw 실제 연동 완료
// - fetchGroupClips / uploadClip
//     → GET,POST /api/log/{groupId} 실제 연동 완료 (오늘 신규, clip 태그)
// - writeLetter / fetchMyLetters / fetchLetter
//     → /api/log/{groupId}/letter 등 실제 연동 완료 (오늘 신규, letter 태그)
// - fetchGroupDetail(클립/편지 목데이터 버전 - 이제 위 실제 API로 대체됨,
//   호환을 위해 당분간 남겨둠) / fetchGroupSessions / uploadSetlog(셋로그 세션)
//     → 아직 명세 미확정, 목데이터 유지
//
// 실제 연동된 함수와 목데이터 함수가 한 파일에 같이 있으니,
// 나중에 헷갈리지 않도록 각 함수 위에 상태를 주석으로 남겨둠.
// ============================================================

import { BASE_URL, authFetch } from "./client";

const delay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

// --- 아직 목데이터인 부분 (그룹 상세 / 세션 / 업로드) ---

const mockGroups = [
  { id: 101, name: "경주 당일치기", startAt: "2026-07-18", endAt: "2026-07-18", memberCount: 2, imageUrl: "" },
  { id: 102, name: "부산 1박2일", startAt: "2026-07-10", endAt: "2026-07-11", memberCount: 3, imageUrl: "" },
  { id: 103, name: "강릉 벚꽃여행", startAt: "2026-05-02", endAt: "2026-05-04", memberCount: 4, imageUrl: "" },
];

const mockOngoingGroup = {
  id: 100,
  name: "제주도 여름 여행",
  startAt: "2026-08-01",
  endAt: "2026-08-04",
  memberCount: 3,
  imageUrl: "",
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

// ============================================================
// ✅ 실제 API 연동 완료
// ============================================================

/**
 * 그룹 목록 조회
 * GET /api/group — 내가 속한 그룹 목록 조회 (최근 참여순)
 * 인증 필요 → authFetch 사용
 *
 * Response 200: GroupResponse[]
 *   { id, name, startAt, endAt, inviteCode, leaderId, imageUrl, mergeStatus, mergedVideoUrl }
 *
 * 주의: memberCount는 이 응답에 없음 (화면에서 인원수 표시 필요하면
 * 그룹 상세 API 명세 확인 후 별도 처리 예정)
 */
export async function fetchGroupList() {
  const res = await authFetch(`${BASE_URL}/api/group`);

  if (!res.ok) {
    throw new Error("그룹 목록 조회에 실패했습니다");
  }

  return res.json(); // GroupResponse[]
}

/**
 * 갤러리 메인 조회 - 진행중인 여행 1개 + 지난 여행 목록
 *
 * 서버는 구분 없이 배열 하나만 주므로, 오늘 날짜 기준으로
 * 프론트에서 ongoing / past를 나눈다.
 * 진행중 판단 기준: startAt <= 오늘 <= endAt
 * (여러 개가 동시에 진행중이면 가장 최근에 시작한 것 1개만 ongoing으로,
 *  나머지는 past로 내려감 — 화면 구조상 ongoing은 1개만 표시되기 때문)
 */
export async function fetchGallery() {
  const groups = await fetchGroupList();

  const now = new Date();

  const ongoingCandidates = groups.filter((g) => {
    const start = new Date(g.startAt);
    const end = new Date(g.endAt);
    return start <= now && now <= end;
  });

  const ongoing =
    ongoingCandidates.length > 0
      ? ongoingCandidates.sort(
          (a, b) => new Date(b.startAt) - new Date(a.startAt)
        )[0]
      : null;

  const past = groups
    .filter((g) => !ongoing || g.id !== ongoing.id)
    .sort((a, b) => new Date(b.startAt) - new Date(a.startAt));

  return { ongoing, past };
}

/**
 * 진행중인 여행 그룹 조회 (하단 네비바 + 버튼 클릭 시 사용)
 */
export async function fetchOngoingGroup() {
  const { ongoing } = await fetchGallery();
  return ongoing;
}

/**
 * 날짜 input(YYYY-MM-DD)에서 받은 값을 서버가 요구하는 date-time 형식으로 변환.
 * 서버 스펙상 startAt/endAt이 date-time이라 날짜만 보내면 400이 날 수 있음.
 * 시작일은 그날 00:00:00, 종료일은 그날 23:59:59로 맞춰서
 * "여행 기간 전체"가 자연스럽게 포함되도록 함.
 */
function toDateTime(dateStr, endOfDay = false) {
  if (!dateStr) return dateStr;
  // 이미 시간까지 포함된 값이면 그대로 사용
  if (dateStr.includes("T")) return dateStr;
  return endOfDay ? `${dateStr}T23:59:59` : `${dateStr}T00:00:00`;
}

/**
 * 그룹 생성
 * POST /api/group — 새 여행 그룹을 생성하고 생성자를 리더 겸 멤버로 등록
 * 인증 필요 → authFetch 사용
 *
 * Request: multipart/form-data
 *   - request (필수, JSON 파트): CreateGroupRequest { name, startAt, endAt }
 *     (모두 필수, startAt/endAt은 date-time 형식)
 *   - image (선택, 파일 파트): 그룹 사진
 *
 * 주의:
 * - inviteCode는 서버가 자동 생성하므로 요청에 포함하지 않음 (응답에서 받음)
 * - 최대인원(maxMembers)은 서버 스펙에 없어서 요청에 포함하지 않음.
 *   화면에서는 입력을 받되 서버로는 보내지 않고, 추후 별도 처리 예정.
 *
 * Response 200: GroupResponse
 *   { id, name, startAt, endAt, inviteCode, leaderId, imageUrl, mergeStatus, mergedVideoUrl }
 */
export async function createGroup({ name, startAt, endAt, imageFile }) {
  const formData = new FormData();

  // request 파트: JSON 문자열을 Blob으로 감싸서 application/json 타입을 명시
  const requestBlob = new Blob(
    [
      JSON.stringify({
        name,
        startAt: toDateTime(startAt),
        endAt: toDateTime(endAt, true),
      }),
    ],
    { type: "application/json" }
  );
  formData.append("request", requestBlob);

  // image는 선택사항 -> 있을 때만 첨부
  if (imageFile) {
    formData.append("image", imageFile);
  }

  const res = await authFetch(`${BASE_URL}/api/group`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("그룹 생성에 실패했습니다");
  }

  return res.json(); // GroupResponse
}

/**
 * 초대코드로 그룹 참여
 * POST /api/group/invite/{inviteCode}/join — 초대코드에 해당하는 그룹에 멤버로 참여
 * 인증 필요 → authFetch 사용
 *
 * Path parameter: inviteCode
 * Request body: 없음
 * Response 200: OK (응답 바디 형태가 스웨거에 명시되어 있지 않음)
 *
 * 주의: 응답 바디가 없거나 JSON이 아닐 수 있어서, JSON 파싱이 실패해도
 * 에러를 던지지 않고 그냥 성공 여부만 반환하도록 방어적으로 작성함.
 * 나중에 실제 응답 형태가 확인되면 그에 맞게 정리 예정.
 */
export async function joinGroupByInviteCode(inviteCode) {
  const res = await authFetch(
    `${BASE_URL}/api/group/invite/${encodeURIComponent(inviteCode)}/join`,
    { method: "POST" }
  );

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("존재하지 않는 초대코드예요");
    }
    throw new Error("그룹 참여에 실패했어요");
  }

  // 응답 바디가 있을 수도, 없을 수도 있어서 안전하게 파싱 시도
  try {
    return await res.json();
  } catch {
    return { success: true };
  }
}

/**
 * 그룹 상세 조회 (그룹 정보 + 멤버 목록)
 * GET /api/group/{groupId} — 그룹 정보와 멤버 목록을 조회. 그룹 멤버만 조회 가능.
 * 인증 필요 → authFetch 사용
 *
 * Response 200: GroupDetailResponse
 *   {
 *     id, name, startAt, endAt, inviteCode, leaderId, imageUrl,
 *     mergeStatus, mergedVideoUrl,
 *     members: [{ userId, nickname, profileImageUrl }]
 *   }
 *
 * 참고:
 * - 여기서 memberCount는 members.length로 계산해서 쓰면 됨
 * - inviteCode가 여기 있으므로, 그룹장이 초대코드를 보여주는 화면은
 *   이 API 응답을 쓰면 됨
 * - 클립/편지 목록은 이 API에 없음 → 아래 fetchGroupDetail(목데이터)이
 *   그 역할을 대신하고 있으며, 나중에 명세 확정되면 별도로 실제 연동 예정.
 *   화면에서 클립/편지까지 같이 필요하면 이 함수와 fetchGroupDetail을
 *   Promise.all로 함께 호출해서 합치는 방식을 추천.
 */
export async function fetchGroupInfo(groupId) {
  const res = await authFetch(`${BASE_URL}/api/group/${groupId}`);

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("그룹 멤버만 조회할 수 있어요");
    }
    throw new Error("그룹 정보 조회에 실패했어요");
  }

  return res.json(); // GroupDetailResponse
}

/**
 * 그룹 탈퇴
 * DELETE /api/group/{groupId}/withdraw — 그룹에서 탈퇴
 * 인증 필요 → authFetch 사용
 *
 * 중요한 서버 규칙: 리더는 그룹에 혼자 남았을 때만 탈퇴 가능하며,
 * 이 경우 그룹 자체가 삭제됨. 다른 멤버가 남아있는데 리더가 탈퇴를
 * 시도하면 서버가 거부할 것으로 예상됨 (정확한 상태 코드는 명세에
 * 없어서, 400/409 등 실패 응답 전반에 안내 메시지로 대응).
 *
 * TODO: 회원정보조회 API 연동되면, 프론트에서도 미리
 * (내 userId === leaderId && members.length > 1)인 경우
 * 버튼을 누르기 전에 안내 문구를 다르게 보여주는 등 개선 가능.
 * 지금은 서버 응답 에러 메시지로만 안내함.
 *
 * Response 200: OK
 */
export async function withdrawFromGroup(groupId) {
  const res = await authFetch(`${BASE_URL}/api/group/${groupId}/withdraw`, {
    method: "DELETE",
  });

  if (!res.ok) {
    if (res.status === 400 || res.status === 409) {
      throw new Error("리더는 그룹에 혼자 남았을 때만 탈퇴할 수 있어요");
    }
    throw new Error("그룹 탈퇴에 실패했어요");
  }

  try {
    return await res.json();
  } catch {
    return { success: true };
  }
}

/**
 * 그룹 클립 피드 조회
 * GET /api/log/{groupId} — 그룹의 클립을 촬영 시각순으로 조회. 그룹 멤버만 조회 가능.
 * 인증 필요 → authFetch 사용
 *
 * Response 200: ClipResponse[]
 *   { id, groupId, userId, nickname, videoUrl, comment, slotIndex, capturedAt }
 */
export async function fetchGroupClips(groupId) {
  const res = await authFetch(`${BASE_URL}/api/log/${groupId}`);

  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    throw new Error("클립 목록 조회에 실패했어요");
  }

  return res.json(); // ClipResponse[]
}

/**
 * 클립 업로드
 * POST /api/log/{groupId} — 촬영한 영상을 업로드.
 * 촬영 시각 기준으로 시간대(slotIndex)가 자동 계산되며,
 * 같은 시간대에 중복 업로드할 수 없음.
 * 인증 필요 → authFetch 사용
 *
 * Request: multipart/form-data
 *   - request (필수, JSON 파트): UploadClipRequest { comment?, capturedAt }
 *   - file (필수, 파일 파트): 영상 파일
 *
 * 주의: capturedAt은 date-time 형식. Camera.jsx에서 촬영 완료 시점의
 * 시각을 new Date().toISOString()으로 넘겨주면 됨.
 *
 * Response 200: ClipResponse
 */
export async function uploadClip({ groupId, videoBlob, comment, capturedAt }) {
  const formData = new FormData();

  const requestBlob = new Blob(
    [JSON.stringify({ comment, capturedAt })],
    { type: "application/json" }
  );
  formData.append("request", requestBlob);
  formData.append("file", videoBlob, "clip.webm");

  const res = await authFetch(`${BASE_URL}/api/log/${groupId}`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    if (res.status === 409) {
      throw new Error("같은 시간대에 이미 업로드한 영상이 있어요");
    }
    throw new Error("클립 업로드에 실패했어요");
  }

  return res.json(); // ClipResponse
}

/**
 * 편지 남기기
 * POST /api/log/{groupId}/letter — 그룹 멤버에게 편지를 남김.
 * 자기 자신에게는 남길 수 없고, 같은 사람에게는 그룹당 한 번만 가능.
 * 인증 필요 → authFetch 사용
 *
 * Request body: WriteLetterRequest { receiverId, content }
 * Response 200: LetterResponse
 *   { letterId, writerId, writerNickname, createdAt, content }
 */
export async function writeLetter(groupId, { receiverId, content }) {
  const res = await authFetch(`${BASE_URL}/api/log/${groupId}/letter`, {
    method: "POST",
    body: JSON.stringify({ receiverId, content }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    if (res.status === 409) {
      throw new Error("이미 이 사람에게 편지를 남겼어요");
    }
    throw new Error("편지 전송에 실패했어요");
  }

  return res.json(); // LetterResponse
}

/**
 * 받은 편지 목록 조회
 * GET /api/log/{groupId}/letters — 이 그룹에서 내가 받은 편지 목록 (최근순)
 * 보낸 사람 닉네임과 작성 시각만 담김 (내용은 별도 조회 필요)
 * 인증 필요 → authFetch 사용
 *
 * Response 200: LetterListResponse[]
 *   { letterId, writerNickname, createdAt }
 */
export async function fetchMyLetters(groupId) {
  const res = await authFetch(`${BASE_URL}/api/log/${groupId}/letters`);

  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    throw new Error("편지 목록 조회에 실패했어요");
  }

  return res.json(); // LetterListResponse[]
}

/**
 * 편지 조회 (내용 포함)
 * GET /api/log/{groupId}/{letterId} — 받는 사람만 조회 가능
 * 인증 필요 → authFetch 사용
 *
 * Response 200: LetterResponse
 *   { letterId, writerId, writerNickname, createdAt, content }
 */
export async function fetchLetter(groupId, letterId) {
  const res = await authFetch(`${BASE_URL}/api/log/${groupId}/${letterId}`);

  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_EXPIRED");
    if (res.status === 403) throw new Error("받는 사람만 확인할 수 있어요");
    throw new Error("편지 조회에 실패했어요");
  }

  return res.json(); // LetterResponse
}

// ============================================================
// 🔲 아직 목데이터 (명세 미확정 — 셋로그 분할화면 세션)
// ============================================================

/**
 * 그룹 상세 조회 (클립 목록 + 편지 목록) — 아직 목데이터
 * 실제 API 명세 미확정. 그룹 자체 정보/멤버는 fetchGroupInfo()를 사용할 것.
 */
export async function fetchGroupDetail(groupId) {
  // TODO: 실제 연동 시 아래 fetch로 교체
  // const res = await authFetch(`${BASE_URL}/api/group/${groupId}`);
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
  // const res = await authFetch(`${BASE_URL}/api/group/${groupId}/sessions`);
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
  // TODO: 실제 연동 시 FormData로 영상 파일 업로드 + authFetch 사용
  // const formData = new FormData();
  // formData.append("video", videoBlob);
  // formData.append("caption", caption);
  // const res = await authFetch(`${BASE_URL}/api/group/${groupId}/setlogs`, {
  //   method: "POST",
  //   body: formData,
  // });
  // return res.json();

  await delay(600);
  console.log("셋로그 업로드 (mock):", { groupId, caption });
  return { success: true };
}